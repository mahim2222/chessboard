import AppLayout from "@/components/layout"
import BoardWithOnlinePlayer from "@/components/multiplayer/board"
import { ReactElement } from "react"

const PlayAgainstOpponent = () => {
  return (
    <div className="board_page">
      <BoardWithOnlinePlayer />
    </div>
  )
}

PlayAgainstOpponent.getLayout = function getLayout(page: ReactElement) {
  return <AppLayout>{page}</AppLayout>
}

export default PlayAgainstOpponent
