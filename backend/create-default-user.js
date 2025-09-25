const sequelize = require('./dist/database').default;
const bcrypt = require('bcryptjs');

async function createDefaultUser() {
  try {
    console.log('🔧 Criando usuário padrão para distribuição...');
    await sequelize.authenticate();
    
    // Verificar se já existe um usuário não-admin
    const [existingUsers] = await sequelize.query(`
      SELECT id, name FROM Users WHERE profile != 'admin' LIMIT 1
    `);
    
    if (existingUsers.length > 0) {
      console.log(`✅ Usuário padrão já existe: ${existingUsers[0].name} (ID: ${existingUsers[0].id})`);
      return existingUsers[0].id;
    }
    
    // Criar usuário padrão
    const defaultPassword = await bcrypt.hash('123456', 8);
    
    const [result] = await sequelize.query(`
      INSERT INTO Users (name, email, profile, passwordHash, createdAt, updatedAt)
      VALUES ('Sistema Distribuição', 'sistema@distribui.cao', 'user', '${defaultPassword}', NOW(), NOW())
    `);
    
    const userId = result.insertId || result[0]?.id;
    
    if (userId) {
      console.log(`✅ Usuário padrão criado: Sistema Distribuição (ID: ${userId})`);
      
      // Associar este usuário a todas as filas sem usuários
      const [queuesWithoutUsers] = await sequelize.query(`
        SELECT q.id as queueId, q.name as queueName
        FROM Queues q
        LEFT JOIN UserQueues uq ON q.id = uq.queueId
        WHERE uq.userId IS NULL
        GROUP BY q.id, q.name
      `);
      
      console.log(`\n🔗 Associando usuário padrão a ${queuesWithoutUsers.length} filas...`);
      
      for (const queue of queuesWithoutUsers) {
        try {
          await sequelize.query(`
            INSERT INTO UserQueues (userId, queueId, createdAt, updatedAt)
            VALUES (${userId}, ${queue.queueId}, NOW(), NOW())
          `);
          console.log(`✅ Fila ${queue.queueId} (${queue.queueName}) associada`);
        } catch (error) {
          console.log(`⚠️ Erro ao associar fila ${queue.queueId}:`, error.message);
        }
      }
      
      return userId;
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário padrão:', error);
  } finally {
    process.exit(0);
  }
}

createDefaultUser();