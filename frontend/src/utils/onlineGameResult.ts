import type { GameOverReport } from "@/types/match"

/** Maps `ChessBoard` game-over copy to a payload the server can store. */
export function parseOnlineGameResult(msg: string | undefined): GameOverReport | null {
  if (!msg) {
    return null
  }
  if (msg === "Stalemate") {
    return { result: "draw", reason: "stalemate" }
  }
  if (msg.includes("won by checkmate")) {
    if (msg.startsWith("White")) {
      return { result: "white_win", reason: "checkmate" }
    }
    if (msg.startsWith("Black")) {
      return { result: "black_win", reason: "checkmate" }
    }
  }
  if (msg.includes("insufficient material")) {
    return { result: "draw", reason: "insufficient_material" }
  }
  if (msg.includes("repetition")) {
    return { result: "draw", reason: "threefold_repetition" }
  }
  if (msg.includes("fifty move")) {
    return { result: "draw", reason: "fifty_move_rule" }
  }
  return { result: "draw", reason: "unknown" }
}
