import { isMongoConnected } from "../db";
import { Message } from "../models/Message";

export type ChatMessageRecord = {
  senderPlayerId: string;
  senderName: string;
  text: string;
  createdAt: string;
};

export async function saveGameMessage(
  gameId: string,
  senderPlayerId: string,
  senderName: string,
  text: string
): Promise<ChatMessageRecord | null> {
  if (!isMongoConnected()) {
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const doc = await Message.create({
    gameId,
    senderPlayerId,
    senderName,
    text: trimmed,
    createdAt: new Date(),
  });
  return {
    senderPlayerId: doc.senderPlayerId,
    senderName: doc.senderName,
    text: doc.text,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listGameMessages(gameId: string): Promise<ChatMessageRecord[]> {
  if (!isMongoConnected()) {
    return [];
  }
  const docs = await Message.find({ gameId }).sort({ createdAt: 1 }).lean().exec();
  return docs.map((d) => ({
    senderPlayerId: d.senderPlayerId,
    senderName: d.senderName,
    text: d.text,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date(d.createdAt).toISOString(),
  }));
}
