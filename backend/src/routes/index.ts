import { Router } from "express";

import userRoutes from "./userRoutes";
import authRoutes from "./authRoutes";
import settingRoutes from "./settingRoutes";
import contactRoutes from "./contactRoutes";
import ticketRoutes from "./ticketRoutes";
import whatsappRoutes from "./whatsappRoutes";
import messageRoutes from "./messageRoutes";
import whatsappSessionRoutes from "./whatsappSessionRoutes";
import queueRoutes from "./queueRoutes";
import quickAnswerRoutes from "./quickAnswerRoutes";
import apiRoutes from "./apiRoutes";

const routes = Router();

routes.use("/auth", authRoutes);
routes.use(queueRoutes); 
routes.use(userRoutes);
routes.use(settingRoutes);
routes.use(contactRoutes);
routes.use(ticketRoutes);
routes.use(whatsappRoutes);
routes.use(whatsappSessionRoutes);
routes.use(quickAnswerRoutes);
routes.use("/api/messages", apiRoutes);
// messageRoutes DEVE ficar por ÚLTIMO devido à rota catch-all /:ticketId
routes.use(messageRoutes);

export default routes;
