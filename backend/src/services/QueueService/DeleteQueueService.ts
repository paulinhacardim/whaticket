import ShowQueueService from "./ShowQueueService";
import Distributions from "../../models/Distribution";

const DeleteQueueService = async (queueId: number | string): Promise<void> => {
  const queue = await ShowQueueService(queueId);

  //  limpar as dependências antes de deletar um registro pai
  await Distributions.destroy({
    where: { queueId: queue.id }
  });

  await queue.destroy();
};

export default DeleteQueueService;
