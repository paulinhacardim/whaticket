import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import DistributionService from "../DistributionService/DistributionService";

interface AutoDistributeRequest {
  queueId: number;
  ticketId: number;
}

const AutoDistributeTicketService = async ({
  queueId,
  ticketId
}: AutoDistributeRequest): Promise<void> => {
  // Verifica se a fila existe e se tem distribuição automática habilitada
  const queue = await Queue.findByPk(queueId);
  
  if (!queue) {
    console.log(`Fila ${queueId} não encontrada`);
    return;
  }

  if (!queue.autoDistribution) {
    console.log(`Fila ${queueId} não tem distribuição automática habilitada`);
    return;
  }

  console.log(`Processando distribuição automática para fila ${queueId}`);

  try {
    // Sincroniza a distribuição (garante que está atualizada)
    await DistributionService.syncDistribution({ queueId });

    // Obtém o próximo usuário na distribuição
    const nextUser = await DistributionService.getNextUser({ queueId });

    if (!nextUser) {
      console.log(`Nenhum usuário disponível para distribuição na fila ${queueId}`);
      return;
    }

    // Atribui o ticket ao usuário selecionado
    await Ticket.update(
      {
        userId: nextUser.id,
        status: "open"
      },
      {
        where: { id: ticketId }
      }
    );

    console.log(`Ticket ${ticketId} distribuído automaticamente para usuário ${nextUser.name} (ID: ${nextUser.id})`);
    
  } catch (error) {
    console.error(`Erro na distribuição automática para fila ${queueId}:`, error);
    throw error;
  }
};

export default AutoDistributeTicketService;