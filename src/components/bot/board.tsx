import { useEffect, useState } from "react"
import { ChessBoard } from "@/chess-logic/chess-board"
import { CheckState, Color, Coords, FENChar, LastMove, pieceImagePaths, SafeSquares } from "@/chess-logic/models"
import { SelectedSquare } from "@/types/chess-board"
import { IoMdClose } from "react-icons/io"
import { StockFish } from "./stockfish"
import { calculateMovementPixel } from "@/utils/func"
import GameOverPopup from "../ui/GameOverPopup"
import MoveList from "../multiplayer/gameinfo/move-list"
import { FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight, FaRedo } from "react-icons/fa"

let chessBoard = new ChessBoard()
const stockFish = new StockFish()

const BoardWithBOT=()=>{
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
  const handleBoardStateChange = async () => {
    if (chessBoard.isGameOver || selectedPlayerColor === null) {
      console.log("Game is over or color not selected - no computer move needed")
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
        let computer_move = await stockFish.getBestMove(chessBoard.boardAsFEN)
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

  // Trigger computer move check when board view changes
  handleBoardStateChange()
}, [chessBoardView, selectedPlayerColor])

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

async function placingPiece(newX: number, newY: number) {
  try{

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
  }catch(err){}
}


function isWrongPieceSelected(piece: FENChar): boolean {
  if (selectedPlayerColor === null) return true;
  const isWhitePieceSelected: boolean = piece === piece.toUpperCase();
  const currentPlayer = chessBoard.playerColor; // Use current player from chess board
  return isWhitePieceSelected && currentPlayer === Color.Black || !isWhitePieceSelected && currentPlayer === Color.White
}

function selectingPiece(x: number, y: number): void {
  if(gameOver) return
  const piece: FENChar | null = chessBoardView[x][y]
  if(!piece) return;
  
  const currentPlayer = chessBoard.playerColor;
  const isWhitePiece = piece === piece.toUpperCase();
  const isCorrectPiece = (isWhitePiece && currentPlayer === Color.White) || (!isWhitePiece && currentPlayer === Color.Black);
  
  console.log(`Selecting piece: ${piece}, Current player: ${currentPlayer === Color.White ? 'White' : 'Black'}, Is white piece: ${isWhitePiece}, Is correct piece: ${isCorrectPiece}`);
  
  if(!isCorrectPiece) {
    console.log("Wrong piece selected - ignoring");
    return;
  }

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
  console.log(prevX, prevY)
  
  // If we're in a drag operation, don't animate
  if (isDragging) {
    chessBoard.move(prevX, prevY, newX, newY, promotedPiece)
    setChessBoardView(chessBoard.chessBoardView)
    setCheckState(chessBoard.checkState)
    setLastMove(chessBoard.lastMove)
    setGameOver(chessBoard.isGameOver)
    setGameHistoryPointer(chessBoard.gameHistory.length - 1)
    unmarkSelectedPieceAndSafeSquares()
    return
  }
  
  // Only animate for click-to-move
  const { left, top } = calculateMovementPixel(prevX, prevY, newX, newY, 100)
 
  const piece_img: any = document.getElementById(`box-${prevX}${prevY}`)?.querySelector('.piece_img')
  if(piece_img){
    piece_img.style.transform = `translate(${left}px, ${top}px)`;
  }

  unmarkSelectedPieceAndSafeSquares()

  setTimeout(()=>{
    chessBoard.move(prevX, prevY, newX, newY, promotedPiece)
    setChessBoardView(chessBoard.chessBoardView)
    setCheckState(chessBoard.checkState)
    setLastMove(chessBoard.lastMove)
    setGameOver(chessBoard.isGameOver)
    setGameHistoryPointer(chessBoard.gameHistory.length - 1)
  },200)
}

function updateBoardWithPromotion(prevX: number, prevY: number, newX: number, newY: number, piece: FENChar): void {
  try{
    chessBoard.move(prevX, prevY, newX, newY, piece)
    setChessBoardView(chessBoard.chessBoardView)
    setCheckState(chessBoard.checkState)
    setLastMove(chessBoard.lastMove)
    setGameOver(chessBoard.isGameOver)
    unmarkSelectedPieceAndSafeSquares()
  }catch(err){}
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
  dragImage.innerHTML = `<img src="${pieceImagePaths[piece]}" style="width: 80px; height: 80px; border: none; outline: none;" />`
  dragImage.style.position = 'absolute'
  dragImage.style.top = '-1000px'
  dragImage.style.left = '-1000px'
  dragImage.style.pointerEvents = 'none'
  dragImage.style.zIndex = '9999'
  dragImage.style.width = '80px'
  dragImage.style.height = '80px'
  document.body.appendChild(dragImage)
  
  // Set the drag image with proper offset (center of the piece)
  e.dataTransfer.setDragImage(dragImage, 40, 40)
  
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

function handleNewGame(): void {
  setShowColorSelection(true);
  setSelectedPlayerColor(null);
  setSelectedDifficulty(1); // Reset difficulty to level 1
  setFlipMode(false); // Reset flip mode for new game
  // Reset the game state without reloading the page
  chessBoard = new ChessBoard();
  setChessBoardView(chessBoard.chessBoardView);
  setPlayerColor(chessBoard.playerColor);
  setLastMove(chessBoard.lastMove);
  setCheckState(chessBoard.checkState);
  setGameOver(chessBoard.isGameOver);
  setGameHistoryPointer(0);
  setBoardMoveList([]);
  unmarkSelectedPieceAndSafeSquares();
}

function flipBoard(): void {
  setFlipMode(!flipMode);
}

function handleColorSelection(color: Color): void {
  setSelectedPlayerColor(color);
  setShowColorSelection(false);
  // Auto-flip board if player chooses black (so black pieces are at bottom)
  setFlipMode(color === Color.Black);
  // Reset the game state without reloading the page
  chessBoard = new ChessBoard();
  setChessBoardView(chessBoard.chessBoardView);
  setPlayerColor(chessBoard.playerColor);
  setLastMove(chessBoard.lastMove);
  setCheckState(chessBoard.checkState);
  setGameOver(chessBoard.isGameOver);
  setGameHistoryPointer(0);
  setBoardMoveList([]);
  unmarkSelectedPieceAndSafeSquares();
}

return(
<>
<GameOverPopup 
  isOpen={showGameOverPopup}
  message={gameOverMessage}
  onClose={handleCloseGameOverPopup}
  onNewGame={handleNewGame}
/>

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
</div>

<div className="gameinfo_wraper">
  <div className="gameinfo">
    <div className="gameinfo_opponent"></div>
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
        <div className="gameinfo_action">
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
  </div>
</div>
</>
)
}

export default BoardWithBOT