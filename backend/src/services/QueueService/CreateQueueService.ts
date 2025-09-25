import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import User from "../../models/User";
import UserQueue from "../../models/UserQueue";
import DistributionService from "../DistributionService/DistributionService";

interface QueueData {
  name: string;
  color: string;
  greetingMessage?: string;
  autoDistribution?: boolean;
}

const CreateQueueService = async (queueData: QueueData): Promise<Queue> => {
  try {
    console.log("=== CreateQueueService ===");
    console.log("1. Dados recebidos:", queueData);
    
    const { color, name, greetingMessage, autoDistribution } = queueData;
    
    // Dados limpos só com campos que existem na tabela
    const cleanQueueData = { name, color, greetingMessage, autoDistribution };
    console.log("2. Dados limpos:", cleanQueueData);

  const queueSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_QUEUE_INVALID_NAME")
      .required("ERR_QUEUE_INVALID_NAME")
      .test(
        "Check-unique-name",
        "ERR_QUEUE_NAME_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameName = await Queue.findOne({
              where: { name: value }
            });

            return !queueWithSameName;
          }
          return false;
        }
      ),
    color: Yup.string()
      .required("ERR_QUEUE_INVALID_COLOR")
      .test("Check-color", "ERR_QUEUE_INVALID_COLOR", async value => {
        if (value) {
          const colorTestRegex = /^#[0-9a-f]{3,6}$/i;
          return colorTestRegex.test(value);
        }
        return false;
      })
      .test(
        "Check-color-exists",
        "ERR_QUEUE_COLOR_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameColor = await Queue.findOne({
              where: { color: value }
            });
            return !queueWithSameColor;
          }
          return false;
        }
      )
  });

    console.log("3. Iniciando validação Yup...");
    await queueSchema.validate({ color, name });
    console.log("4. Validação OK");
    
    console.log("5. Criando queue no banco...");
    const queue = await Queue.create(cleanQueueData);
    console.log("6. Queue criada:", { id: queue.id, name: queue.name });

    // AUTOMATICAMENTE associa um usuário padrão à nova fila
    try {
      console.log("7. Buscando usuário padrão para associar à fila...");
      
      // Busca o primeiro usuário disponível (não admin)
      const defaultUser = await User.findOne({
        where: { 
          profile: ["user", "supervisor"] // Qualquer perfil exceto admin
        },
        order: [["id", "ASC"]] // Pega o primeiro por ID
      });

      if (defaultUser) {
        console.log(`8. Associando usuário ${defaultUser.name} (ID: ${defaultUser.id}) à fila ${queue.name}`);
        
        await UserQueue.create({
          userId: defaultUser.id,
          queueId: queue.id
        });
        
        console.log("9. Usuário associado com sucesso!");
      } else {
        console.warn("⚠️ Nenhum usuário disponível para associar à fila");
      }
    } catch (userAssignError) {
      console.error("Erro ao associar usuário padrão à fila:", userAssignError);
      // Não falha a criação da fila por causa disso
    }

    // Se a distribuição automática está ativada, inicializa
    if (queueData.autoDistribution) {
      try {
        console.log(`10. Inicializando distribuição automática para nova fila ${queue.name} (${queue.id})`);
        await DistributionService.initializeDistribution({ queueId: queue.id });
        console.log(`11. Distribuição automática inicializada com sucesso`);
      } catch (error) {
        console.error(`Erro ao inicializar distribuição para nova fila ${queue.id}:`, error);
      }
    }

    return queue;
    
  } catch (err) {
    console.error("=== ERRO CreateQueueService ===");
    console.error("Erro:", err);
    throw new AppError(err.message || "Erro ao criar fila");
  }
};

export default CreateQueueService;
