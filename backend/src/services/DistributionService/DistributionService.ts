import Distribution from "../../models/Distribution";
import Queue from "../../models/Queue";
import User from "../../models/User";
import { Op } from "sequelize";

interface InitializeDistributionRequest {
  queueId: number;
}

interface GetNextUserRequest {
  queueId: number;
}

const DistributionService = {
  // Inicializa a distribuição para uma fila
  async initializeDistribution({ queueId }: InitializeDistributionRequest): Promise<void> {
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
      throw new Error(`Fila ${queueId} não encontrada`);
    }

    // Se não há usuários, tenta associar um usuário padrão automaticamente
    if (!queue.users?.length) {
      console.log(`Fila ${queueId} sem usuários. Tentando associar usuário padrão...`);
      
      try {
        // Busca o primeiro usuário disponível (não admin)
        const defaultUser = await User.findOne({
          where: { 
            profile: ["user", "supervisor"]
          },
          order: [["id", "ASC"]]
        });

        if (defaultUser) {
          // Importa o modelo UserQueue dinamicamente para evitar dependência circular
          const UserQueue = (await import("../../models/UserQueue")).default;
          
          // Associa o usuário à fila
          await UserQueue.create({
            userId: defaultUser.id,
            queueId: queueId
          });
          
          console.log(`✅ Usuário ${defaultUser.name} associado automaticamente à fila ${queueId}`);
          
          // Recarrega a fila com os usuários atualizados
          await queue.reload({
            include: [
              {
                model: User,
                as: "users",
                attributes: ["id", "name"]
              }
            ]
          });
        } else {
          throw new Error("Nenhum usuário disponível no sistema para associar à fila");
        }
      } catch (autoAssignError) {
        console.error(`Erro ao associar usuário automaticamente à fila ${queueId}:`, autoAssignError);
        throw new Error(`Fila ${queueId} não encontrada ou sem usuários. ${autoAssignError.message}`);
      }
    }

    // Verifica novamente se agora temos usuários
    if (!queue.users?.length) {
      throw new Error(`Fila ${queueId} ainda sem usuários após tentativa de associação automática`);
    }

    // Remove distribuições antigas desta fila
    await Distribution.destroy({
      where: { queueId }
    });

    // Cria nova distribuição com todos os usuários da fila
    const distributions = queue.users.map((user, index) => ({
      queueId,
      userId: user.id,
      position: index,
      isCurrentUser: index === 0, // O primeiro é o atual
      isActive: true
    }));

    await Distribution.bulkCreate(distributions);
    console.log(`Distribuição inicializada para fila ${queueId} com ${queue.users.length} usuários`);
  },

  // Obtém o próximo usuário na distribuição
  async getNextUser({ queueId }: GetNextUserRequest): Promise<User | null> {
    // Busca o usuário atual
    const currentDistribution = await Distribution.findOne({
      where: {
        queueId,
        isCurrentUser: true,
        isActive: true
      },
      include: [
        {
          model: User,
          as: "user"
        }
      ]
    });

    if (!currentDistribution) {
      // Se não há distribuição, inicializa
      await this.initializeDistribution({ queueId });
      return await this.getNextUser({ queueId });
    }

    const currentUser = currentDistribution.user;

    // Move para o próximo usuário
    await this.moveToNextUser({ queueId });

    return currentUser;
  },

  // Move para o próximo usuário na sequência
  async moveToNextUser({ queueId }: { queueId: number }): Promise<void> {
    const distributions = await Distribution.findAll({
      where: {
        queueId,
        isActive: true
      },
      order: [["position", "ASC"]]
    });

    if (!distributions.length) {
      return;
    }

    // Encontra o usuário atual
    const currentIndex = distributions.findIndex(d => d.isCurrentUser);
    
    if (currentIndex === -1) {
      // Se não há usuário atual, define o primeiro
      await Distribution.update(
        { isCurrentUser: true },
        { where: { id: distributions[0].id } }
      );
      return;
    }

    // Remove o flag do usuário atual
    await Distribution.update(
      { isCurrentUser: false },
      { where: { id: distributions[currentIndex].id } }
    );

    // Define o próximo usuário (volta para 0 se chegou no final)
    const nextIndex = (currentIndex + 1) % distributions.length;
    await Distribution.update(
      { isCurrentUser: true },
      { where: { id: distributions[nextIndex].id } }
    );

    console.log(`Distribuição movida para próximo usuário na fila ${queueId}`);
  },

  // Sincroniza a distribuição quando usuários da fila mudam
  async syncDistribution({ queueId }: { queueId: number }): Promise<void> {
    const queue = await Queue.findByPk(queueId, {
      include: [
        {
          model: User,
          as: "users",
          attributes: ["id"]
        }
      ]
    });

    if (!queue || !queue.users?.length) {
      // Se não há usuários, remove distribuições
      await Distribution.destroy({ where: { queueId } });
      return;
    }

    const queueUserIds = queue.users.map(u => u.id);
    
    // Remove usuários que não estão mais na fila
    await Distribution.destroy({
      where: {
        queueId,
        userId: {
          [Op.notIn]: queueUserIds
        }
      }
    });

    // Adiciona novos usuários que foram adicionados à fila
    const existingDistributions = await Distribution.findAll({
      where: { queueId },
      attributes: ["userId", "position"]
    });
    
    const existingUserIds = existingDistributions.map(d => d.userId);
    const newUserIds = queueUserIds.filter(id => !existingUserIds.includes(id));

    if (newUserIds.length > 0) {
      // Calcula a próxima posição baseada na maior posição existente
      const maxPosition = existingDistributions.length > 0 
        ? Math.max(...existingDistributions.map(d => d.position)) + 1
        : 0;
        
      const newDistributions = newUserIds.map((userId, index) => ({
        queueId,
        userId,
        position: maxPosition + index,
        isCurrentUser: false,
        isActive: true
      }));

      await Distribution.bulkCreate(newDistributions);
    }

    // Se não há usuário atual, define um usuário
    const hasCurrentUser = await Distribution.findOne({
      where: {
        queueId,
        isCurrentUser: true
      }
    });

    if (!hasCurrentUser) {
      const firstDistribution = await Distribution.findOne({
        where: { queueId },
        order: [["position", "ASC"]]
      });

      if (firstDistribution) {
        await firstDistribution.update({ isCurrentUser: true });
      }
    }

    console.log(`Distribuição sincronizada para fila ${queueId}`);
  },

  // Função para corrigir posições incorretas (todas em 0)
  async fixPositions({ queueId }: { queueId: number }): Promise<void> {
    const distributions = await Distribution.findAll({
      where: { queueId },
      order: [["id", "ASC"]] // Ordena por ID de criação
    });

    if (distributions.length === 0) return;

    // Atualiza as posições sequencialmente
    for (let i = 0; i < distributions.length; i++) {
      await distributions[i].update({ position: i });
    }

    console.log(`Posições corrigidas para fila ${queueId}: ${distributions.length} usuários`);
  },

  // Remove todas as distribuições de uma fila (quando desabilitar distribuição automática)
  async clearDistribution({ queueId }: { queueId: number }): Promise<void> {
    const deletedCount = await Distribution.destroy({
      where: { queueId }
    });

    console.log(`Distribuição removida para fila ${queueId}: ${deletedCount} registros deletados`);
  }
};

export default DistributionService;