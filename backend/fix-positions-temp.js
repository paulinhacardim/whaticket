const sequelize = require('./dist/database/index.js').default;

async function fixAllPositions() {
  try {
    console.log('🔧 Corrigindo posições das distribuições...');
    await sequelize.authenticate();
    
    // Buscar todas as filas que têm distribuições
    const [queues] = await sequelize.query(`
      SELECT DISTINCT queueId 
      FROM Distributions 
      ORDER BY queueId
    `);
    
    console.log(`Encontradas ${queues.length} filas com distribuições`);
    
    for (const queue of queues) {
      console.log(`\nCorrigindo fila ${queue.queueId}...`);
      
      // Buscar distribuições da fila ordenadas por ID
      const [distributions] = await sequelize.query(`
        SELECT id, userId, position 
        FROM Distributions 
        WHERE queueId = ${queue.queueId} 
        ORDER BY id ASC
      `);
      
      console.log(`  Distribuições encontradas: ${distributions.length}`);
      
      // Atualizar posições sequenciais
      for (let i = 0; i < distributions.length; i++) {
        await sequelize.query(`
          UPDATE Distributions 
          SET position = ${i} 
          WHERE id = ${distributions[i].id}
        `);
        console.log(`    Usuário ${distributions[i].userId}: posição ${distributions[i].position} → ${i}`);
      }
      
      console.log(`✅ Fila ${queue.queueId}: ${distributions.length} posições corrigidas (0 a ${distributions.length-1})`);
    }
    
    console.log('\n🎉 Todas as posições foram corrigidas!');
    console.log('\n📊 Verificando resultado...');
    
    const [result] = await sequelize.query(`
      SELECT queueId, userId, position, isCurrentUser 
      FROM Distributions 
      ORDER BY queueId, position
    `);
    
    console.log('\n📋 Situação após correção:');
    let currentQueueId = null;
    result.forEach(row => {
      if (row.queueId !== currentQueueId) {
        currentQueueId = row.queueId;
        console.log(`\nFila ${row.queueId}:`);
      }
      console.log(`  Usuário ${row.userId} - Posição ${row.position} ${row.isCurrentUser ? '← ATUAL' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

fixAllPositions();