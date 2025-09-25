const { QueryTypes } = require('sequelize');
// Importação correta para o projeto TypeScript
const sequelize = require('./dist/database/index.js').default;

async function fixQueueUsers() {
  try {
    console.log('🔍 Verificando situação das filas...');
    await sequelize.authenticate();
    
    // Verificar todas as filas e seus usuários
    const [queuesData] = await sequelize.query(`
      SELECT 
        q.id as queueId,
        q.name as queueName,
        q.autoDistribution,
        COUNT(uq.userId) as userCount,
        GROUP_CONCAT(u.name) as userNames
      FROM Queues q
      LEFT JOIN UserQueues uq ON q.id = uq.queueId
      LEFT JOIN Users u ON uq.userId = u.id
      GROUP BY q.id, q.name, q.autoDistribution
      ORDER BY q.id
    `);
    
    console.log('\n📊 Situação atual das filas:');
    console.log('ID | Nome | AutoDist | Usuários | Nomes');
    console.log('---|------|----------|----------|-------');
    
    const queuesWithoutUsers = [];
    
    queuesData.forEach(queue => {
      console.log(`${queue.queueId} | ${queue.queueName} | ${queue.autoDistribution ? 'SIM' : 'NÃO'} | ${queue.userCount} | ${queue.userNames || 'NENHUM'}`);
      
      if (queue.userCount === 0) {
        queuesWithoutUsers.push(queue);
      }
    });
    
    if (queuesWithoutUsers.length > 0) {
      console.log('\n⚠️ Filas sem usuários encontradas:');
      queuesWithoutUsers.forEach(queue => {
        console.log(`- Fila ${queue.queueId} (${queue.queueName})`);
      });
      
      console.log('\n🔧 SOLUÇÃO:');
      console.log('1. Vá para o painel admin do sistema');
      console.log('2. Acesse Configurações > Filas');
      console.log('3. Para cada fila com erro, clique em "Editar"');
      console.log('4. Na seção "Usuários", adicione pelo menos um usuário');
      console.log('5. Salve as alterações');
      console.log('6. Depois execute novamente o endpoint /distribution');
    }
    
    // Verificar usuários disponíveis
    const [users] = await sequelize.query('SELECT id, name FROM Users WHERE profile != "admin" LIMIT 10');
    
    if (users.length > 0) {
      console.log('\n👥 Usuários disponíveis para adicionar nas filas:');
      users.forEach(user => {
        console.log(`- ${user.name} (ID: ${user.id})`);
      });
      
      console.log('\n💡 ALTERNATIVA - Associar automaticamente:');
      console.log('Se quiser que eu associe automaticamente o primeiro usuário disponível');
      console.log('às filas sem usuários, execute: node auto-assign-users.js');
    }
    
    // Verificar distribuições existentes
    const [distributions] = await sequelize.query(`
      SELECT 
        d.queueId,
        q.name as queueName,
        COUNT(d.id) as distributionCount
      FROM Distributions d
      JOIN Queues q ON d.queueId = q.id
      GROUP BY d.queueId, q.name
      ORDER BY d.queueId
    `);
    
    if (distributions.length > 0) {
      console.log('\n📋 Distribuições existentes:');
      distributions.forEach(dist => {
        console.log(`- Fila ${dist.queueId} (${dist.queueName}): ${dist.distributionCount} distribuições`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

fixQueueUsers();