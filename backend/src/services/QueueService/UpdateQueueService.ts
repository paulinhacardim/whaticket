import { Op } from "sequelize";
import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import ShowQueueService from "./ShowQueueService";
import DistributionService from "../DistributionService/DistributionService";

interface QueueData {
  name?: string;
  color?: string;
  greetingMessage?: string;
  autoDistribution?: boolean;
}

const UpdateQueueService = async (
  queueId: number | string,
  queueData: QueueData
): Promise<Queue> => {
  const { color, name } = queueData;

  const queueSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_QUEUE_INVALID_NAME")
      .test(
        "Check-unique-name",
        "ERR_QUEUE_NAME_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameName = await Queue.findOne({
              where: { name: value, id: { [Op.not]: queueId } }
            });

            return !queueWithSameName;
          }
          return true;
        }
      ),
    color: Yup.string()
      .required("ERR_QUEUE_INVALID_COLOR")
      .test("Check-color", "ERR_QUEUE_INVALID_COLOR", async value => {
        if (value) {
          const colorTestRegex = /^#[0-9a-f]{3,6}$/i;
          return colorTestRegex.test(value);
        }
        return true;
      })
      .test(
        "Check-color-exists",
        "ERR_QUEUE_COLOR_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameColor = await Queue.findOne({
              where: { color: value, id: { [Op.not]: queueId } }
            });
            return !queueWithSameColor;
          }
          return true;
        }
      )
  });

  try {
    await queueSchema.validate({ color, name });
  } catch (err) {
    throw new AppError(err.message);
  }

  const queue = await ShowQueueService(queueId);
  const wasAutoDistributionEnabled = queue.autoDistribution;

  await queue.update(queueData);

  // Se a distribuição automática foi habilitada e não estava antes
  if (queueData.autoDistribution && !wasAutoDistributionEnabled) {
    console.log(`Inicializando distribuição automática para fila ${queue.id} (${queue.name})`);
    await DistributionService.initializeDistribution({ queueId: queue.id });
  }
  // Se foi desabilitada, limpar distribuições
  else if (queueData.autoDistribution === false && wasAutoDistributionEnabled) {
    console.log(`Removendo distribuição automática para fila ${queue.id} (${queue.name})`);
    await DistributionService.clearDistribution({ queueId: queue.id });
  }

  return queue;
};

export default UpdateQueueService;
