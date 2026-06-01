import { randomUUID } from "crypto";
import { WebSocket } from "ws";
import {
  finalizeFriendGame,
  friendGameAbandoned,
  friendGameCreatorJoined,
  friendGameJoinerJoined,
  getFriendGameLean,
  persistRandomMatch,
  recordFriendMove,
} from "./persistence/friendGameDb";
import { handleChatSend } from "./chat";

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type RoomPlayer = {
  ws: WebSocket;
  socketId: string;
  playerId: string;
  name: string;
};

const rooms = new Map<string, RoomPlayer[]>();
const roomMode = new Map<string, "friend" | "random">();
const wsToGame = new Map<WebSocket, string>();
let waitingRandomPlayer: RoomPlayer | null = null;
const connectionInfo = new Map<
  WebSocket,
  { gameId: string; playerId: string }
>();

function send(ws: WebSocket, obj: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

async function sendMatchedPairMessages(
  gameId: string,
  a: RoomPlayer,
  b: RoomPlayer
): Promise<void> {
  const doc = await getFriendGameLean(gameId);
  let playAsA: "white" | "black" = "white";
  let playAsB: "white" | "black" = "black";
  if (doc?.creator?.playerId && doc.joiner?.playerId) {
    playAsA = doc.creator.playerId === a.playerId ? "white" : "black";
    playAsB = doc.creator.playerId === b.playerId ? "white" : "black";
  }
  const boardFen =
    doc && typeof doc.currentFen === "string" && doc.currentFen.length > 0
      ? doc.currentFen
      : START_FEN;
  if (a.ws.readyState === WebSocket.OPEN) {
    send(a.ws, {
      type: "matched" as const,
      socketId: a.socketId,
      yourPlayerId: a.playerId,
      gameId,
      opponent: { id: b.playerId, name: b.name },
      playAs: playAsA,
      boardFen,
    });
  }
  if (b.ws.readyState === WebSocket.OPEN) {
    send(b.ws, {
      type: "matched" as const,
      socketId: b.socketId,
      yourPlayerId: b.playerId,
      gameId,
      opponent: { id: a.playerId, name: a.name },
      playAs: playAsB,
      boardFen,
    });
  }
}

function registerConnection(ws: WebSocket, gameId: string, playerId: string): void {
  connectionInfo.set(ws, { gameId, playerId });
}

function unregisterConnection(ws: WebSocket): void {
  connectionInfo.delete(ws);
}

function handleJoin(
  ws: WebSocket,
  socketId: string,
  gameId: string,
  playerId: string,
  name: string
): void {
  let list = rooms.get(gameId);
  if (!list) {
    list = [];
    rooms.set(gameId, list);
    roomMode.set(gameId, "friend");
  }

  const existingIdx = list.findIndex((p) => p.playerId === playerId);
  if (existingIdx !== -1) {
    const player: RoomPlayer = { ws, socketId, playerId, name };
    list[existingIdx] = player;
    wsToGame.set(ws, gameId);
    registerConnection(ws, gameId, playerId);
    const mode = roomMode.get(gameId);
    if (list.length === 2) {
      void sendMatchedPairMessages(gameId, list[0], list[1]).catch((e) =>
        console.error("[match] sendMatchedPairMessages:", e)
      );
    } else if (mode === "random") {
      send(ws, { type: "opponent_disconnected" as const });
    } else {
      send(ws, {
        type: "waiting" as const,
        socketId,
        yourPlayerId: playerId,
        gameId,
      });
    }
    return;
  }

  if (list.length >= 2) {
    send(ws, { type: "room_full" as const });
    ws.close();
    return;
  }

  const player: RoomPlayer = { ws, socketId, playerId, name };
  list.push(player);
  wsToGame.set(ws, gameId);
  registerConnection(ws, gameId, playerId);

  if (list.length === 1) {
    send(ws, {
      type: "waiting" as const,
      socketId,
      yourPlayerId: playerId,
      gameId,
    });
    if (roomMode.get(gameId) === "friend") {
      void friendGameCreatorJoined(gameId, { playerId, name }).catch((e) =>
        console.error("[mongo] friendGameCreatorJoined:", e)
      );
    }
    return;
  }

  const a = list[0];
  const b = list[1];
  const mode = roomMode.get(gameId);
  if (mode === "friend") {
    void (async () => {
      try {
        await friendGameJoinerJoined(gameId, {
          playerId: b.playerId,
          name: b.name,
        });
      } catch (e) {
        console.error("[mongo] friendGameJoinerJoined:", e);
      }
      await sendMatchedPairMessages(gameId, a, b);
    })();
  } else {
    void sendMatchedPairMessages(gameId, a, b).catch((e) =>
      console.error("[match] sendMatchedPairMessages:", e)
    );
  }
}

function handleRandomJoin(
  ws: WebSocket,
  socketId: string,
  playerId: string,
  name: string,
  lobbySessionId: string
): void {
  const me: RoomPlayer = { ws, socketId, playerId, name };

  if (waitingRandomPlayer && waitingRandomPlayer.ws !== ws) {
    const opponent = waitingRandomPlayer;
    waitingRandomPlayer = null;

    const gameId = randomUUID();
    const pair = [opponent, me];
    rooms.set(gameId, pair);
    roomMode.set(gameId, "random");
    wsToGame.set(opponent.ws, gameId);
    wsToGame.set(me.ws, gameId);
    registerConnection(opponent.ws, gameId, opponent.playerId);
    registerConnection(me.ws, gameId, me.playerId);

    void (async () => {
      try {
        await persistRandomMatch(
          gameId,
          { playerId: opponent.playerId, name: opponent.name },
          { playerId: me.playerId, name: me.name }
        );
      } catch (e) {
        console.error("[mongo] persistRandomMatch:", e);
      }
      await sendMatchedPairMessages(gameId, opponent, me);
    })();
    return;
  }

  waitingRandomPlayer = me;
  send(ws, {
    type: "waiting" as const,
    socketId,
    yourPlayerId: playerId,
    gameId: lobbySessionId,
  });
}

function handleMoveRelay(ws: WebSocket, data: Record<string, unknown>): void {
  const ctx = connectionInfo.get(ws);
  if (!ctx) {
    return;
  }
  const { gameId, playerId: myId } = ctx;
  const fromMsg = String(data.playerId ?? "");
  if (fromMsg !== myId) {
    send(ws, { type: "error", message: "playerId mismatch" });
    return;
  }
  const prevX = Number(data.prevX);
  const prevY = Number(data.prevY);
  const newX = Number(data.newX);
  const newY = Number(data.newY);
  if (
    [prevX, prevY, newX, newY].some((n) => Number.isNaN(n) || n < 0 || n > 7)
  ) {
    send(ws, { type: "error", message: "Invalid move coordinates" });
    return;
  }
  const list = rooms.get(gameId);
  if (!list || list.length !== 2) {
    return;
  }
  const other = list.find((p) => p.playerId !== myId);
  if (!other) {
    return;
  }
  const mode = roomMode.get(gameId);
  if (mode === "friend" || mode === "random") {
    const idx = list.findIndex((p) => p.playerId === myId);
    const movedByColor: "white" | "black" = idx === 0 ? "white" : "black";
    const fenRaw = data.fenAfter;
    const fenAfter =
      typeof fenRaw === "string" && fenRaw.length > 0 ? fenRaw : undefined;
    void recordFriendMove(
      gameId,
      myId,
      movedByColor,
      { prevX, prevY, newX, newY },
      data.promotion == null
        ? null
        : String(data.promotion).slice(0, 1) || null,
      fenAfter
    ).catch((e) => console.error("[mongo] recordFriendMove:", e));
  }
  const promotion =
    data.promotion == null
      ? null
      : String(data.promotion).slice(0, 1) || null;
  send(other.ws, {
    type: "move" as const,
    prevX,
    prevY,
    newX,
    newY,
    promotion,
  });
}

function handleLeave(ws: WebSocket): void {
  if (waitingRandomPlayer?.ws === ws) {
    waitingRandomPlayer = null;
  }
  unregisterConnection(ws);
  const gameId = wsToGame.get(ws);
  if (!gameId) {
    return;
  }
  wsToGame.delete(ws);
  const list = rooms.get(gameId);
  if (!list) {
    return;
  }
  const idx = list.findIndex((p) => p.ws === ws);
  if (idx === -1) {
    return;
  }
  list.splice(idx, 1);
  const other = list[0];
  if (other) {
    send(other.ws, { type: "opponent_disconnected" as const });
  }
  if (list.length === 0) {
    const mode = roomMode.get(gameId);
    if (mode === "friend" || mode === "random") {
      void friendGameAbandoned(gameId).catch((e) =>
        console.error("[mongo] friendGameAbandoned:", e)
      );
    }
    rooms.delete(gameId);
    roomMode.delete(gameId);
  }
}

function handleResign(ws: WebSocket, data: Record<string, unknown>): void {
  const ctx = connectionInfo.get(ws);
  if (!ctx) {
    return;
  }
  const { gameId, playerId: myId } = ctx;
  const mode = roomMode.get(gameId);
  if (mode !== "friend" && mode !== "random") {
    return;
  }
  const fromMsg = String(data.playerId ?? "");
  if (fromMsg !== myId) {
    send(ws, { type: "error", message: "playerId mismatch" });
    return;
  }
  const msgGameId = String(data.gameId ?? "").trim();
  if (msgGameId !== gameId) {
    send(ws, { type: "error", message: "gameId mismatch" });
    return;
  }
  const list = rooms.get(gameId);
  if (!list || list.length !== 2) {
    return;
  }
  const idx = list.findIndex((p) => p.playerId === myId);
  if (idx === -1) {
    return;
  }
  const resignerColor: "white" | "black" = idx === 0 ? "white" : "black";
  const result: "white_win" | "black_win" =
    resignerColor === "white" ? "black_win" : "white_win";

  void finalizeFriendGame(gameId, result, "resign").catch((e) =>
    console.error("[mongo] finalizeFriendGame (resign):", e)
  );

  const payload = {
    type: "resign_broadcast" as const,
    gameId,
    result,
    resignedBy: myId,
  };
  for (const p of list) {
    send(p.ws, payload);
  }
}

function handleGameOver(ws: WebSocket, data: Record<string, unknown>): void {
  const ctx = connectionInfo.get(ws);
  if (!ctx) {
    return;
  }
  const { gameId, playerId: myId } = ctx;
  const mode = roomMode.get(gameId);
  if (mode !== "friend" && mode !== "random") {
    return;
  }
  const fromMsg = String(data.playerId ?? "");
  if (fromMsg !== myId) {
    send(ws, { type: "error", message: "playerId mismatch" });
    return;
  }
  const msgGameId = String(data.gameId ?? "").trim();
  if (msgGameId !== gameId) {
    send(ws, { type: "error", message: "gameId mismatch" });
    return;
  }
  const result = String(data.result ?? "");
  if (result !== "white_win" && result !== "black_win" && result !== "draw") {
    send(ws, { type: "error", message: "Invalid game result" });
    return;
  }
  const reason = String(data.reason ?? "unknown").slice(0, 64);
  void finalizeFriendGame(
    gameId,
    result as "white_win" | "black_win" | "draw",
    reason
  ).catch((e) => console.error("[mongo] finalizeFriendGame:", e));
}

export function attachMatchHandlers(ws: WebSocket): void {
  const socketId = randomUUID();
  let joined = false;

  ws.on("message", (raw) => {
    let data: unknown;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }
    if (!data || typeof data !== "object") {
      return;
    }
    const msg = data as Record<string, unknown>;
    const kind = String(msg.type ?? "");

    if (!joined) {
      if (kind !== "join" && kind !== "join_random") {
        send(ws, { type: "error", message: "Expected join or join_random" });
        return;
      }
      const playerId = String(msg.playerId ?? "").trim();
      const name =
        String(msg.name ?? "Player")
          .trim()
          .slice(0, 48) || "Player";
      if (!playerId) {
        send(ws, { type: "error", message: "playerId is required" });
        return;
      }
      joined = true;
      if (kind === "join_random") {
        const lobbySessionId = String(msg.lobbySessionId ?? "").trim();
        if (!lobbySessionId) {
          send(ws, { type: "error", message: "lobbySessionId is required" });
          return;
        }
        handleRandomJoin(ws, socketId, playerId, name, lobbySessionId);
        return;
      }
      const gameId = String(msg.gameId ?? "").trim();
      if (!gameId) {
        send(ws, { type: "error", message: "gameId is required for room join" });
        return;
      }
      handleJoin(ws, socketId, gameId, playerId, name);
      return;
    }

    if (kind === "move") {
      handleMoveRelay(ws, msg);
      return;
    }
    if (kind === "game_over") {
      handleGameOver(ws, msg);
      return;
    }
    if (kind === "resign") {
      handleResign(ws, msg);
      return;
    }
    if (kind === "chat_send") {
      handleChatSend(ws, msg, connectionInfo, rooms);
    }
  });

  ws.on("close", () => {
    if (joined) {
      handleLeave(ws);
    }
  });
}
