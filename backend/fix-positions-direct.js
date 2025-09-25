const { Sequelize, DataTypes } = require('sequelize');

// Configuração do banco - ajuste conforme seu ambiente
const sequelize = new Sequelize('whaticket', 'root', 'strongpassword', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

async function fixPositionsDirectly() {
  try {
    console.log('🔍 Conectando ao banco...');
    await sequelize.authenticate();
    console.log('✅ Conexão estabelecida');
    
    // Verificar distribuições atuais
    console.log('\n📊 Verificando distribuições atuais...');
    const [results] = await sequelize.query(`
      SELECT id, queueId, userId, position, isCurrentUser 
      FROM Distributions 
      ORDER BY queueId, id
    `);
    
    console.log(`Total de distribuições: ${results.length}`);
    
    // Mostrar situação atual
    const queues = {};
    results.forEach(row => {
      if (!queues[row.queueId]) queues[row.queueId] = [];
      queues[row.queueId].push(row);
    });
    
    console.log('\n📋 Situação atual:');
    for (const [queueId, distributions] of Object.entries(queues)) {
      console.log(`\nFila ${queueId}:`);
      distributions.forEach(dist => {
        console.log(`  ID:${dist.id} User:${dist.userId} Position:${dist.position} Current:${dist.isCurrentUser}`);
      });
    }
    
    // Corrigir posições para cada fila
    console.log('\n🔧 Corrigindo posições...');
    
    for (const [queueId, distributions] of Object.entries(queues)) {
      console.log(`\nCorrigindo fila ${queueId}...`);
      
      // Ordenar por ID para manter ordem de criação
      distributions.sort((a, b) => a.id - b.id);
      
      for (let i = 0; i < distributions.length; i++) {
        console.log(`  Atualizando ID ${distributions[i].id} para position ${i}`);
        
        await sequelize.query(`
          UPDATE Distributions 
          SET position = :position 
          WHERE id = :id
        `, {
          replacements: { 
            position: i, 
            id: distributions[i].id 
          }
        });
      }
      
      // Garantir que há um usuário atual
      const hasCurrentUser = distributions.some(d => d.isCurrentUser);
      if (!hasCurrentUser && distributions.length > 0) {
        console.log(`  Definindo primeiro usuário como atual...`);
        await sequelize.query(`
          UPDATE Distributions 
          SET isCurrentUser = true 
          WHERE id = :id
        `, {
          replacements: { id: distributions[0].id }
        });
      }
    }
    
    // Verificar resultado
    console.log('\n✅ Verificando resultado...');
    const [newResults] = await sequelize.query(`
      SELECT id, queueId, userId, position, isCurrentUser 
      FROM Distributions 
      ORDER BY queueId, position
    `);
    
    const newQueues = {};
    newResults.forEach(row => {
      if (!newQueues[row.queueId]) newQueues[row.queueId] = [];
      newQueues[row.queueId].push(row);
    });
    
    console.log('\n🎯 Resultado final:');
    for (const [queueId, distributions] of Object.entries(newQueues)) {
      console.log(`\nFila ${queueId}:`);
      distributions.forEach(dist => {
        console.log(`  ID:${dist.id} User:${dist.userId} Position:${dist.position} Current:${dist.isCurrentUser}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await sequelize.close();
  }
}

fixPositionsDirectly();