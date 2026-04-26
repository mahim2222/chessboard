export function getChessSquareSize(): number {
  if (typeof document === "undefined") return 100
  const el = document.getElementById("box-00")
  if (!el) return 100
  const w = el.getBoundingClientRect().width
  return w > 0 && Number.isFinite(w) ? w : 100
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
