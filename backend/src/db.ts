import mongoose from "mongoose";

const DEFAULT_URI = "mongodb://127.0.0.1:27017/chessboard";

export async function connectMongo(): Promise<void> {
  const uri = process.env.MONGODB_URI ?? DEFAULT_URI;
  if (mongoose.connection.readyState === 1) {
    return;
  }
  await mongoose.connect(uri);
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
