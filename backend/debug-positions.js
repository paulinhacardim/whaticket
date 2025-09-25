require('ts-node/register');
const Distribution = require('./src/models/Distribution').default;
const sequelize = require('./src/database').default;

async function debugPositions() {
  try {
    console.log('🔍 Iniciando diagnóstico de posições...');
    
    // Conectar ao banco
    await sequelize.authenticate();
    console.log('✅ Conexão com banco estabelecida');
    
    // Ver todas as distribuições
    const allDistributions = await Distribution.findAll({
      order: [['queueId', 'ASC'], ['id', 'ASC']]
    });
    
    console.log(`📊 Total de distribuições: ${allDistributions.length}`);
    
    // Agrupar por fila
    const queues = {};
    allDistributions.forEach(dist => {
      if (!queues[dist.queueId]) {
        queues[dist.queueId] = [];
      }
      queues[dist.queueId].push({
        id: dist.id,
        userId: dist.userId,
        position: dist.position,
        isCurrentUser: dist.isCurrentUser
      });
    });
    
    // Mostrar situação atual
    console.log('\n📋 Situação atual por fila:');
    for (const [queueId, distributions] of Object.entries(queues)) {
      console.log(`\n🎯 Fila ${queueId}:`);
      distributions.forEach(dist => {
        console.log(`  - ID:${dist.id} User:${dist.userId} Position:${dist.position} Current:${dist.isCurrentUser}`);
      });
    }
    
    // Tentar corrigir uma fila específica (12)
    console.log('\n🔧 Corrigindo fila 12...');
    const queueId = 12;
    
    const distributions = await Distribution.findAll({
      where: { queueId },
      order: [["id", "ASC"]]
    });
    
    console.log(`📌 Encontradas ${distributions.length} distribuições para fila ${queueId}`);
    
    for (let i = 0; i < distributions.length; i++) {
      console.log(`🔄 Atualizando ID ${distributions[i].id} para position ${i}`);
      const result = await distributions[i].update({ position: i });
      console.log(`   Result: position = ${result.position}`);
    }
    
    // Verificar se funcionou
    const updatedDistributions = await Distribution.findAll({
      where: { queueId },
      order: [["position", "ASC"]]
    });
    
    console.log('\n✅ Resultado após correção:');
    updatedDistributions.forEach(dist => {
      console.log(`  - ID:${dist.id} User:${dist.userId} Position:${dist.position}`);
    });
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  } finally {
    await sequelize.close();
  }
}

debugPositions();