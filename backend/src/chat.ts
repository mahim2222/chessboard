import { WebSocket } from "ws";
import { saveGameMessage } from "./persistence/chatDb";

type RoomPlayer = {
  ws: WebSocket;
  socketId: string;
  playerId: string;
  name: string;
};

type ConnectionContext = {
  gameId: string;
  playerId: string;
};

function sanitizeText(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function safeSend(ws: WebSocket, payload: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function handleChatSend(
  ws: WebSocket,
  data: Record<string, unknown>,
  connectionInfo: Map<WebSocket, ConnectionContext>,
  rooms: Map<string, RoomPlayer[]>
): void {
  const ctx = connectionInfo.get(ws);
  if (!ctx) {
    return;
  }
  const { gameId, playerId } = ctx;
  const fromMsg = String(data.playerId ?? "");
  if (fromMsg !== playerId) {
    safeSend(ws, { type: "error", message: "playerId mismatch" });
    return;
  }
  const list = rooms.get(gameId);
  if (!list || list.length === 0) {
    return;
  }
  const me = list.find((p) => p.playerId === playerId);
  if (!me) {
    return;
  }
  const text = sanitizeText(data.text);
  if (!text) {
    return;
  }
  const payload = {
    type: "chat_message" as const,
    gameId,
    senderPlayerId: playerId,
    senderName: me.name,
    text,
    createdAt: new Date().toISOString(),
  };
  for (const p of list) {
    safeSend(p.ws, payload);
  }
  void saveGameMessage(gameId, playerId, me.name, text).catch((err) =>
    console.error("[mongo] saveGameMessage:", err)
  );
}
