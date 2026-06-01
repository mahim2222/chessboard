/** Deployed backend (HTTP + WS on same host, paths / and /ws). */
const REMOTE_API_ORIGIN = "https://chess.sociomart.online"

export function getChessSquareSize(): number {
  if (typeof document === "undefined") return 100
  const el = document.getElementById("box-00")
  if (!el) return 100
  const w = el.getBoundingClientRect().width
  return w > 0 && Number.isFinite(w) ? w : 100
}

export function getApiBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_URL
  if (env) {
    return env.replace(/\/$/, "")
  }
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:4000"
  }
  return REMOTE_API_ORIGIN
}

export function getWsBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_WS_URL
  if (env) {
    return env.replace(/\/$/, "")
  }
  return REMOTE_API_ORIGIN.replace(/^http/, "ws")
}

export function calculateMovementPixel(prevX: number, prevY: number, newX: number, newY: number, squareSize: number): { left: number; top: number } {
    // Calculate the pixel movement
    const topMovement = (newX - prevX) * squareSize; // Movement in the x-direction
    const leftMovement = (newY - prevY) * squareSize; // Movement in the y-direction

    return {
        left: leftMovement,   // Negate the left movement
        top: -topMovement      // Negate the top movement
    };
}
