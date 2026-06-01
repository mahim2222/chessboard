import mongoose from "mongoose";

const moveSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true, index: true },
    plyIndex: { type: Number, required: true },
    movedByPlayerId: { type: String, required: true },
    movedByColor: { type: String, enum: ["white", "black"], required: true },
    prevX: { type: Number, required: true },
    prevY: { type: Number, required: true },
    newX: { type: Number, required: true },
    newY: { type: Number, required: true },
    promotion: { type: String, default: null },
    fenAfter: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "moves" }
);

moveSchema.index({ gameId: 1, plyIndex: 1 }, { unique: true });

export type MoveDoc = mongoose.InferSchemaType<typeof moveSchema>;
export const Move = mongoose.models.Move ?? mongoose.model("Move", moveSchema);
