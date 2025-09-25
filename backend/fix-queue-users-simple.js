const mysql = require('mysql2/promise');

async function fixQueueUsers() {
  let connection;
  
  try {
    // Conectar ao banco (ajuste as credenciais conforme necessário)
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',  // ajuste conforme suas configurações
      password: '', // ajuste conforme suas configurações  
      database: 'whaticket'  // ajuste conforme suas configurações
    });

    console.log('🔍 Conectado ao banco de dados...');

    // 1. Verificar filas sem usuários
    const [queuesWithoutUsers] = await connection.execute(`
      SELECT q.id, q.name, q.autoDistribution
      FROM Queues q
      LEFT JOIN UserQueues uq ON q.id = uq.queueId
      WHERE uq.userId IS NULL
      ORDER BY q.id
    `);

    if (queuesWithoutUsers.length === 0) {
      console.log('✅ Todas as filas já têm usuários!');
      return;
    }

    console.log(`\n⚠️ Encontradas ${queuesWithoutUsers.length} filas sem usuários:`);
    queuesWithoutUsers.forEach(queue => {
      console.log(`- Fila ${queue.id}: ${queue.name} (AutoDist: ${queue.autoDistribution})`);
    });

    // 2. Buscar o primeiro usuário disponível (não admin)
    const [users] = await connection.execute(`
      SELECT id, name FROM Users 
      WHERE profile != 'admin' 
      ORDER BY id 
      LIMIT 1
    `);

    if (users.length === 0) {
      console.log('❌ Nenhum usuário não-admin encontrado!');
      console.log('Crie um usuário primeiro no sistema.');
      return;
    }

    const userToAssign = users[0];
    console.log(`\n👤 Usuário que será associado: ${userToAssign.name} (ID: ${userToAssign.id})`);

    // 3. Associar o usuário a todas as filas sem usuários
    for (const queue of queuesWithoutUsers) {
      try {
        await connection.execute(`
          INSERT INTO UserQueues (userId, queueId, createdAt, updatedAt)
          VALUES (?, ?, NOW(), NOW())
        `, [userToAssign.id, queue.id]);

        console.log(`✅ Fila ${queue.id} (${queue.name}) ← Usuário ${userToAssign.name}`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`ℹ️ Fila ${queue.id} já tem o usuário associado`);
        } else {
          console.error(`❌ Erro na fila ${queue.id}: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 Correção concluída!');
    console.log('\n🔄 Agora teste novamente o endpoint: GET http://localhost:8080/distribution');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
}

fixQueueUsers();