export function calculateMovementPixel(prevX: number, prevY: number, newX: number, newY: number, squareSize: number): { left: number; top: number } {
    // Calculate the pixel movement
    const topMovement = (newX - prevX) * squareSize; // Movement in the x-direction
    const leftMovement = (newY - prevY) * squareSize; // Movement in the y-direction

    return {
        left: leftMovement,   // Negate the left movement
        top: -topMovement      // Negate the top movement
    };
}
