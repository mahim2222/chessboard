import mongoose from "mongoose";

const playerSlotSchema = new mongoose.Schema(
  {
    playerId: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, enum: ["white", "black"], required: true },
  },
  { _id: false }
);

const gameSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true, unique: true, index: true },
    matchType: {
      type: String,
      enum: ["friend", "random", "computer"],
      default: "friend",
    },
    /** vs Stockfish — only when matchType is "computer". */
    computerSettings: {
      humanColor: { type: String, enum: ["white", "black"], required: false },
      engineLevel: { type: Number, min: 1, max: 6, required: false },
    },
    /** First player to open the shared link — always White in friend rooms. */
    creator: { type: playerSlotSchema, required: true },
    /** Second player who joined — always Black. */
    joiner: { type: playerSlotSchema, default: null },
    status: {
      type: String,
      enum: ["waiting", "in_progress", "completed", "abandoned"],
      default: "waiting",
    },
    checkmate: { type: Boolean, default: false },
    stalemate: { type: Boolean, default: false },
    draw: { type: Boolean, default: false },
    winner: { type: String, enum: ["white", "black", null], default: null },
    resultReason: { type: String, default: null },
    currentFen: { type: String, default: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "games" }
);

export type GameDoc = mongoose.InferSchemaType<typeof gameSchema>;
export const Game = mongoose.models.Game ?? mongoose.model("Game", gameSchema);
