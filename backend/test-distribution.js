const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('whaticket', 'root', 'strongpassword', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

async function testDistribution() {
  try {
    console.log('🧪 Testando distribuição sequencial...');
    await sequelize.authenticate();
    
    const queueId = 12; // Vamos testar na fila 12
    
    // Primeiro, vamos adicionar mais usuários para testar
    console.log(`\n📝 Preparando fila ${queueId} para teste...`);
    
    // Simular que temos 3 usuários na fila 12
    const testUsers = [1, 2, 3]; // IDs dos usuários
    
    // Limpar distribuições da fila
    await sequelize.query(`DELETE FROM Distributions WHERE queueId = ${queueId}`);
    
    // Criar distribuições para teste
    for (let i = 0; i < testUsers.length; i++) {
      await sequelize.query(`
        INSERT INTO Distributions (queueId, userId, position, isCurrentUser, isActive, createdAt, updatedAt)
        VALUES (${queueId}, ${testUsers[i]}, ${i}, ${i === 0 ? 'true' : 'false'}, true, NOW(), NOW())
      `);
    }
    
    console.log('✅ Distribuições criadas para teste');
    
    // Função para obter próximo usuário
    async function getNextUser() {
      // Busca o usuário atual
      const [currentResults] = await sequelize.query(`
        SELECT * FROM Distributions 
        WHERE queueId = ${queueId} AND isCurrentUser = true AND isActive = true
        ORDER BY position ASC
        LIMIT 1
      `);
      
      if (currentResults.length === 0) {
        console.log('❌ Nenhum usuário atual encontrado');
        return null;
      }
      
      const currentUser = currentResults[0];
      console.log(`👤 Usuário atual: ID=${currentUser.userId}, Position=${currentUser.position}`);
      
      // Buscar todas as distribuições da fila
      const [allDistributions] = await sequelize.query(`
        SELECT * FROM Distributions 
        WHERE queueId = ${queueId} AND isActive = true 
        ORDER BY position ASC
      `);
      
      // Encontrar posição do usuário atual
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
      
      console.log(`🔄 Próximo usuário: ID=${allDistributions[nextIndex].userId}, Position=${allDistributions[nextIndex].position}`);
      
      return currentUser;
    }
    
    // Testar distribuição sequencial
    console.log('\n🎯 Testando sequência de distribuição:');
    
    for (let ticket = 1; ticket <= 7; ticket++) {
      console.log(`\n📞 Ticket ${ticket}:`);
      const assignedUser = await getNextUser();
      if (assignedUser) {
        console.log(`   ➡️  Atribuído para usuário ${assignedUser.userId}`);
      }
      
      // Mostrar estado atual
      const [currentState] = await sequelize.query(`
        SELECT userId, position, isCurrentUser 
        FROM Distributions 
        WHERE queueId = ${queueId} 
        ORDER BY position ASC
      `);
      
      console.log('   Estado atual:', 
        currentState.map(d => `User${d.userId}(pos:${d.position}${d.isCurrentUser ? ' *ATUAL*' : ''})`).join(' | ')
      );
    }
    
    console.log('\n✅ Teste de distribuição concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await sequelize.close();
  }
}

testDistribution();