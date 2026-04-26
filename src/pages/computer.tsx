import BoardWithBOT from "@/components/bot/board"
import AppLayout from "@/components/layout"
import { ReactElement } from "react"

const PlayAgainstComputer=()=>{
return(
<div className="board_page">
 <BoardWithBOT/>
</div>
)
}

PlayAgainstComputer.getLayout = function getLayout(page: ReactElement) {
    return (
      <AppLayout>
        {page}
      </AppLayout>
    )
}
export default PlayAgainstComputer