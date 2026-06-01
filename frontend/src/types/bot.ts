import { Color, FENChar } from "@/chess-logic/models";

export type StockfishQueryParams = {
    fen: string;
    depth: number;
}

export type ChessMove = {
    prevX: number;
    prevY: number;
    newX: number;
    newY: number;
    promotedPiece: FENChar | null;
}

export type StockfishResponse = {
    success: boolean;
    evaulatuion: number | null;
    mate: number | null;
    bestmove: string;
    continuation: string;
}

export type ComputerConfiguration = {
    color: Color;
    level: number;
}

/** stockfish.online v2 API requires depth > 5 (minimum effective depth 6). */
export const MIN_STOCKFISH_DEPTH = 6;

export const stockfishLevels: Readonly<Record<number, number>> = {
    1: 6,
    2: 7,
    3: 9,
    4: 11,
    5: 13,
    6: 15,
}