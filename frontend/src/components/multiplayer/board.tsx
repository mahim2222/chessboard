import { type FormEvent, useEffect, useRef, useState } from "react"
import { ChessBoard } from "@/chess-logic/chess-board"
import { CheckState, Color, Coords, FENChar, LastMove, pieceImagePaths } from "@/chess-logic/models"
import { SelectedSquare } from "@/types/chess-board"
import type {
  ChatMessage,
  GameOverReport,
  PersistedMove,
  RemoteMovePayload,
  RemoteResignPayload,
} from "@/types/match"
import { parseOnlineGameResult } from "@/utils/onlineGameResult"
import { IoMdClose } from "react-icons/io"
import { calculateMovementPixel, getChessSquareSize } from "@/utils/func"
import MoveList from "./gameinfo/move-list"
import {
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaFlag,
} from "react-icons/fa"
import GameOverPopup from "../ui/GameOverPopup";

const chessBoard = new ChessBoard()

type BoardWithOnlinePlayerProps = {
  playAs?: Color
  /** Moves from MongoDB to replay after refresh (empty for a new game). */
  restoreMoves: PersistedMove[]
  onLocalMove?: (m: RemoteMovePayload) => void
  remoteMove?: RemoteMovePayload | null
  onRemoteMoveConsumed?: () => void
  remoteResign?: RemoteResignPayload | null
  onRemoteResignConsumed?: () => void
  onSendResign?: () => void
  /** Friend online games — report outcome for MongoDB. */
  onGameResult?: (report: GameOverReport) => void
  restoreChatMessages: ChatMessage[]
  remoteChatMessage?: ChatMessage | null
  onRemoteChatConsumed?: () => void
  onSendChatMessage?: (text: string) => void
  myPlayerId?: string
}

const BoardWithOnlinePlayer = ({
  playAs,
  restoreMoves,
  onLocalMove,
  remoteMove,
  onRemoteMoveConsumed,
  remoteResign,
  onRemoteResignConsumed,
  onSendResign,
  onGameResult,
  restoreChatMessages,
  remoteChatMessage,
  onRemoteChatConsumed,
  onSendChatMessage,
  myPlayerId,
}: BoardWithOnlinePlayerProps) => {
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

const [BoardMoveList, setBoardMoveList] = useState<any[]>([])
const [gameHistoryPointer, setGameHistoryPointer] = useState<number>(0)

const [gameOver, setGameOver] = useState<boolean>(chessBoard.isGameOver)
const [showGameOverPopup, setShowGameOverPopup] = useState<boolean>(false)
const [gameOverMessage, setGameOverMessage] = useState<string>("")
const reportedGameOverRef = useRef(false)
const [chatMessages, setChatMessages] = useState<ChatMessage[]>(restoreChatMessages)
const [chatText, setChatText] = useState<string>("")
const chatListRef = useRef<HTMLDivElement | null>(null)
const [showResignConfirm, setShowResignConfirm] = useState<boolean>(false)

// update board
useEffect(()=>{
  async function getBoardPosition(){
    // let last_move = {
    //   piece: new Pawn(Color.Black, true),
    //   prevX: 6,
    //   prevY: 4,
    //   currX: 4,
    //   currY: 4
    // }
    // chessBoard.lastMove = last_move
    // setLastMove(last_move)
    // console.log(chessBoard.checkState)
    // chessBoard.updateBoardPosition("rnbqkbnr/ppp1pppp/8/1B1p4/8/4P3/PPPP1PPP/RNBQK1NR b KQkq - 1 2")
    // setChessBoardView(chessBoard.chessBoardView)
  }

  // getBoardPosition()

},[])

useEffect(()=>{
  setBoardMoveList(chessBoard.moveList)
  console.log(chessBoard.moveList)
},[chessBoardView])

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
 setPlayerColor(chessBoard.playerColor)
},[chessBoard.playerColor])

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

useEffect(() => {
  chessBoard.resetToInitialPosition()
  try {
    for (const m of restoreMoves) {
      const prom = m.promotion ? (String(m.promotion).slice(0, 1) as FENChar) : null
      chessBoard.move(m.prevX, m.prevY, m.newX, m.newY, prom)
    }
  } catch (e) {
    console.error("Restore moves failed", e)
  }
  setChessBoardView(chessBoard.chessBoardView.map((row) => [...row]))
  setPlayerColor(chessBoard.playerColor)
  setLastMove(chessBoard.lastMove)
  setCheckState({ ...chessBoard.checkState })
  setGameOver(chessBoard.isGameOver)
  setGameOverMessage(chessBoard.gameOverMessage ?? "")
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
  reportedGameOverRef.current = chessBoard.isGameOver
  if (chessBoard.isGameOver) {
    setShowGameOverPopup(true)
  } else {
    setShowGameOverPopup(false)
  }
// eslint-disable-next-line react-hooks/exhaustive-deps -- full sync after persisted plies
}, [restoreMoves])

useEffect(() => {
  if (!gameOver || !onGameResult) {
    return
  }
  if (reportedGameOverRef.current) {
    return
  }
  const parsed = parseOnlineGameResult(chessBoard.gameOverMessage)
  if (!parsed) {
    return
  }
  reportedGameOverRef.current = true
  onGameResult(parsed)
}, [gameOver, onGameResult, chessBoard.gameOverMessage])

useEffect(() => {
  setChatMessages(restoreChatMessages)
}, [restoreChatMessages])

useEffect(() => {
  if (!remoteChatMessage) {
    return
  }
  setChatMessages((prev) => [...prev, remoteChatMessage])
  onRemoteChatConsumed?.()
}, [remoteChatMessage, onRemoteChatConsumed])

useEffect(() => {
  if (!chatListRef.current) {
    return
  }
  chatListRef.current.scrollTop = chatListRef.current.scrollHeight
}, [chatMessages])

useEffect(() => {
  if (!remoteMove) {
    return
  }
  const { prevX, prevY, newX, newY, promotion } = remoteMove
  try {
    chessBoard.move(prevX, prevY, newX, newY, promotion)
    setChessBoardView(chessBoard.chessBoardView)
    setCheckState(chessBoard.checkState)
    setLastMove(chessBoard.lastMove)
    setGameOver(chessBoard.isGameOver)
    setGameHistoryPointer(chessBoard.gameHistory.length - 1)
    setPlayerColor(chessBoard.playerColor)
    setSelectedSquare({ piece: null })
    setPieceSafeSquares([])
    setDraggingOver(null)
    setIsDragging(false)
    setDragStartPosition(null)
    setIsPromotionActive(false)
    setPromotedPiece(null)
    setPromotionCoords(null)
  } catch (e) {
    console.error("Remote move failed", e)
  }
  onRemoteMoveConsumed?.()
// eslint-disable-next-line react-hooks/exhaustive-deps -- one remote payload per network message
}, [remoteMove])

useEffect(() => {
  if (!remoteResign || playAs === undefined) {
    return
  }
  const iResigned =
    !!myPlayerId && remoteResign.resignedBy === myPlayerId
  const myColor = playAs === Color.White ? "White" : "Black"
  const winnerColor = remoteResign.result === "white_win" ? "White" : "Black"
  const msg = iResigned
    ? `You resigned. ${myColor} lost — ${winnerColor} wins.`
    : `Your opponent resigned. ${myColor} wins.`
  reportedGameOverRef.current = true
  setGameOver(true)
  setGameOverMessage(msg)
  setShowGameOverPopup(true)
  onRemoteResignConsumed?.()
// eslint-disable-next-line react-hooks/exhaustive-deps -- one payload per resign_broadcast
}, [remoteResign])

useEffect(()=>{

 if(!promotionCoords || !selectedSquare.piece) return
    const {x: newX, y: newY} = promotionCoords
    const {x: prevX, y: prevY} = selectedSquare
    
    updateBoard(prevX, prevY, newX, newY)
},[promotedPiece])


function promotionPieces(): FENChar[] {
  return playerColor === Color.White ? 
    [FENChar.WhiteQueen, FENChar.WhiteRook, FENChar.WhiteKnight, FENChar.WhiteBishop] :
    [FENChar.BlackQueen, FENChar.BlackRook, FENChar.BlackKnight, FENChar.BlackBishop]
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

function placingPiece(newX: number, newY: number): void {
  if (playAs !== undefined && chessBoard.playerColor !== playAs) {
    return
  }
  if(!selectedSquare.piece) return
  if(!isSquareSafeForSelectedPiece(newX, newY)) return

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
  setDraggingOver(null)
}

function isWrongPieceSelected(piece: FENChar): boolean {
  const isWhitePieceSelected: boolean = piece === piece.toUpperCase();
  return isWhitePieceSelected && playerColor === Color.Black || !isWhitePieceSelected && playerColor === Color.White
}

function selectingPiece(x: number, y: number): void {
  if(gameOver) return
  if (playAs !== undefined && chessBoard.playerColor !== playAs) {
    return
  }
  const piece: FENChar | null = chessBoardView[x][y]
  if(!piece) return;

  if(isWrongPieceSelected(piece)) return

  if(selectedSquare.piece && selectedSquare.x === x && selectedSquare.y === y) {
    unmarkSelectedPieceAndSafeSquares()
    return
  }

  setSelectedSquare({piece, x, y})
  setPieceSafeSquares(chessBoard.safeSquares.get(x + "," + y) || [])
}

// function updateBoard(prevX: number, prevY: number, newX: number, newY: number): void {
//   try{
//     chessBoard.move(prevX, prevY, newX, newY, promotedPiece)
//     setChessBoardView(chessBoard.chessBoardView)
//     setCheckState(chessBoard.checkState)
//     setLastMove(chessBoard.lastMove)
//     unmarkSelectedPieceAndSafeSquares()
//     setDraggingOver(null)
//   }catch(err){}
// }

function updateBoard(prevX: number, prevY: number, newX: number, newY: number): void {
  const prom: FENChar | null = promotedPiece

  const applyStateAfterMove = (): void => {
    setChessBoardView(chessBoard.chessBoardView)
    setCheckState(chessBoard.checkState)
    setLastMove(chessBoard.lastMove)
    setGameOver(chessBoard.isGameOver)
    setPlayerColor(chessBoard.playerColor)
    setGameHistoryPointer(chessBoard.gameHistory.length - 1)
  }

  const emitLocal = (): void => {
    onLocalMove?.({
      prevX,
      prevY,
      newX,
      newY,
      promotion: prom,
      fenAfter: chessBoard.boardAsFEN,
    })
  }

  // If we're in a drag operation, don't animate
  if (isDragging) {
    chessBoard.move(prevX, prevY, newX, newY, prom)
    applyStateAfterMove()
    unmarkSelectedPieceAndSafeSquares()
    emitLocal()
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
 
  const piece_img: HTMLElement | null = document.getElementById(`box-${prevX}${prevY}`)?.querySelector('.piece_img') as HTMLElement | null
  if(piece_img){
    piece_img.style.transform = `translate(${left}px, ${top}px)`;
  }

  unmarkSelectedPieceAndSafeSquares()

  setTimeout(()=>{
    chessBoard.move(prevX, prevY, newX, newY, prom)
    applyStateAfterMove()
    emitLocal()
  },200)
}

function ClosePromotionDialog(): void {
  unmarkSelectedPieceAndSafeSquares()
}

function move(x: number, y: number){
  try{
   selectingPiece(x, y)
   placingPiece(x, y)
  }catch(err){console.log(err)}
}

// Drag and drop handlers
function handleDragStart(e: React.DragEvent, x: number, y: number) {
  if(gameOver) {
    e.preventDefault()
    return
  }
  if (playAs !== undefined && chessBoard.playerColor !== playAs) {
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
  const sz = getChessSquareSize()
  const imgSize = Math.round(Math.max(32, sz * 0.8))
  const half = Math.round(imgSize / 2)
  const dragImage = document.createElement("div")
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
  if (gameOver || !onSendResign) return
  setShowResignConfirm(true)
}

function handleCancelResign(): void {
  setShowResignConfirm(false)
}

function handleConfirmResign(): void {
  setShowResignConfirm(false)
  onSendResign?.()
}

function handleNewGame(): void {
  // Reload the page to start a new game
  window.location.reload();
}

function handleSendChatMessage(e: FormEvent<HTMLFormElement>): void {
  e.preventDefault()
  const text = chatText.trim()
  if (!text) {
    return
  }
  onSendChatMessage?.(text)
  setChatText("")
}

// function grabPiece(e: any){
//  const element = e.target as HTMLElement
//  if(element.classList.contains('piece_img')){
//   element.style.position = "absolute"
//   element.style.left = `${e.clientX}px` 
//   element.style.top = `${e.clientY}px`
//  }
// }


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
      aria-labelledby="online-resign-confirm-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="resign-confirm-dialog__header">
        <div className="resign-confirm-dialog__icon" aria-hidden>
          <FaFlag />
        </div>
        <h2 id="online-resign-confirm-title" className="resign-confirm-dialog__title">
          Resign this game?
        </h2>
      </div>
      <p className="resign-confirm-dialog__body">
        You will lose the game. Your opponent will win.
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

<div className="game_wraper">

{gameOver ? (
  <div className="game-over-debug-message">{chessBoard.gameOverMessage}</div>
) : null}

{playAs !== undefined && (
  <div className="online-turn-strip" role="status" aria-live="polite">
    <span>
      You play as <strong>{playAs === Color.White ? "White" : "Black"}</strong>
    </span>
    <span>
      {chessBoard.playerColor === Color.White ? "White" : "Black"} to move
      {chessBoard.playerColor === playAs ? " — your turn" : " — opponent’s turn"}
    </span>
  </div>
)}

<div className="board-container">
<div className={`chessboard ${playAs === Color.Black ? "rotated" : ""}`}>

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
      {/* {x},{y} */}
    </div>
    ))
  )).reverse()}

</div>
</div>

<div className="gameinfo_wraper">
  <div className="gameinfo gameinfo--with-chat">
    <div className="gameinfo_opponent gameinfo_opponent--chat">
      <span>Game chat</span>
      <span>{playAs === Color.White ? "You: White" : "You: Black"}</span>
    </div>
    <div className="gameinfo_movelist_wraper">
      <div className="gameinfo_movelist">
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
    <div className="game-chat">
      <div className="game-chat__messages" ref={chatListRef}>
        {chatMessages.length === 0 ? (
          <p className="game-chat__empty">No messages yet.</p>
        ) : (
          chatMessages.map((msg, idx) => {
            const mine = !!myPlayerId && msg.senderPlayerId === myPlayerId
            return (
              <div
                key={`${msg.createdAt}-${msg.senderPlayerId}-${idx}`}
                className={`game-chat__item ${mine ? "game-chat__item--mine" : ""}`}
              >
                <div className="game-chat__meta">{mine ? "You" : msg.senderName}</div>
                <div className="game-chat__text">{msg.text}</div>
              </div>
            )
          })
        )}
      </div>
      <form className="game-chat__composer" onSubmit={handleSendChatMessage}>
        <input
          type="text"
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          maxLength={500}
          placeholder="Type a message..."
        />
        <button type="submit" disabled={!chatText.trim()}>
          Send
        </button>
      </form>
    </div>
    <div className="gameinfo_action gameinfo_action--with-resign">
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
      </div>
      {onSendResign ? (
        <button
          type="button"
          className="gameinfo_action__resign"
          disabled={gameOver}
          onClick={handleOpenResignConfirm}
          title="Resign — you lose, opponent wins"
        >
          <FaFlag className="gameinfo_action__resign-icon" aria-hidden />
          <span className="gameinfo_action__resign-label">Resign</span>
        </button>
      ) : null}
    </div>
  </div>
</div>

</div>
</>
)
}

export default BoardWithOnlinePlayer