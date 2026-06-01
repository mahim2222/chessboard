import axios from 'axios';
import { Color, FENChar } from '@/chess-logic/models';

import {StockfishQueryParams, ChessMove, StockfishResponse, ComputerConfiguration, stockfishLevels, MIN_STOCKFISH_DEPTH } from '@/types/bot';

export class StockFish {
  private api: string = "https://stockfish.online/api/s/v2.php";
  private computerConfiguration: ComputerConfiguration = { color: Color.Black, level: 1 };

  private convertColumnLetterToYCoord(string: string): number {
    return string.charCodeAt(0) - 'a'.charCodeAt(0);
  }

  private promotedPiece(piece: string | undefined): FENChar | null {
    if (!piece) return null;
    const computerColor: Color = this.computerConfiguration.color;
    if (piece === 'n') return computerColor === Color.White ? FENChar.WhiteKnight : FENChar.BlackKnight;
    if (piece === 'b') return computerColor === Color.White ? FENChar.WhiteBishop : FENChar.BlackBishop;
    if (piece === 'r') return computerColor === Color.White ? FENChar.WhiteRook : FENChar.BlackRook;
    return computerColor === Color.White ? FENChar.WhiteQueen : FENChar.BlackQueen;
  }

  private moveFromStockfishString(move: string): ChessMove {
    const prevY: number = this.convertColumnLetterToYCoord(move[0]);
    const prevX: number = Number(move[1]) - 1;
    const newY: number = this.convertColumnLetterToYCoord(move[2]);
    const newX: number = Number(move[3]) - 1;
    const promotedPiece = this.promotedPiece(move[4]);
    return { prevX, prevY, newX, newY, promotedPiece };
  }

  public async getBestMove(fen: string): Promise<ChessMove> {
    const mapped =
      stockfishLevels[this.computerConfiguration.level] ?? MIN_STOCKFISH_DEPTH;
    const queryParams: StockfishQueryParams = {
      fen,
      depth: Math.max(MIN_STOCKFISH_DEPTH, mapped),
    }

    try {
      const response = await axios.get<StockfishResponse>(this.api, { params: queryParams });
      const bestMove: string = response.data.bestmove.split(" ")[1];
      return this.moveFromStockfishString(bestMove);
    } catch (error) {
      console.error("Error fetching best move:", error);
      throw error
    }
  }

  public setComputerConfiguration(configuration: ComputerConfiguration): void {
    this.computerConfiguration = configuration;
  }
}
