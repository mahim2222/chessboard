import express, { Request, Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { connectMongo } from "./db";
import {
  finalizeFriendGame,
  getFriendGameLean,
  listFriendGameMoves,
  recordComputerMove,
  upsertComputerGameSession,
} from "./persistence/friendGameDb";
import { listGameMessages } from "./persistence/chatDb";
import { attachMatchHandlers } from "./matchRooms";

void connectMongo().catch((err) => {
  console.error("MongoDB connection failed — friend games will not persist:", err);
});

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({"message": "backend is running"});
});

app.get("/games/:gameId/state", async (req: Request, res: Response) => {
  const gameId = String(req.params.gameId ?? "").trim();
  if (!gameId || gameId === "random-queue") {
    res.status(400).json({ error: "Invalid gameId" });
    return;
  }
  try {
    const [moves, game, messages] = await Promise.all([
      listFriendGameMoves(gameId),
      getFriendGameLean(gameId),
      listGameMessages(gameId),
    ]);
    res.json({ moves, game, messages });
  } catch (err) {
    console.error("GET /games/:gameId/state", err);
    res.status(500).json({ error: "Failed to load game state" });
  }
});

app.post("/games/:gameId/computer/session", async (req: Request, res: Response) => {
  const gameId = String(req.params.gameId ?? "").trim();
  if (!gameId) {
    res.status(400).json({ error: "Invalid gameId" });
    return;
  }
  const humanColor = req.body?.humanColor;
  const engineLevel = Number(req.body?.engineLevel);
  if (humanColor !== "white" && humanColor !== "black") {
    res.status(400).json({ error: "humanColor must be white or black" });
    return;
  }
  if (!Number.isFinite(engineLevel) || engineLevel < 1 || engineLevel > 6) {
    res.status(400).json({ error: "engineLevel must be 1–6" });
    return;
  }
  try {
    await upsertComputerGameSession(gameId, humanColor, engineLevel);
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /games/:gameId/computer/session", err);
    res.status(500).json({ error: "Failed to save computer session" });
  }
});

app.post("/games/:gameId/computer/move", async (req: Request, res: Response) => {
  const gameId = String(req.params.gameId ?? "").trim();
  if (!gameId) {
    res.status(400).json({ error: "Invalid gameId" });
    return;
  }
  const movedByColor = req.body?.movedByColor;
  if (movedByColor !== "white" && movedByColor !== "black") {
    res.status(400).json({ error: "movedByColor must be white or black" });
    return;
  }
  const prevX = Number(req.body?.prevX);
  const prevY = Number(req.body?.prevY);
  const newX = Number(req.body?.newX);
  const newY = Number(req.body?.newY);
  if ([prevX, prevY, newX, newY].some((n) => Number.isNaN(n) || n < 0 || n > 7)) {
    res.status(400).json({ error: "Invalid coordinates" });
    return;
  }
  const promotion =
    req.body?.promotion == null || req.body?.promotion === ""
      ? null
      : String(req.body.promotion).slice(0, 1);
  const fenAfter =
    typeof req.body?.fenAfter === "string" && req.body.fenAfter.length > 0
      ? req.body.fenAfter
      : undefined;
  try {
    const game = await getFriendGameLean(gameId);
    if (!game || game.matchType !== "computer") {
      res.status(404).json({ error: "Computer game not found" });
      return;
    }
    await recordComputerMove(
      gameId,
      movedByColor,
      { prevX, prevY, newX, newY },
      promotion,
      fenAfter
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /games/:gameId/computer/move", err);
    res.status(500).json({ error: "Failed to record move" });
  }
});

app.post("/games/:gameId/computer/complete", async (req: Request, res: Response) => {
  const gameId = String(req.params.gameId ?? "").trim();
  if (!gameId) {
    res.status(400).json({ error: "Invalid gameId" });
    return;
  }
  const result = String(req.body?.result ?? "");
  if (result !== "white_win" && result !== "black_win" && result !== "draw") {
    res.status(400).json({ error: "Invalid result" });
    return;
  }
  const reason = String(req.body?.reason ?? "unknown").slice(0, 64);
  try {
    const game = await getFriendGameLean(gameId);
    if (!game || game.matchType !== "computer") {
      res.status(404).json({ error: "Computer game not found" });
      return;
    }
    await finalizeFriendGame(gameId, result as "white_win" | "black_win" | "draw", reason);
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /games/:gameId/computer/complete", err);
    res.status(500).json({ error: "Failed to finalize game" });
  }
});

const httpServer = createServer(app);
const wss = new WebSocketServer({
  server: httpServer,
  path: "/ws",
});

wss.on("connection", (ws) => {
  attachMatchHandlers(ws);
});

httpServer.listen(PORT, () => {
  console.log(`HTTP + WebSocket listening on http://localhost:${PORT} (WS path /ws)`);
});
