const { QueryTypes } = require('sequelize');

const sequelize = require('./dist/database/index.js').default;

async function autoAssignUsers() {
  try {
    console.log('🔧 Associando usuários automaticamente às filas...');
    await sequelize.authenticate();
    
    // Buscar filas sem usuários
    const [queuesWithoutUsers] = await sequelize.query(`
      SELECT q.id as queueId, q.name as queueName
      FROM Queues q
      LEFT JOIN UserQueues uq ON q.id = uq.queueId
      WHERE uq.userId IS NULL
      ORDER BY q.id
    `);
    
    if (queuesWithoutUsers.length === 0) {
      console.log('✅ Todas as filas já têm usuários associados!');
      return;
    }
    
    // Buscar usuários disponíveis (não admin)
    const [availableUsers] = await sequelize.query(`
      SELECT id, name FROM Users 
      WHERE profile != 'admin' 
      ORDER BY id 
      LIMIT 5
    `);
    
    if (availableUsers.length === 0) {
      console.log('❌ Nenhum usuário disponível para associar às filas!');
      console.log('Crie pelo menos um usuário não-admin primeiro.');
      return;
    }
    
    console.log(`\n📋 Filas sem usuários: ${queuesWithoutUsers.length}`);
    console.log(`👥 Usuários disponíveis: ${availableUsers.length}`);
    
    // Para cada fila sem usuários, associar o primeiro usuário disponível
    for (const queue of queuesWithoutUsers) {
      const userToAssign = availableUsers[0]; // Usar sempre o primeiro usuário
      
      try {
        // Verificar se a associação já existe (dupla verificação)
        const [existing] = await sequelize.query(`
          SELECT id FROM UserQueues 
          WHERE userId = ${userToAssign.id} AND queueId = ${queue.queueId}
        `);
        
        if (existing.length === 0) {
          // Criar a associação
          await sequelize.query(`
            INSERT INTO UserQueues (userId, queueId, createdAt, updatedAt)
            VALUES (${userToAssign.id}, ${queue.queueId}, NOW(), NOW())
          `);
          
          console.log(`✅ Fila ${queue.queueId} (${queue.queueName}) ← Usuário ${userToAssign.name}`);
        } else {
          console.log(`ℹ️ Fila ${queue.queueId} (${queue.queueName}) já tem o usuário ${userToAssign.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao associar usuário à fila ${queue.queueId}:`, error.message);
      }
    }
    
    console.log('\n🎉 Associações concluídas!');
    console.log('\n🔄 Agora você pode:');
    console.log('1. Testar novamente o endpoint /distribution');
    console.log('2. Ou executar: node fix-queue-users.js para verificar');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    process.exit(0);
  }
}

autoAssignUsers();