
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import CreateQueueService from "../services/QueueService/CreateQueueService";
import DeleteQueueService from "../services/QueueService/DeleteQueueService";
import ListQueuesService from "../services/QueueService/ListQueuesService";
import ShowQueueService from "../services/QueueService/ShowQueueService";
import UpdateQueueService from "../services/QueueService/UpdateQueueService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const queues = await ListQueuesService();

  return res.status(200).json(queues);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log("=== DEBUG POST /queue ===");
    console.log("1. Dados recebidos:", req.body);
    console.log("2. Headers:", req.headers.authorization ? "Token presente" : "Sem token");
    
    const { name, color, greetingMessage } = req.body;
    console.log("3. Dados extraídos:", { name, color, greetingMessage });

    console.log("4. Chamando CreateQueueService...");
    const queue = await CreateQueueService({ name, color, greetingMessage });
    console.log("5. Queue criada com sucesso:", queue.id);

    console.log("6. Emitindo socket...");
    const io = getIO();
    io.emit("queue", {
      action: "update",
      queue
    });

    console.log("7. Retornando resposta 200");
    return res.status(200).json(queue);
    
  } catch (error) {
    console.error("=== ERRO NO STORE ===");
    console.error("Erro detalhado:", error);
    console.error("Stack:", error.stack);
    return res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { queueId } = req.params;

  const queue = await ShowQueueService(queueId);

  return res.status(200).json(queue);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;

  const queue = await UpdateQueueService(queueId, req.body);

  const io = getIO();
  io.emit("queue", {
    action: "update",
    queue
  });

  return res.status(201).json(queue);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;

  await DeleteQueueService(queueId);

  const io = getIO();
  io.emit("queue", {
    action: "delete",
    queueId: +queueId
  });

  return res.status(200).send();
};
