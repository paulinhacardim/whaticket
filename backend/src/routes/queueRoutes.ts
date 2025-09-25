import { Router } from "express";
import isAuth from "../middleware/isAuth";
import { QueryTypes } from "sequelize";
import sequelize from "../database";

import * as QueueController from "../controllers/QueueController";
import DistributionService from "../services/DistributionService/DistributionService";
import Queue from "../models/Queue";
import QueueUserEnsurer from "../helpers/QueueUserEnsurer";

const queueRoutes = Router();

// Rota de teste simples SEM autenticação
queueRoutes.get("/test-queue-route", (req, res) => {
  return res.json({ message: "Queue routes estão funcionando!", timestamp: new Date() });
});

// Rota para inicializar distribuição das filas
queueRoutes.get("/distribution", async (req, res) => {
  try {
    console.log("Iniciando processo de distribuição automática...");
    
    // PRIMEIRO: Garante que todas as filas tenham usuários
    await QueueUserEnsurer.ensureAllQueuesHaveUsers();
    
    // Busca todas as filas
    const queues = await Queue.findAll();
    
    if (!queues.length) {
      return res.json({ 
        error: "Nenhuma fila encontrada",
        message: "Crie filas primeiro para testar a distribuição"
      });
    }

    const results = [];
    
    // Inicializa distribuição para cada fila
    for (const queue of queues) {
      try {
        console.log(`Processando fila ${queue.id} (${queue.name})...`);
        await DistributionService.initializeDistribution({ queueId: queue.id });
        results.push({
          queueId: queue.id,
          queueName: queue.name,
          status: "Distribuição inicializada com sucesso"
        });
      } catch (error) {
        console.error(`Erro na fila ${queue.id}:`, error.message);
        results.push({
          queueId: queue.id,
          queueName: queue.name,
          status: "Erro ao inicializar",
          error: error.message
        });
      }
    }

    return res.json({
      message: "Distribuição das filas executada",
      timestamp: new Date(),
      results
    });
    
  } catch (error) {
    console.error("Erro na distribuição:", error);
    return res.status(500).json({
      error: "ERR_DISTRIBUTION",
      message: error.message
    });
  }
});

// Rota para corrigir filas sem usuários (pode ser chamada quando necessário)
queueRoutes.get("/fix-queues", async (req, res) => {
  try {
    console.log("Iniciando correção automática das filas...");
    
    await QueueUserEnsurer.ensureAllQueuesHaveUsers();
    
    return res.json({
      message: "Correção de filas executada com sucesso",
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error("Erro na correção das filas:", error);
    return res.status(500).json({
      error: "ERR_FIX_QUEUES",
      message: error.message
    });
  }
});

queueRoutes.get("/queue", isAuth, QueueController.index);

queueRoutes.post("/queue", isAuth, QueueController.store);

queueRoutes.get("/queue/:queueId", isAuth, QueueController.show);

queueRoutes.put("/queue/:queueId", isAuth, QueueController.update);

queueRoutes.delete("/queue/:queueId", isAuth, QueueController.remove);

export default queueRoutes;
