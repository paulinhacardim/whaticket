const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('whaticket', 'root', 'strongpassword', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

async function testRealDistribution() {
  try {
    console.log('🧪 Testando distribuição REAL na fila 12...');
    await sequelize.authenticate();
    
    const queueId = 12;
    
    // Verificar situação atual da fila 12
    const [currentDist] = await sequelize.query(`
      SELECT d.*, u.name 
      FROM Distributions d 
      JOIN Users u ON u.id = d.userId 
      WHERE d.queueId = ${queueId} 
      ORDER BY d.position
    `);
    
    console.log('\n Situação atual da fila 12:');
    currentDist.forEach(d => {
      console.log(`  ${d.name} (ID:${d.userId}) - Posição:${d.position} ${d.isCurrentUser ? '← ATUAL' : ''}`);
    });
    
    // Função para obter próximo usuário (baseada no DistributionService)
    async function getNextUser() {
      // Busca o usuário atual
      const [currentResults] = await sequelize.query(`
        SELECT d.*, u.name 
        FROM Distributions d 
        JOIN Users u ON u.id = d.userId
        WHERE d.queueId = ${queueId} AND d.isCurrentUser = true AND d.isActive = true
        LIMIT 1
      `);
      
      if (currentResults.length === 0) {
        console.log('Nenhum usuário atual encontrado');
        return null;
      }
      
      const currentUser = currentResults[0];
      
      // Buscar todas as distribuições da fila ordenadas por posição
      const [allDistributions] = await sequelize.query(`
        SELECT * FROM Distributions 
        WHERE queueId = ${queueId} AND isActive = true 
        ORDER BY position ASC
      `);
      
      // Encontrar índice do usuário atual
      const currentIndex = allDistributions.findIndex(d => d.isCurrentUser);
      const nextIndex = (currentIndex + 1) % allDistributions.length;
      
      // Remove flag do usuário atual
      await sequelize.query(`
        UPDATE Distributions 
        SET isCurrentUser = false 
        WHERE queueId = ${queueId} AND isCurrentUser = true
      `);
      
      // Define próximo usuário
      await sequelize.query(`
        UPDATE Distributions 
        SET isCurrentUser = true 
        WHERE id = ${allDistributions[nextIndex].id}
      `);
      
      return currentUser;
    }
    
    // Simular chegada de tickets e distribuição
    console.log('\n Simulando chegada de 8 tickets:');
    
    for (let ticket = 1; ticket <= 8; ticket++) {
      console.log(`\n Ticket ${ticket}:`);
      
      const assignedUser = await getNextUser();
      if (assignedUser) {
        console.log(`    Atribuído para: ${assignedUser.name} (ID: ${assignedUser.userId})`);
      }
      
      // Mostrar próximo usuário da vez
      const [nextUser] = await sequelize.query(`
        SELECT d.*, u.name 
        FROM Distributions d 
        JOIN Users u ON u.id = d.userId
        WHERE d.queueId = ${queueId} AND d.isCurrentUser = true
      `);
      
      if (nextUser.length > 0) {
        console.log(`    Próximo da vez: ${nextUser[0].name}`);
      }
    }
    
    console.log('\n Teste concluído!');
    console.log('\n Resumo esperado da distribuição:');
    console.log('   Deveria alternar entre Administrador e Ana Paula Oliveira');
    console.log('   Padrão: Admin → Ana Paula → Admin → Ana Paula → ...');
    
  } catch (error) {
    console.error(' Erro no teste:', error);
  } finally {
    await sequelize.close();
  }
}

testRealDistribution();