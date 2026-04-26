import { Color, columns, LastMove } from "./models";
import { Bishop } from "./pieces/bishop";
import { King } from "./pieces/king";
import { Knight } from "./pieces/knight";
import { Pawn } from "./pieces/pawn";
import { Piece } from "./pieces/piece";
import { Queen } from "./pieces/queen";
import { Rook } from "./pieces/rook";

export class FENConverter {
    public convertBoardToFEN(
        board: (Piece|null)[][],
        playerColor: Color,
        lastMove: LastMove|undefined,
        fiftyMoveRuleCounter: number,
        numberOfFullMoves: number
    ) : string{
        let FEN: string = ""

        for(let i = 7; i >= 0; i--){
            let FENRow: string = ""
            let consecutiveEmptySquaresCounter = 0;

            for(const piece of board[i]){
                if(!piece) {
                    consecutiveEmptySquaresCounter++
                    continue
                }

                if(consecutiveEmptySquaresCounter !==0 )
                    FENRow += String(consecutiveEmptySquaresCounter)
                    
                consecutiveEmptySquaresCounter = 0
                FENRow += piece.FENChar
                
            }

            if(consecutiveEmptySquaresCounter !== 0)
                FENRow += String(consecutiveEmptySquaresCounter)

            FEN += (i === 0) ? FENRow : FENRow + "/";
            
        }
        
        const player: string = playerColor === Color.White ? "w" : "b"

        FEN += " " + player
        FEN += " " + this.castlingAvailability(board)
        FEN += " " + this.enPassantPosibility(lastMove, playerColor)
        FEN += " " + fiftyMoveRuleCounter * 2
        FEN += " " + numberOfFullMoves
        return FEN
    }

    private castlingAvailability(board: (Piece|null)[][]): string {
        const castlingPossibilities = (color: Color): string => {
            let castlingAvailability: string = ""

            const kingPositionX: number = color === Color.White ? 0 : 7
            const king: Piece|null = board[kingPositionX][4]

            if(king instanceof King && !king.hasMoved){
                const rookPositionX: number = kingPositionX
                const kingSideRook = board[rookPositionX][7]

                const queenSideRook = board[rookPositionX][0]

                if(kingSideRook instanceof Rook && !kingSideRook.hasMoved)
                    castlingAvailability += "k"

                if(queenSideRook instanceof Rook && !queenSideRook.hasMoved)
                    castlingAvailability += "q"

                if(color === Color.White)
                    castlingAvailability = castlingAvailability.toUpperCase()
            }

            return castlingAvailability
        }

        const castlingAvailability: string = castlingPossibilities(Color.White) + castlingPossibilities(Color.Black)
        return castlingAvailability !== "" ? castlingAvailability : "-"
    }

    private enPassantPosibility(lastMove: LastMove|undefined, color: Color): string {
        if(!lastMove) return "-"
        const { piece, currX: newX, prevX, prevY } = lastMove

        if(piece instanceof Pawn && Math.abs(newX - prevX) === 2){
            const row: number = color === Color.White ? 6 : 3
            return columns[prevY] + String(row)
        }
        return "-"
    }


    // convert FEN to board
    public convertFENToBoard(fen: string): { board: (Piece | null)[][], player: Color, castling: string, enPassant: string, fiftyMoveCounter: number, fullMoveCounter: number } {
        const board: (Piece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
        
        const [position, player, castling, enPassant, fiftyMoveCounter, fullMoveCounter] = fen.split(" ");
        
        const rows = position.split("/");
        for (let i = 0; i < 8; i++) {
            const row = rows[7 - i];
            let columnIndex = 0;
    
            for (const char of row) {
                if (parseInt(char, 10)) {
                    columnIndex += parseInt(char, 10);
                } else {
                    let piece: Piece | null = null;
                    let hasMoved = false;
    
                    const isInitialPawnPosition = (color: Color, rowIndex: number, colIndex: number) => 
                        (color === Color.White && rowIndex === 1) || (color === Color.Black && rowIndex === 6);
                        
                    const isInitialRookPosition = (colIndex: number) => colIndex === 0 || colIndex === 7;
                    const isInitialKingPosition = (color: Color, rowIndex: number, colIndex: number) => 
                        (color === Color.White && rowIndex === 0 && colIndex === 4) || (color === Color.Black && rowIndex === 7 && colIndex === 4);
                    
                    switch (char) {
                        case 'K':
                            hasMoved = !isInitialKingPosition(Color.White, i, columnIndex);
                            piece = new King(Color.White, hasMoved);
                            break;
                        case 'Q':
                            piece = new Queen(Color.White);
                            break;
                        case 'R':
                            hasMoved = !isInitialRookPosition(columnIndex) || !castling.includes('K');
                            piece = new Rook(Color.White, hasMoved);
                            break;
                        case 'B':
                            piece = new Bishop(Color.White);
                            break;
                        case 'N':
                            piece = new Knight(Color.White);
                            break;
                        case 'P':
                            hasMoved = !isInitialPawnPosition(Color.White, i, columnIndex);
                            piece = new Pawn(Color.White, hasMoved);
                            break;
                        case 'k':
                            hasMoved = !isInitialKingPosition(Color.Black, i, columnIndex);
                            piece = new King(Color.Black, hasMoved);
                            break;
                        case 'q':
                            piece = new Queen(Color.Black);
                            break;
                        case 'r':
                            hasMoved = !isInitialRookPosition(columnIndex) || !castling.includes('k');
                            piece = new Rook(Color.Black, hasMoved);
                            break;
                        case 'b':
                            piece = new Bishop(Color.Black);
                            break;
                        case 'n':
                            piece = new Knight(Color.Black);
                            break;
                        case 'p':
                            hasMoved = !isInitialPawnPosition(Color.Black, i, columnIndex);
                            piece = new Pawn(Color.Black, hasMoved);
                            break;
                        default:
                            break;
                    }
    
                    if (piece) {
                        board[i][columnIndex] = piece;
                    }
    
                    columnIndex++;
                }
            }
        }
    
        return {
            board,
            player: player === 'w' ? Color.White : Color.Black,
            castling,
            enPassant,
            fiftyMoveCounter: parseInt(fiftyMoveCounter, 10),
            fullMoveCounter: parseInt(fullMoveCounter, 10)
        };
    }    
    
   
}
