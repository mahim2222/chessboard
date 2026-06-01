export const COMPUTER_GAME_STORAGE_KEY = "computer-game-id"

export function clearComputerGameStorage(): void {
  if (typeof window === "undefined") {
    return
  }
  localStorage.removeItem(COMPUTER_GAME_STORAGE_KEY)
}

export function readOrCreateComputerGameId(): string {
  if (typeof window === "undefined") {
    return ""
  }
  let id = localStorage.getItem(COMPUTER_GAME_STORAGE_KEY)
  if (!id || id.trim().length === 0) {
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
    localStorage.setItem(COMPUTER_GAME_STORAGE_KEY, id)
  }
  return id
}

export function writeComputerGameId(id: string): void {
  if (typeof window === "undefined") {
    return
  }
  localStorage.setItem(COMPUTER_GAME_STORAGE_KEY, id)
}
