import { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Message from "../models/Message";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId
  });

  SetTicketMessagesAsRead(ticket);

  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  const ticket = await ShowTicketService(ticketId);

  SetTicketMessagesAsRead(ticket);

  if (medias) {
    await Promise.all(
      medias.map(async (media: Express.Multer.File) => {
        await SendWhatsAppMedia({ media, ticket });
      })
    );
  } else {
    await SendWhatsAppMessage({ body, ticket, quotedMsg });
  }

  return res.send();
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;

  const message = await DeleteWhatsAppMessage(messageId);

  const io = getIO();
  io.to(message.ticketId.toString()).emit("appMessage", {
    action: "update",
    message
  });

  return res.send();
};

export const searchMessages = async (req: Request, res: Response) => {
  const ticketId = Number(req.query.ticketId);
  const searchTerm = (req.query.searchTerm || "").toString().toLowerCase().replace(/-/g, "");
  const offset = Number(req.query.offset) || 0;
  const pageSize = Number(req.query.limit) || 40;

  if (isNaN(ticketId)) {
    return res.status(400).json({ error: "ticketId inválido" });
  }

  // Busca insensível a acento, maiúsculo e hífen (corrigido para utf8mb4_general_ci)
  const { count, rows: messages } = await Message.findAndCountAll({
    where: Sequelize.literal(
      `ticketId = ${ticketId} AND REPLACE(LOWER(body), '-', '') COLLATE utf8mb4_general_ci LIKE '%${searchTerm}%'`
    ),
    order: [["createdAt", "ASC"]],
    offset,
    limit: pageSize
  });

  return res.json({ count, messages, hasMore: offset + messages.length < count });
};
