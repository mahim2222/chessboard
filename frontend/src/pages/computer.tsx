import BoardWithBOT from "@/components/bot/board"
import AppLayout from "@/components/layout"
import {
  readOrCreateComputerGameId,
  writeComputerGameId,
} from "@/utils/computerGameStorage"
import { useCallback, useEffect, useState, type ReactElement } from "react"

const PlayAgainstComputer = () => {
  const [gameId, setGameId] = useState<string | null>(null)

  useEffect(() => {
    setGameId(readOrCreateComputerGameId())
  }, [])

  const onRotateGameIdentity = useCallback(() => {
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
    writeComputerGameId(id)
    setGameId(id)
  }, [])

  return (
    <div className="board_page">
      {gameId ? (
        <BoardWithBOT gameId={gameId} onRotateGameIdentity={onRotateGameIdentity} />
      ) : null}
    </div>
  )
}

PlayAgainstComputer.getLayout = function getLayout(page: ReactElement) {
  return <AppLayout>{page}</AppLayout>
}

export default PlayAgainstComputer
