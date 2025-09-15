import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as MessageController from "../controllers/MessageController";

const messageRoutes = Router();

const upload = multer(uploadConfig);


messageRoutes.get("/search", MessageController.searchMessages);  // endpoint da busca paginada e por termo
messageRoutes.get("/:ticketId",  MessageController.index); // para carregar todas as mensagens de um ticket

messageRoutes.post(
  "/:ticketId",
  isAuth,
  upload.array("medias"),
  MessageController.store
);

messageRoutes.delete("/:messageId", isAuth, MessageController.remove);

export default messageRoutes;
