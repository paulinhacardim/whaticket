import Queue from "../models/Queue";
import User from "../models/User";
import UserQueue from "../models/UserQueue";

/**
 * Middleware para garantir que uma fila sempre tenha pelo menos um usuário associado
 */
class QueueUserEnsurer {
  
  /**
   * Garante que uma fila específica tenha pelo menos um usuário
   */
  static async ensureQueueHasUsers(queueId: number): Promise<boolean> {
    try {
      const queue = await Queue.findByPk(queueId, {
        include: [
          {
            model: User,
            as: "users",
            attributes: ["id", "name"]
          }
        ]
      });

      if (!queue) {
        console.error(`Fila ${queueId} não encontrada`);
        return false;
      }

      // Se já tem usuários, está tudo certo
      if (queue.users && queue.users.length > 0) {
        console.log(`✅ Fila ${queueId} (${queue.name}) já tem ${queue.users.length} usuário(s)`);
        return true;
      }

      // Busca usuário padrão para associar
      const defaultUser = await User.findOne({
        where: { 
          profile: ["user", "supervisor"]
        },
        order: [["id", "ASC"]]
      });

      if (!defaultUser) {
        console.error("❌ Nenhum usuário disponível no sistema para associar");
        return false;
      }

      // Associa o usuário à fila
      await UserQueue.create({
        userId: defaultUser.id,
        queueId: queueId
      });

      console.log(`✅ Usuário ${defaultUser.name} (ID: ${defaultUser.id}) associado automaticamente à fila ${queueId} (${queue.name})`);
      return true;

    } catch (error) {
      console.error(`Erro ao garantir usuários na fila ${queueId}:`, error);
      return false;
    }
  }

  /**
   * Verifica e corrige todas as filas sem usuários
   */
  static async ensureAllQueuesHaveUsers(): Promise<void> {
    try {
      console.log("🔍 Verificando todas as filas...");
      
      const queues = await Queue.findAll({
        include: [
          {
            model: User,
            as: "users",
            attributes: ["id", "name"]
          }
        ]
      });

      const queuesWithoutUsers = queues.filter(queue => !queue.users || queue.users.length === 0);
      
      if (queuesWithoutUsers.length === 0) {
        console.log("✅ Todas as filas já têm usuários associados!");
        return;
      }

      console.log(`📋 Encontradas ${queuesWithoutUsers.length} filas sem usuários:`);
      
      for (const queue of queuesWithoutUsers) {
        console.log(`- Fila ${queue.id}: ${queue.name}`);
        await this.ensureQueueHasUsers(queue.id);
      }

      console.log("🎉 Verificação concluída!");

    } catch (error) {
      console.error("❌ Erro na verificação geral das filas:", error);
    }
  }

  /**
   * Middleware Express para garantir que uma fila tenha usuários antes de operações críticas
   */
  static async middlewareEnsureQueueUsers(req: any, res: any, next: any): Promise<void> {
    try {
      const queueId = req.params.queueId || req.body.queueId;
      
      if (queueId) {
        const hasUsers = await QueueUserEnsurer.ensureQueueHasUsers(parseInt(queueId));
        
        if (!hasUsers) {
          return res.status(400).json({
            error: "QUEUE_WITHOUT_USERS",
            message: `Fila ${queueId} não possui usuários associados e não foi possível associar automaticamente`
          });
        }
      }
      
      next();
    } catch (error) {
      console.error("Erro no middleware de verificação de usuários da fila:", error);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Erro interno ao verificar usuários da fila"
      });
    }
  }
}

export default QueueUserEnsurer;