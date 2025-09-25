import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  ForeignKey,
  AfterCreate,
  AfterDestroy,
  AfterBulkCreate,
  AfterBulkDestroy
} from "sequelize-typescript";
import Queue from "./Queue";
import User from "./User";
import DistributionService from "../services/DistributionService/DistributionService";

@Table
class UserQueue extends Model<UserQueue> {
  @ForeignKey(() => User)
  @Column
  userId: number;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  // --- sistema de distribuição automático (usuário-fila) ---

  // Sincroniza a distribuição da fila após adicionar um usuário à fila
  @AfterCreate
  static async syncAfterCreate(instance: UserQueue): Promise<void> {
    try {
      if (instance?.queueId) {
        await DistributionService.syncDistribution({ queueId: instance.queueId });
      }
    } catch (err) {
      console.error("[UserQueue.afterCreate] Falha ao sincronizar distribuição:", err?.message || err);
    }
  }

  // Sincroniza a distribuição da fila após remover um usuário da fila
  @AfterDestroy
  static async syncAfterDestroy(instance: UserQueue): Promise<void> {
    try {
      if (instance?.queueId) {
        await DistributionService.syncDistribution({ queueId: instance.queueId });
      }
    } catch (err) {
      console.error("[UserQueue.afterDestroy] Falha ao sincronizar distribuição:", err?.message || err);
    }
  }

  // Sincroniza a distribuição da fila após operações em massa (bulk) de criação ou remoção
  @AfterBulkCreate
  static async syncAfterBulkCreate(instances: UserQueue[]): Promise<void> {
    try {
      const queueIds = Array.from(new Set((instances || []).map(i => i.queueId).filter(Boolean)));
      await Promise.all(queueIds.map(queueId => DistributionService.syncDistribution({ queueId })));
    } catch (err) {
      console.error("[UserQueue.afterBulkCreate] Falha ao sincronizar distribuição:", err?.message || err);
    }
  }

  //  Sincroniza a distribuição da fila após remover múltiplos usuários
  @AfterBulkDestroy
  static async syncAfterBulkDestroy(options: any): Promise<void> {
    try {
      const queueId = options?.where?.queueId;
      if (queueId) {
        await DistributionService.syncDistribution({ queueId });
      }
    } catch (err) {
      console.error("[UserQueue.afterBulkDestroy] Falha ao sincronizar distribuição:", err?.message || err);
    }
  }
}

export default UserQueue;
