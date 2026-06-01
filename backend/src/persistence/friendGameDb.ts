import { isMongoConnected } from "../db";
import { Game } from "../models/Game";
import { Move } from "../models/Move";

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export type FriendGameLeanDoc = {
  gameId: string;
  matchType?: "friend" | "random" | "computer";
  creator: { playerId: string; name: string; color: string };
  joiner: { playerId: string; name: string; color: string } | null;
  currentFen?: string;
  status?: string;
  computerSettings?: { humanColor?: string; engineLevel?: number };
};

export async function friendGameCreatorJoined(
  gameId: string,
  player: { playerId: string; name: string }
): Promise<void> {
  if (!isMongoConnected()) {
    return;
  }
  await Game.findOneAndUpdate(
    { gameId },
    {
      $setOnInsert: {
        gameId,
        matchType: "friend" as const,
        createdAt: new Date(),
        creator: { playerId: player.playerId, name: player.name, color: "white" },
        joiner: null,
        status: "waiting",
        checkmate: false,
        stalemate: false,
        draw: false,
        winner: null,
        resultReason: null,
        currentFen: DEFAULT_FEN,
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: true, new: true }
  );
}

export async function friendGameJoinerJoined(
  gameId: string,
  player: { playerId: string; name: string }
): Promise<void> {
  if (!isMongoConnected()) {
    return;
  }
  await Game.findOneAndUpdate(
    { gameId },
    {
      $set: {
        matchType: "friend" as const,
        joiner: { playerId: player.playerId, name: player.name, color: "black" },
        status: "in_progress",
        updatedAt: new Date(),
      },
    }
  );
}

export async function persistRandomMatch(
  gameId: string,
  white: { playerId: string; name: string },
  black: { playerId: string; name: string }
): Promise<void> {
  if (!isMongoConnected()) {
    return;
  }
  await Game.findOneAndUpdate(
    { gameId },
    {
      $set: {
        gameId,
        matchType: "random" as const,
        creator: { playerId: white.playerId, name: white.name, color: "white" },
        joiner: { playerId: black.playerId, name: black.name, color: "black" },
        status: "in_progress",
        checkmate: false,
        stalemate: false,
        draw: false,
        winner: null,
        resultReason: null,
        currentFen: DEFAULT_FEN,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
}

function computerPlayerIds(gameId: string): { humanId: string; botId: string } {
  return { humanId: `comp-human-${gameId}`, botId: `comp-bot-${gameId}` };
}

export async function upsertComputerGameSession(
  gameId: string,
  humanColor: "white" | "black",
  engineLevel: number
): Promise<void> {
  if (!isMongoConnected()) {
    return;
  }
  const existingMoves = await Move.countDocuments({ gameId });
  if (existingMoves > 0) {
    return;
  }
  const { humanId, botId } = computerPlayerIds(gameId);
  const botColor: "white" | "black" = humanColor === "white" ? "black" : "white";
  const level = Math.min(6, Math.max(1, Math.floor(engineLevel)));
  await Game.findOneAndUpdate(
    { gameId },
    {
      $set: {
        gameId,
        matchType: "computer" as const,
        creator: { playerId: humanId, name: "Player", color: humanColor },
        joiner: { playerId: botId, name: "Computer", color: botColor },
        status: "in_progress",
        computerSettings: { humanColor, engineLevel: level },
        checkmate: false,
        stalemate: false,
        draw: false,
        winner: null,
        resultReason: null,
        currentFen: DEFAULT_FEN,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function recordComputerMove(
  gameId: string,
  movedByColor: "white" | "black",
  coords: { prevX: number; prevY: number; newX: number; newY: number },
  promotion: string | null,
  fenAfter: string | undefined
): Promise<void> {
  if (!isMongoConnected()) {
    return;
  }
  const docRaw = await Game.findOne({ gameId }).lean().exec();
  if (!docRaw || Array.isArray(docRaw)) {
    return;
  }
  const d = docRaw as unknown as FriendGameLeanDoc;
  if (d.matchType !== "computer") {
    return;
  }
  const { humanId, botId } = computerPlayerIds(gameId);
  const movedByPlayerId =
    d.creator?.color === movedByColor ? d.creator.playerId : d.joiner?.playerId ?? botId;
  const count = await Move.countDocuments({ gameId });
  const plyIndex = count + 1;
  const fen = fenAfter?.trim() ?? "";
  await Move.create({
    gameId,
    plyIndex,
    movedByPlayerId,
    movedByColor,
    ...coords,
    promotion,
    fenAfter: fen,
    createdAt: new Date(),
  });
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (fen.length > 0) {
    update.currentFen = fen;
  }
  await Game.updateOne({ gameId }, { $set: update });
}

export async function recordFriendMove(
  gameId: string,
  movedByPlayerId: string,
  movedByColorHint: "white" | "black",
  coords: { prevX: number; prevY: number; newX: number; newY: number },
  promotion: string | null,
  fenAfter: string | undefined
): Promise<void> {
  if (!isMongoConnected()) {
    return;
  }
  const docRaw = await Game.findOne({ gameId }).lean().exec();
  let movedByColor = movedByColorHint;
  if (docRaw && !Array.isArray(docRaw)) {
    const d = docRaw as unknown as FriendGameLeanDoc;
    if (d.creator?.playerId === movedByPlayerId) {
      movedByColor = "white";
    } else if (d.joiner?.playerId === movedByPlayerId) {
      movedByColor = "black";
    }
  }
  const count = await Move.countDocuments({ gameId });
  const plyIndex = count + 1;
  const fen = fenAfter?.trim() ?? "";
  await Move.create({
    gameId,
    plyIndex,
    movedByPlayerId,
    movedByColor,
    ...coords,
    promotion,
    fenAfter: fen,
    createdAt: new Date(),
  });
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (fen.length > 0) {
    update.currentFen = fen;
  }
  await Game.updateOne({ gameId }, { $set: update });
}

export async function finalizeFriendGame(
  gameId: string,
  result: "white_win" | "black_win" | "draw",
  reason: string
): Promise<void> {
  if (!isMongoConnected()) {
    return;
  }
  const checkmate = reason === "checkmate";
  const stalemate = reason === "stalemate";
  const draw =
    result === "draw" ||
    stalemate ||
    ["insufficient_material", "threefold_repetition", "fifty_move_rule", "unknown"].includes(
      reason
    );

  let winner: "white" | "black" | null = null;
  if (result === "white_win") {
    winner = "white";
  } else if (result === "black_win") {
    winner = "black";
  }

  await Game.findOneAndUpdate(
    { gameId },
    {
      $set: {
        status: "completed",
        checkmate,
        stalemate,
        draw,
        winner,
        resultReason: reason,
        updatedAt: new Date(),
      },
    }
  );
}

export async function friendGameAbandoned(gameId: string): Promise<void> {
  if (!isMongoConnected()) {
    return;
  }
  await Game.findOneAndUpdate(
    { gameId, status: { $nin: ["completed"] } },
    {
      $set: {
        status: "abandoned",
        updatedAt: new Date(),
      },
    }
  );
}

export type FriendGameMoveRecord = {
  plyIndex: number;
  prevX: number;
  prevY: number;
  newX: number;
  newY: number;
  promotion: string | null;
};

export async function listFriendGameMoves(gameId: string): Promise<FriendGameMoveRecord[]> {
  if (!isMongoConnected()) {
    return [];
  }
  const docs = await Move.find({ gameId }).sort({ plyIndex: 1 }).lean().exec();
  return docs.map((d) => ({
    plyIndex: d.plyIndex,
    prevX: d.prevX,
    prevY: d.prevY,
    newX: d.newX,
    newY: d.newY,
    promotion: d.promotion ?? null,
  }));
}

export async function getFriendGameLean(
  gameId: string
): Promise<FriendGameLeanDoc | null> {
  if (!isMongoConnected()) {
    return null;
  }
  const doc = await Game.findOne({ gameId }).lean().exec();
  if (!doc || Array.isArray(doc)) {
    return null;
  }
  return doc as unknown as FriendGameLeanDoc;
}
