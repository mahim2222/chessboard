import { useEffect, useRef, useState } from "react"
import { ChessBoard } from "@/chess-logic/chess-board"
import { CheckState, Color, Coords, FENChar, LastMove, pieceImagePaths } from "@/chess-logic/models"
import { SelectedSquare } from "@/types/chess-board"
import { IoMdClose } from "react-icons/io"
import { StockFish } from "./stockfish"
import { clearComputerGameStorage } from "@/utils/computerGameStorage"
import { calculateMovementPixel, getApiBaseUrl, getChessSquareSize } from "@/utils/func"
import { parseOnlineGameResult } from "@/utils/onlineGameResult"
import GameOverPopup from "../ui/GameOverPopup"
import MoveList from "../multiplayer/gameinfo/move-list"
import { FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight, FaRedo, FaFlag } from "react-icons/fa"

let chessBoard = new ChessBoard()
const stockFish = new StockFish()

type BoardWithBOTProps = {
  gameId: string
  onRotateGameIdentity: () => void
}

const BoardWithBOT = ({ gameId, onRotateGameIdentity }: BoardWithBOTProps) => {
const [chessBoardView, setChessBoardView] = useState<(FENChar | null)[][]>(chessBoard.chessBoardView)
const [playerColor, setPlayerColor] = useState<Color>(chessBoard.playerColor)
const [selectedSquare, setSelectedSquare] = useState<SelectedSquare | any>({piece: null})
const [draggingOver, setDraggingOver] = useState<Coords|null>(null)
const [isDragging, setIsDragging] = useState<boolean>(false)
const [dragStartPosition, setDragStartPosition] = useState<Coords|null>(null)
const [pieceSafeSquares, setPieceSafeSquares] = useState<Coords[]>([])
const [lastMove, setLastMove] = useState<LastMove|undefined>(chessBoard.lastMove)
const [checkState, setCheckState] = useState<CheckState>(chessBoard.checkState)

const [isPromotionActive, setIsPromotionActive] = useState<boolean>(false)
const [promotionCoords, setPromotionCoords] = useState<Coords|null>(null)
const [promotedPiece, setPromotedPiece] = useState<FENChar|null>(null)

const [gameOver, setGameOver] = useState<boolean>(chessBoard.isGameOver)
const [gameHistoryPointer, setGameHistoryPointer] = useState<number>(0)
const [showGameOverPopup, setShowGameOverPopup] = useState<boolean>(false)
const [gameOverMessage, setGameOverMessage] = useState<string>("")
const [BoardMoveList, setBoardMoveList] = useState<any[]>([])
const [flipMode, setFlipMode] = useState<boolean>(false)
const [selectedPlayerColor, setSelectedPlayerColor] = useState<Color | null>(null)
const [selectedDifficulty, setSelectedDifficulty] = useState<number>(1)
const [showColorSelection, setShowColorSelection] = useState<boolean>(true)
const [showResignConfirm, setShowResignConfirm] = useState<boolean>(false)
const [bootstrapping, setBootstrapping] = useState<boolean>(true)
const completedReportedRef = useRef<boolean>(false)

useEffect(() => {
  let cancelled = false
  completedReportedRef.current = false
  setBootstrapping(true)

  void (async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/games/${encodeURIComponent(gameId)}/state`)
      const data = res.ok ? await res.json() : { moves: [], game: null }
      if (cancelled) {
        return
      }

      const moves = Array.isArray(data.moves) ? data.moves : []
      const game = data.game as
        | {
            matchType?: string
            status?: string
            computerSettings?: { humanColor?: string; engineLevel?: number }
          }
        | null
        | undefined

      chessBoard = new ChessBoard()
      let replayFailed = false
      try {
        for (const m of moves) {
          const prom = m.promotion ? (String(m.promotion).slice(0, 1) as FENChar) : null
          chessBoard.move(m.prevX, m.prevY, m.newX, m.newY, prom)
        }
      } catch (e) {
        console.error("Computer game restore failed", e)
        replayFailed = true
        chessBoard = new ChessBoard()
      }

      const isComputer =
        !replayFailed &&
        game &&
        game.matchType === "computer" &&
        game.computerSettings &&
        typeof game.computerSettings.humanColor === "string"

      if (isComputer) {
        const hc =
          game.computerSettings!.humanColor === "white" ? Color.White : Color.Black
        const lvlRaw = Number(game.computerSettings!.engineLevel)
        const lvl = Number.isFinite(lvlRaw) ? Math.min(6, Math.max(1, lvlRaw)) : 1
        setSelectedPlayerColor(hc)
        setSelectedDifficulty(lvl)
        stockFish.setComputerConfiguration({
          color: hc === Color.White ? Color.Black : Color.White,
          level: lvl,
        })
        setShowColorSelection(false)
        setFlipMode(hc === Color.Black)
        if (game.status === "completed") {
          completedReportedRef.current = true
        }
      } else {
        setSelectedPlayerColor(null)
        setSelectedDifficulty(1)
        setShowColorSelection(true)
        setFlipMode(false)
        stockFish.setComputerConfiguration({ color: Color.Black, level: 1 })
      }

      setChessBoardView(chessBoard.chessBoardView.map((row) => [...row]))
      setPlayerColor(chessBoard.playerColor)
      setLastMove(chessBoard.lastMove)
      setCheckState({ ...chessBoard.checkState })
      setGameOver(chessBoard.isGameOver)
      setGameHistoryPointer(Math.max(0, chessBoard.gameHistory.length - 1))
      setBoardMoveList([...chessBoard.moveList])
      setSelectedSquare({ piece: null })
      setPieceSafeSquares([])
      setDraggingOver(null)
      setIsDragging(false)
      setDragStartPosition(null)
      setIsPromotionActive(false)
      setPromotedPiece(null)
      setPromotionCoords(null)
      setShowResignConfirm(false)

      if (chessBoard.isGameOver) {
        setGameOverMessage(chessBoard.gameOverMessage || "Game Over")
        setShowGameOverPopup(true)
      } else {
        setGameOverMessage("")
        setShowGameOverPopup(false)
      }
    } finally {
      if (!cancelled) {
        setBootstrapping(false)
      }
    }
  })()

  return () => {
    cancelled = true
  }
}, [gameId])

// Configure Stockfish when player color and difficulty are selected
useEffect(() => {
  if (selectedPlayerColor !== null) {
    const computerColor = selectedPlayerColor === Color.White ? Color.Black : Color.White
    stockFish.setComputerConfiguration({ color: computerColor, level: selectedDifficulty })
    console.log(`Human plays as: ${selectedPlayerColor === Color.White ? 'White' : 'Black'}, Computer plays as: ${computerColor === Color.White ? 'White' : 'Black'}, Difficulty: Level ${selectedDifficulty}`)
  }
}, [selectedPlayerColor, selectedDifficulty])

// Listen to board state changes and trigger computer moves
useEffect(() => {
  let cancelled = false

  const handleBoardStateChange = async () => {
    if (
      cancelled ||
      bootstrapping ||
      chessBoard.isGameOver ||
      selectedPlayerColor === null ||
      gameOver
    ) {
      if (chessBoard.isGameOver || selectedPlayerColor === null || gameOver) {
        console.log("Game is over or color not selected - no computer move needed")
      }
      return
    }

    // Check if it's the computer's turn
    const currentPlayer = chessBoard.playerColor
    const computerColor = selectedPlayerColor === Color.White ? Color.Black : Color.White
    
    console.log(`Board state changed - Current player: ${currentPlayer === Color.White ? 'White' : 'Black'}`)
    console.log(`Game over: ${chessBoard.isGameOver}`)
    
    // Computer should only move if it's the computer's turn
    if (currentPlayer === computerColor) {
      console.log(`Computer's turn (${computerColor === Color.White ? 'White' : 'Black'}) - making move...`)
      console.log("FEN string:", chessBoard.boardAsFEN)
      
      try {
        if (cancelled) return
        const computer_move = await stockFish.getBestMove(chessBoard.boardAsFEN)
        if (cancelled) return
        console.log("Computer move:", computer_move)
        
        if(computer_move.promotedPiece){
          updateBoardWithPromotion(computer_move.prevX, computer_move.prevY, computer_move.newX, computer_move.newY, computer_move.promotedPiece)
        }else{
          updateBoard(computer_move.prevX, computer_move.prevY, computer_move.newX, computer_move.newY)
        }
      } catch (error) {
        console.error("Error getting computer move:", error)
      }
    } else {
      console.log(`Human's turn (${selectedPlayerColor === Color.White ? 'White' : 'Black'}) - waiting for human move`)
    }
  }

  void handleBoardStateChange()
  return () => {
    cancelled = true
  }
}, [chessBoardView, selectedPlayerColor, gameOver, bootstrapping])

useEffect(()=>{
 setPlayerColor(chessBoard.playerColor)
},[chessBoard.playerColor])

useEffect(()=>{
  setBoardMoveList(chessBoard.moveList)
  console.log(chessBoard.moveList)
},[chessBoardView])

useEffect(()=>{
 console.log("Game Over State Changed:", chessBoard.isGameOver)
 console.log("Game Over Message:", chessBoard.gameOverMessage)
 setGameOver(chessBoard.isGameOver)
 if(chessBoard.isGameOver) {
   setGameOverMessage(chessBoard.gameOverMessage || "Game Over")
   setShowGameOverPopup(true)
   console.log("Showing popup...")
 }
},[chessBoard.isGameOver])

// Keyboard navigation
useEffect(() => {
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      if (gameHistoryPointer === chessBoard.gameHistory.length - 1) return;
      setGameHistoryPointer(prev => prev + 1);
      showPreviousPosition(gameHistoryPointer + 1);
    } else if (event.key === "ArrowLeft") {
      if (gameHistoryPointer === 0) return;
      setGameHistoryPointer(prev => prev - 1);
      showPreviousPosition(gameHistoryPointer - 1);
    }
  };

  document.addEventListener("keyup", handleKeyPress);
  return () => document.removeEventListener("keyup", handleKeyPress);
}, [gameHistoryPointer, chessBoard.gameHistory.length])

useEffect(()=>{

 if(!promotionCoords || !selectedSquare.piece) return
    const {x: newX, y: newY} = promotionCoords
    const {x: prevX, y: prevY} = selectedSquare
    
    updateBoard(prevX, prevY, newX, newY)
},[promotedPiece])

function promotionPieces(): FENChar[] {
  const side = selectedPlayerColor ?? playerColor
  return side === Color.White
    ? [FENChar.WhiteQueen, FENChar.WhiteRook, FENChar.WhiteKnight, FENChar.WhiteBishop]
    : [FENChar.BlackQueen, FENChar.BlackRook, FENChar.BlackKnight, FENChar.BlackBishop]
}

function isDarkSquare(x: number, y: number): boolean{
  return ChessBoard.isSquareDark(x, y)
}

function isSquareSelected(x: number, y: number): boolean {
  if(!selectedSquare.piece) return false
  return selectedSquare.x === x && selectedSquare.y === y
}

function isSquareSafeForSelectedPiece(x: number, y: number): boolean {
  try{
    let safe = pieceSafeSquares.some((coords: any)=>coords.x === x && coords.y === y)
    return safe
  }catch{
    return false
  }
}

function isSquareLastMove(x: number, y: number): boolean {
  if(!lastMove) return false;
  const {prevX, prevY, currX, currY} = lastMove
  return x === prevX && y === prevY || x === currX && y === currY  
}

function isSquareChecked(x: number, y: number): boolean {
  return checkState.isInCheck && checkState.x === x && checkState.y === y
}

function isSquarepromotionSquare(x: number, y: number): boolean {
 if(!promotionCoords) return false
 return promotionCoords.x === x && promotionCoords.y === y
}

function unmarkSelectedPieceAndSafeSquares(){
  setSelectedSquare({ piece: null })
  setPieceSafeSquares([])
  setDraggingOver(null)
  setIsDragging(false)
  setDragStartPosition(null)

  if(isPromotionActive){
    setIsPromotionActive(false)
    setPromotedPiece(null)
    setPromotionCoords(null)
  }
}

async function placingPiece(newX: number, newY: number) {
  try{
    if (selectedPlayerColor !== null && chessBoard.playerColor !== selectedPlayerColor) {
      return
    }

    if(!selectedSquare.piece) return
    if(!isSquareSafeForSelectedPiece(newX, newY)){
      unmarkSelectedPieceAndSafeSquares()
      setDraggingOver(null)
      return
    }

    // pawn promotion
    const isPawnSelected: boolean = selectedSquare.piece === FENChar.WhitePawn || selectedSquare.piece === FENChar.BlackPawn
    const isPawnOnlastRank: boolean = isPawnSelected && (newX === 7 || newX === 0)
    const shouldOpenPromotionDialog: boolean = !isPromotionActive && isPawnOnlastRank;

    if(shouldOpenPromotionDialog){
      setPieceSafeSquares([])
      setIsPromotionActive(true)
      setPromotionCoords({x: newX, y: newY})
      return
    }

    const { x: prevX, y: prevY } = selectedSquare
    updateBoard(prevX, prevY, newX, newY)
  } catch {
    /* invalid placement */
  }
}


function isWrongPieceSelected(piece: FENChar): boolean {
  if (selectedPlayerColor === null) return true
  const isWhitePiece: boolean = piece === piece.toUpperCase()
  return (
    (isWhitePiece && selectedPlayerColor === Color.Black) ||
    (!isWhitePiece && selectedPlayerColor === Color.White)
  )
}

function selectingPiece(x: number, y: number): void {
  if(gameOver) return
  if (selectedPlayerColor !== null && chessBoard.playerColor !== selectedPlayerColor) {
    return
  }
  const piece: FENChar | null = chessBoardView[x][y]
  if(!piece) return;

  if (isWrongPieceSelected(piece)) {
    return
  }

  if(selectedSquare.piece && selectedSquare.x === x && selectedSquare.y === y) {
    unmarkSelectedPieceAndSafeSquares()
    return
  }

  setSelectedSquare({piece, x, y})
  setPieceSafeSquares(chessBoard.safeSquares.get(x + "," + y) || [])
}

function queuePersistAfterMove(
  moverColor: Color,
  prevX: number,
  prevY: number,
  newX: number,
  newY: number,
  prom: FENChar | null
): void {
  const mc = moverColor === Color.White ? "white" : "black"
  void fetch(`${getApiBaseUrl()}/games/${encodeURIComponent(gameId)}/computer/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      movedByColor: mc,
      prevX,
      prevY,
      newX,
      newY,
      promotion: prom,
      fenAfter: chessBoard.boardAsFEN,
    }),
  })
    .then(async (moveRes) => {
      if (!moveRes.ok) {
        console.error("Computer move persist failed", moveRes.status)
        return
      }
      if (!chessBoard.isGameOver || completedReportedRef.current) {
        return
      }
      const parsed = parseOnlineGameResult(chessBoard.gameOverMessage)
      if (!parsed) {
        console.warn("Game over but could not map result; skipping DB finalize")
        return
      }
      completedReportedRef.current = true
      const completeRes = await fetch(
        `${getApiBaseUrl()}/games/${encodeURIComponent(gameId)}/computer/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result: parsed.result, reason: parsed.reason }),
        }
      )
      if (!completeRes.ok) {
        completedReportedRef.current = false
        console.error("Computer game finalize failed", completeRes.status)
        return
      }
      clearComputerGameStorage()
    })
    .catch((e) => {
      console.error("Computer game persist", e)
    })
}

function updateBoard(prevX: number, prevY: number, newX: number, newY: number): void {
  const moverColor = chessBoard.playerColor
  const prom = promotedPiece
  console.log(prevX, prevY)

  // If we're in a drag operation, don't animate
  if (isDragging) {
    chessBoard.move(prevX, prevY, newX, newY, prom)
    setChessBoardView(chessBoard.chessBoardView)
    setCheckState(chessBoard.checkState)
    setLastMove(chessBoard.lastMove)
    setGameOver(chessBoard.isGameOver)
    setGameHistoryPointer(chessBoard.gameHistory.length - 1)
    unmarkSelectedPieceAndSafeSquares()
    queuePersistAfterMove(moverColor, prevX, prevY, newX, newY, prom)
    return
  }

  // Only animate for click-to-move
  const { left, top } = calculateMovementPixel(
    prevX,
    prevY,
    newX,
    newY,
    getChessSquareSize()
  )

  const piece_img: HTMLElement | null = document
    .getElementById(`box-${prevX}${prevY}`)
    ?.querySelector(".piece_img") as HTMLElement | null
  if (piece_img) {
    piece_img.style.transform = `translate(${left}px, ${top}px)`
  }

  unmarkSelectedPieceAndSafeSquares()

  setTimeout(() => {
    chessBoard.move(prevX, prevY, newX, newY, prom)
    setChessBoardView(chessBoard.chessBoardView)
    setCheckState(chessBoard.checkState)
    setLastMove(chessBoard.lastMove)
    setGameOver(chessBoard.isGameOver)
    setGameHistoryPointer(chessBoard.gameHistory.length - 1)
    queuePersistAfterMove(moverColor, prevX, prevY, newX, newY, prom)
  }, 200)
}

function updateBoardWithPromotion(prevX: number, prevY: number, newX: number, newY: number, piece: FENChar): void {
  try {
    const moverColor = chessBoard.playerColor
    chessBoard.move(prevX, prevY, newX, newY, piece)
    setChessBoardView(chessBoard.chessBoardView)
    setCheckState(chessBoard.checkState)
    setLastMove(chessBoard.lastMove)
    setGameOver(chessBoard.isGameOver)
    unmarkSelectedPieceAndSafeSquares()
    queuePersistAfterMove(moverColor, prevX, prevY, newX, newY, piece)
  } catch (e) {
    console.error(e)
  }
}

function ClosePromotionDialog(): void {
  unmarkSelectedPieceAndSafeSquares()
}

function move(x: number, y: number){
  try{
   selectingPiece(x, y)
   placingPiece(x, y)
  } catch (e) {
    console.log(e)
  }
}

// Drag and drop handlers
function handleDragStart(e: React.DragEvent, x: number, y: number) {
  if(gameOver) {
    e.preventDefault()
    return
  }
  if (selectedPlayerColor !== null && chessBoard.playerColor !== selectedPlayerColor) {
    e.preventDefault()
    return
  }

  const piece: FENChar | null = chessBoardView[x][y]
  if(!piece || isWrongPieceSelected(piece)) {
    e.preventDefault()
    return
  }

  setIsDragging(true)
  setDragStartPosition({x, y})
  setSelectedSquare({piece, x, y})
  setPieceSafeSquares(chessBoard.safeSquares.get(x + "," + y) || [])
  
  // Disable transitions during drag
  const chessboard = document.querySelector('.chessboard')
  if (chessboard) {
    chessboard.classList.add('dragging-active')
  }
  
  // Create a simple, clean drag image
  const dragImage = document.createElement('div')
  const sz = getChessSquareSize()
  const imgSize = Math.round(Math.max(32, sz * 0.8))
  const half = Math.round(imgSize / 2)
  dragImage.innerHTML = `<img src="${pieceImagePaths[piece]}" style="width: ${imgSize}px; height: ${imgSize}px; border: none; outline: none;" />`
  dragImage.style.position = "absolute"
  dragImage.style.top = "-1000px"
  dragImage.style.left = "-1000px"
  dragImage.style.pointerEvents = "none"
  dragImage.style.zIndex = "9999"
  dragImage.style.width = `${imgSize}px`
  dragImage.style.height = `${imgSize}px`
  document.body.appendChild(dragImage)
  e.dataTransfer.setDragImage(dragImage, half, half)
  
  // Clean up drag image after a short delay
  setTimeout(() => {
    if(document.body.contains(dragImage)) {
      document.body.removeChild(dragImage)
    }
  }, 0)
}

function handleDragOver(e: React.DragEvent) {
  e.preventDefault()
  e.dataTransfer.dropEffect = "move"
}

function handleDragEnter(e: React.DragEvent, x: number, y: number) {
  e.preventDefault()
  if(isDragging && dragStartPosition) {
    setDraggingOver({x, y})
  }
}

function handleDragLeave(e: React.DragEvent) {
  // Only clear if we're leaving the board entirely
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX
  const y = e.clientY
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    setDraggingOver(null)
  }
}

function handleDrop(e: React.DragEvent, x: number, y: number) {
  e.preventDefault()
  
  if(!isDragging || !dragStartPosition) return
  
  const {x: startX, y: startY} = dragStartPosition
  
  // If dropping on the same square, just cancel
  if(startX === x && startY === y) {
    unmarkSelectedPieceAndSafeSquares()
    return
  }
  
  // Check if the drop is on a valid square
  const pieceSafeSquares = chessBoard.safeSquares.get(startX + "," + startY) || []
  const isValidMove = pieceSafeSquares.some(coords => coords.x === x && coords.y === y)
  
  if(isValidMove) {
    placingPiece(x, y)
    // Re-enable transitions after successful drop
    setTimeout(() => {
      const chessboard = document.querySelector('.chessboard')
      if (chessboard) {
        chessboard.classList.remove('dragging-active')
      }
    }, 50)
  } else {
    unmarkSelectedPieceAndSafeSquares()
  }
}

function handleDragEnd() {
  setIsDragging(false)
  setDragStartPosition(null)
  setDraggingOver(null)
  
  // Re-enable transitions after drag
  const chessboard = document.querySelector('.chessboard')
  if (chessboard) {
    chessboard.classList.remove('dragging-active')
  }
}

function isDraggingOver(x: number, y: number): boolean {
  if(!draggingOver) return false
  return draggingOver.x === x && draggingOver.y === y
}

function showPreviousPosition(moveIndex: number): void {
  const { board, checkState, lastMove } = chessBoard.gameHistory[moveIndex];
  setChessBoardView(board);
  setCheckState(checkState);
  setLastMove(lastMove);
  setGameHistoryPointer(moveIndex);
}

function handleCloseGameOverPopup(): void {
  setShowGameOverPopup(false);
}

function handleOpenResignConfirm(): void {
  if (gameOver || selectedPlayerColor === null || showColorSelection) return
  setShowResignConfirm(true)
}

function handleCancelResign(): void {
  setShowResignConfirm(false)
}

function handleConfirmResign(): void {
  if (selectedPlayerColor === null) return
  const humanLabel = selectedPlayerColor === Color.White ? "White" : "Black"
  setShowResignConfirm(false)
  setGameOver(true)
  setGameOverMessage(
    `You resigned. ${humanLabel} lost — the computer wins.`
  )
  setShowGameOverPopup(true)
  const result = selectedPlayerColor === Color.White ? "black_win" : "white_win"
  if (!completedReportedRef.current) {
    completedReportedRef.current = true
    void fetch(`${getApiBaseUrl()}/games/${encodeURIComponent(gameId)}/computer/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result, reason: "resign" }),
    })
      .then((res) => {
        if (!res.ok) {
          completedReportedRef.current = false
          console.error("Resign finalize failed", res.status)
          return
        }
        clearComputerGameStorage()
      })
      .catch(() => {
        completedReportedRef.current = false
      })
  }
}

function handleNewGame(): void {
  onRotateGameIdentity()
}

function flipBoard(): void {
  setFlipMode(!flipMode);
}

async function handleColorSelection(color: Color): Promise<void> {
  const humanColor = color === Color.White ? "white" : "black"
  try {
    await fetch(`${getApiBaseUrl()}/games/${encodeURIComponent(gameId)}/computer/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ humanColor, engineLevel: selectedDifficulty }),
    })
  } catch (e) {
    console.error("Failed to save computer session", e)
  }
  completedReportedRef.current = false
  setSelectedPlayerColor(color)
  setShowColorSelection(false)
  setShowGameOverPopup(false)
  setShowResignConfirm(false)
  setFlipMode(color === Color.Black)
  chessBoard = new ChessBoard()
  setChessBoardView(chessBoard.chessBoardView.map((row) => [...row]))
  setPlayerColor(chessBoard.playerColor)
  setLastMove(chessBoard.lastMove)
  setCheckState({ ...chessBoard.checkState })
  setGameOver(chessBoard.isGameOver)
  setGameHistoryPointer(0)
  setBoardMoveList([...chessBoard.moveList])
  unmarkSelectedPieceAndSafeSquares()
}

const selectedLevelLabel = `Level ${selectedDifficulty}`
const playerColorLabel =
  selectedPlayerColor === null ? "Not selected" : selectedPlayerColor === Color.White ? "White" : "Black"
const computerColorLabel =
  selectedPlayerColor === null ? "Not selected" : selectedPlayerColor === Color.White ? "Black" : "White"

let turnStatusLabel = "Choose your color to start"
if (selectedPlayerColor !== null && !gameOver) {
  const isPlayersTurn = chessBoard.playerColor === selectedPlayerColor
  turnStatusLabel = isPlayersTurn ? "Your move now" : "Bot is thinking..."
} else if (gameOver) {
  turnStatusLabel = "Game over"
}

if (bootstrapping) {
  return (
    <div className="board_page computer-boot-loading">
      <p className="computer-boot-loading__text">Loading saved game…</p>
    </div>
  )
}

return(
<>
<GameOverPopup 
  isOpen={showGameOverPopup}
  message={gameOverMessage}
  onClose={handleCloseGameOverPopup}
  onNewGame={handleNewGame}
/>

{showResignConfirm && (
  <div
    className="resign-confirm-overlay"
    role="presentation"
    onClick={handleCancelResign}
  >
    <div
      className="resign-confirm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resign-confirm-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="resign-confirm-dialog__header">
        <div className="resign-confirm-dialog__icon" aria-hidden>
          <FaFlag />
        </div>
        <h2 id="resign-confirm-title" className="resign-confirm-dialog__title">
          Resign this game?
        </h2>
      </div>
      <p className="resign-confirm-dialog__body">
        You will lose the game. The computer will be declared the winner.
      </p>
      <div className="resign-confirm-dialog__actions">
        <button
          type="button"
          className="resign-confirm-dialog__btn resign-confirm-dialog__btn--ghost"
          onClick={handleCancelResign}
        >
          Keep playing
        </button>
        <button
          type="button"
          className="resign-confirm-dialog__btn resign-confirm-dialog__btn--danger"
          onClick={handleConfirmResign}
        >
          Resign
        </button>
      </div>
    </div>
  </div>
)}

{showColorSelection && (
  <div className="color-selection-overlay">
    <div className="color-selection-popup">
      <h2>Choose Your Color & Difficulty</h2>
      
      <div className="difficulty-selection">
        <h3>Difficulty Level</h3>
        <div className="difficulty-levels">
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <button
              key={level}
              className={`difficulty-level ${selectedDifficulty === level ? 'selected' : ''}`}
              onClick={() => setSelectedDifficulty(level)}
            >
              Level {level}
            </button>
          ))}
        </div>
      </div>

      <div className="color-options">
        <button 
          className="color-option white-option"
          onClick={() => handleColorSelection(Color.White)}
        >
          <div className="piece-preview">
            <img src={pieceImagePaths[FENChar.WhiteKing]} alt="White King" />
          </div>
          <span>Play as White</span>
        </button>
        <button 
          className="color-option black-option"
          onClick={() => handleColorSelection(Color.Black)}
        >
          <div className="piece-preview">
            <img src={pieceImagePaths[FENChar.BlackKing]} alt="Black King" />
          </div>
          <span>Play as Black</span>
        </button>
      </div>
    </div>
  </div>
)}

<div className="game_wraper">

<div className="board-container">
<div className={`chessboard ${flipMode ? 'rotated' : ''}`}>

  {chessBoardView.map((row, x) => (
    row.map((piece, y) => (
    <div className={`
      chessboard_box ${isDarkSquare(x, y)?"dark":"white"} ${isSquareSelected(x, y)?"selected":""}
      ${isSquareLastMove(x,y)?"last-move":""} 
      ${isSquareChecked(x,y)?"king-in-check":""}
      ${isSquarepromotionSquare(x, y)?"promotion-square":""}
      ${isDraggingOver(x, y)?"dragging-over":""}
      ${isDragging && dragStartPosition && dragStartPosition.x === x && dragStartPosition.y === y ? "drag-source": ""}
    `}
     key={`${x},${y}`}
     onClick={()=>{
      move(x,y)
     }}
     onDragOver={handleDragOver}
     onDragEnter={(e) => handleDragEnter(e, x, y)}
     onDragLeave={handleDragLeave}
     onDrop={(e) => handleDrop(e, x, y)}
     id={`box-${x}${y}`}
    >
      {piece!==null?
        <img src={pieceImagePaths[piece]} alt={pieceImagePaths[piece]} 
         className={`piece_img ${selectedSquare.x === x && selectedSquare.y === y?'dragging':''} ${isDragging && dragStartPosition && dragStartPosition.x === x && dragStartPosition.y === y ? 'being-dragged': ''}`}
         draggable={piece&& !isWrongPieceSelected(piece) && !gameOver?true:false}
         onDragStart={(e) => handleDragStart(e, x, y)}
         onDragEnd={handleDragEnd}
        />
      :null}

      <div className={isSquareSafeForSelectedPiece(x, y)?"safe-box":""}></div>

      {isPromotionActive && promotionCoords && x === promotionCoords.x && y===promotionCoords.y?
       <div className="promotion_popup">
        {promotionPieces().map(piece=>{
          return (
          <div className="promotion_piece_box" key={piece}
           onClick={()=>setPromotedPiece(piece)}
          >
           <img src={pieceImagePaths[piece]} alt={piece}/>
          </div>
          )
        })}

        <div className="promotion_popup_close"
         onClick={ClosePromotionDialog}
        >
          <IoMdClose/>
        </div>
       </div>:null
      }
    </div>
    ))
  )).reverse()}

</div>

</div>

<div className="gameinfo_wraper gameinfo_wraper--bot">
  <div className="gameinfo gameinfo--bot">
    <div className="gameinfo_opponent gameinfo_opponent--bot">
      <div className="bot-status-header">
        <span className="bot-status-header__badge">{turnStatusLabel}</span>
        <span className="bot-status-header__meta">
          You: {playerColorLabel} | Bot: {computerColorLabel} | {selectedLevelLabel}
        </span>
      </div>
    </div>
    <div className="gameinfo_movelist_wraper">
      <div className="gameinfo_movelist gameinfo_movelist--bot">
        {BoardMoveList.map((move, index)=>{
          return(
            <MoveList 
              key={index} 
              fullmove_number={index + 1} 
              first_move={move[0]} 
              second_move={move[1]} 
              light={true}
              gameHistoryPointer={gameHistoryPointer}
              onMoveClick={showPreviousPosition}
            />
          )
        })}
      </div>
    </div>
        <div className="gameinfo_action gameinfo_action--bot">
          <div className="gameinfo_action__nav-cluster">
            <button 
              disabled={gameHistoryPointer === 0}
              onClick={() => showPreviousPosition(0)}
              title="Go to first move"
            >
              <FaAngleDoubleLeft/>
            </button>
            <button 
              disabled={gameHistoryPointer === 0}
              onClick={() => showPreviousPosition(gameHistoryPointer - 1)}
              title="Previous move"
            >
              <FaAngleLeft/>
            </button>
            <button 
              disabled={gameHistoryPointer === chessBoard.gameHistory.length - 1}
              onClick={() => showPreviousPosition(gameHistoryPointer + 1)}
              title="Next move"
            >
              <FaAngleRight/>
            </button>
            <button 
              disabled={gameHistoryPointer === chessBoard.gameHistory.length - 1}
              onClick={() => showPreviousPosition(chessBoard.gameHistory.length - 1)}
              title="Go to last move"
            >
              <FaAngleDoubleRight/>
            </button>
            <button 
              onClick={flipBoard}
              title="Flip Board"
              className="flip-board-icon"
            >
              <FaRedo/>
            </button>
          </div>
          <button
            type="button"
            className="gameinfo_action__resign"
            disabled={gameOver || showColorSelection || selectedPlayerColor === null}
            onClick={handleOpenResignConfirm}
            title="Resign — you lose, computer wins"
          >
            <FaFlag className="gameinfo_action__resign-icon" aria-hidden />
            <span className="gameinfo_action__resign-label">Resign</span>
          </button>
        </div>
  </div>
</div>
</div>
</>
)
}

export default BoardWithBOT