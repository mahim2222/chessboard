import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true, index: true },
    senderPlayerId: { type: String, required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "messages" }
);

messageSchema.index({ gameId: 1, createdAt: 1 });

export type MessageDoc = mongoose.InferSchemaType<typeof messageSchema>;
export const Message =
  mongoose.models.Message ?? mongoose.model("Message", messageSchema);
