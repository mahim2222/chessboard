import type { FENChar } from "@/chess-logic/models"

export type ServerMatchMessage =
  | {
      type: "waiting"
      socketId: string
      yourPlayerId: string
      gameId: string
    }
  | {
      type: "matched"
      socketId: string
      yourPlayerId: string
      gameId: string
      opponent: { id: string; name: string }
      playAs: "white" | "black"
      /** Latest FEN from DB (client also loads moves via HTTP). */
      boardFen?: string
    }
  | { type: "room_full" }
  | { type: "error"; message: string }
  | { type: "opponent_disconnected" }
  | {
      type: "chat_message"
      gameId: string
      senderPlayerId: string
      senderName: string
      text: string
      createdAt: string
    }

export type OpponentSessionStatus =
  | "loading"
  | "connecting"
  | "waiting"
  | "matched"
  | "room_full"
  | "opponent_left"
  | "error"

export type OpponentSession = {
  status: OpponentSessionStatus
  gameId: string
  yourPlayerId: string | null
  socketId: string | null
  opponent: { id: string; name: string } | null
  errorMessage: string | null
  playAs: "white" | "black" | null
}

export type RemoteMovePayload = {
  prevX: number
  prevY: number
  newX: number
  newY: number
  promotion: FENChar | null
  /** FEN after this move (friend games — persisted on server). */
  fenAfter?: string
}

/** Server notifies both players after a resignation (DB already finalized). */
export type RemoteResignPayload = {
  result: "white_win" | "black_win"
  resignedBy: string
  gameId: string
}

/** One ply as stored in MongoDB `moves` collection. */
export type PersistedMove = {
  plyIndex: number
  prevX: number
  prevY: number
  newX: number
  newY: number
  promotion: string | null
}

export type GameOverReport = {
  result: "white_win" | "black_win" | "draw"
  reason:
    | "checkmate"
    | "stalemate"
    | "insufficient_material"
    | "threefold_repetition"
    | "fifty_move_rule"
    | "resign"
    | "unknown"
}

export type ChatMessage = {
  senderPlayerId: string
  senderName: string
  text: string
  createdAt: string
}
