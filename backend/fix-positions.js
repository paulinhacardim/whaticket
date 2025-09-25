

const DistributionService = require('./src/services/DistributionService/DistributionService').default;

async function fixAllPositions() {
  try {
    console.log('🔧 Iniciando correção de posições...');
    
    // Corrige a fila 2 (que você mostrou na imagem)
    await DistributionService.fixPositions({ queueId: 2 });
    
  
    const Distribution = require('./src/models/Distribution').default;
    const distinctQueues = await Distribution.findAll({
      attributes: ['queueId'],
      group: ['queueId']
    });
    
    for (const queue of distinctQueues) {
      await DistributionService.fixPositions({ queueId: queue.queueId });
    }

    
    console.log('✅ Correção de posições concluída!');
    console.log('🔍 Verifique no banco se as posições agora estão: 0, 1, 2, 3...');
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
  }
}

// Executa a correção
fixAllPositions();