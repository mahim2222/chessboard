import { Piece } from "./pieces/piece"

export enum Color {
    White,
    Black
}

export type Coords = {
    x: number,
    y: number
}

export enum FENChar {
    WhitePawn="P",
    WhiteKnight="N",
    WhiteBishop="B",
    WhiteRook="R",
    WhiteQueen="Q",
    WhiteKing="K",
    BlackPawn="p",
    BlackKnight="n",
    BlackBishop="b",
    BlackRook="r",
    BlackQueen="q",
    BlackKing="k",
}

export const pieceImagePaths: Readonly<Record<FENChar, string>> = {
    [FENChar.WhitePawn]: "/images/pieces/pawn-w.svg",
    [FENChar.WhiteKnight]: "/images/pieces/knight-w.svg",
    [FENChar.WhiteBishop]: "/images/pieces/bishop-w.svg",
    [FENChar.WhiteRook]: "/images/pieces/rook-w.svg",
    [FENChar.WhiteQueen]: "/images/pieces/queen-w.svg",
    [FENChar.WhiteKing]: "/images/pieces/king-w.svg",
    [FENChar.BlackPawn]: "/images/pieces/pawn-b.svg",
    [FENChar.BlackKnight]: "/images/pieces/knight-b.svg",
    [FENChar.BlackBishop]: "/images/pieces/bishop-b.svg",
    [FENChar.BlackRook]: "/images/pieces/rook-b.svg",
    [FENChar.BlackQueen]: "/images/pieces/queen-b.svg",
    [FENChar.BlackKing]: "/images/pieces/king-b.svg"
}

export type SafeSquares = Map<string, Coords[]>

export enum MoveType {
    Capture,
    Castling,
    Promotion,
    Check,
    CheckMate,
    BasicMove
}

export type LastMove = {
    piece: Piece
    prevX: number,
    prevY: number,
    currX: number,
    currY: number
    moveType: Set<MoveType>
}

type KingChecked = {
    isInCheck: true,
    x: number,
    y: number
}

type KingNotChecked = {
    isInCheck: false
}

export type CheckState = KingChecked | KingNotChecked

export const columns = ["a","b","c","d","e","f","g","h"] as const

export type MoveList = ([string, string?])[]

export type GameHistory = {
    lastMove: LastMove|undefined
    checkState: CheckState
    board: (FENChar | null)[][]
}[]