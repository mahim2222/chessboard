
interface PropsType {
    fullmove_number: number,
    first_move: string,
    second_move: string,
    light: boolean,
    gameHistoryPointer: number,
    onMoveClick: (moveIndex: number) => void
}

const MoveList=({fullmove_number, first_move, second_move, light, gameHistoryPointer, onMoveClick}: PropsType)=>{
const isFirstMoveCurrent = (fullmove_number - 1) * 2 + 1 === gameHistoryPointer;
const isSecondMoveCurrent = (fullmove_number - 1) * 2 + 2 === gameHistoryPointer;

return(
<div className={`movelist ${light?'light':''}`}>
 <span>{fullmove_number}</span>
 <button 
   className={isFirstMoveCurrent ? 'current-move' : ''}
   onClick={() => onMoveClick((fullmove_number - 1) * 2 + 1)}
 >
   {first_move}
 </button>
 <button 
   className={isSecondMoveCurrent ? 'current-move' : ''}
   onClick={() => onMoveClick((fullmove_number - 1) * 2 + 2)}
 >
   {second_move}
 </button>
</div>
)
}

export default MoveList