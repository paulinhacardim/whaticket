const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('whaticket', 'root', 'strongpassword', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

async function checkUsersAndQueues() {
  try {
    console.log('🔍 Verificando usuários e filas existentes...');
    await sequelize.authenticate();
    
    // Ver quais usuários existem
    const [users] = await sequelize.query('SELECT id, name FROM Users ORDER BY id');
    console.log('\n👥 Usuários disponíveis:');
    users.forEach(user => {
      console.log(`  ID: ${user.id} - ${user.name}`);
    });
    
    // Ver quais filas existem
    const [queues] = await sequelize.query('SELECT id, name FROM Queues ORDER BY id');
    console.log('\n🎯 Filas disponíveis:');
    queues.forEach(queue => {
      console.log(`  ID: ${queue.id} - ${queue.name}`);
    });
    
    // Ver relação UserQueues (usuários associados às filas)
    const [userQueues] = await sequelize.query(`
      SELECT uq.userId, uq.queueId, u.name as userName, q.name as queueName
      FROM UserQueues uq
      JOIN Users u ON u.id = uq.userId
      JOIN Queues q ON q.id = uq.queueId
      ORDER BY uq.queueId, uq.userId
    `);
    
    console.log('\n🔗 Usuários associados às filas:');
    const queueUsers = {};
    userQueues.forEach(rel => {
      if (!queueUsers[rel.queueId]) queueUsers[rel.queueId] = [];
      queueUsers[rel.queueId].push({
        userId: rel.userId,
        userName: rel.userName
      });
    });
    
    for (const [queueId, users] of Object.entries(queueUsers)) {
      const queue = queues.find(q => q.id == queueId);
      console.log(`\n  Fila ${queueId} (${queue?.name}):`);
      users.forEach(user => {
        console.log(`    - User ${user.userId}: ${user.userName}`);
      });
    }
    
    // Ver distribuições atuais
    const [distributions] = await sequelize.query(`
      SELECT d.*, u.name as userName, q.name as queueName
      FROM Distributions d
      JOIN Users u ON u.id = d.userId
      JOIN Queues q ON q.id = d.queueId
      ORDER BY d.queueId, d.position
    `);
    
    console.log('\n📊 Distribuições atuais:');
    const currentDistributions = {};
    distributions.forEach(dist => {
      if (!currentDistributions[dist.queueId]) currentDistributions[dist.queueId] = [];
      currentDistributions[dist.queueId].push(dist);
    });
    
    for (const [queueId, dists] of Object.entries(currentDistributions)) {
      const queue = queues.find(q => q.id == queueId);
      console.log(`\n  Fila ${queueId} (${queue?.name}):`);
      dists.forEach(dist => {
        console.log(`    - ${dist.userName} (ID:${dist.userId}) Pos:${dist.position} ${dist.isCurrentUser ? '← ATUAL' : ''}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await sequelize.close();
  }
}

checkUsersAndQueues();