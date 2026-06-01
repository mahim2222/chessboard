import AppLayout from "@/components/layout"
import BoardWithOnlinePlayer from "@/components/multiplayer/board"
import { Color } from "@/chess-logic/models"
import { useOpponentMatch } from "@/hooks/useOpponentMatch"
import type { ReactElement } from "react"
import { FaUserFriends } from "react-icons/fa"
import { useRouter } from "next/router"

const PlayRandomOpponent = () => {
  const router = useRouter()
  const {
    match,
    remoteMove,
    remoteResign,
    remoteChatMessage,
    clearRemoteMove,
    clearRemoteResign,
    clearRemoteChatMessage,
    sendGameMove,
    sendGameResult,
    sendResign,
    persistedMovesForBoard,
    persistedChatMessages,
    sendChatMessage,
  } = useOpponentMatch(router.isReady, router.query.id, { mode: "random" })

  if (match.status === "error") {
    return (
      <div className="game-lobby">
        <p className="game-lobby__alert">{match.errorMessage || "Something went wrong."}</p>
      </div>
    )
  }

  const playAsColor =
    match.playAs === "white"
      ? Color.White
      : match.playAs === "black"
        ? Color.Black
        : undefined

  return (
    <div className="game-lobby">
      <div className="game-lobby__card">
        <h1 className="game-lobby__title">Random opponent</h1>
        {match.yourPlayerId ? (
          <p className="game-lobby__meta">
            Your id: <code>{match.yourPlayerId.slice(0, 8)}…</code>
          </p>
        ) : null}

        {(match.status === "loading" || match.status === "connecting") && (
          <p className="game-lobby__status">Connecting to matchmaking server…</p>
        )}

        {match.status === "waiting" && (
          <p className="game-lobby__status game-lobby__status--pulse">
            Waiting for a random opponent to join…
          </p>
        )}

        {match.status === "opponent_left" && (
          <p className="game-lobby__status">
            Your opponent disconnected. The game room stays open — they can refresh to
            reconnect, or share this URL if they still have it.
          </p>
        )}

        {match.status === "matched" && match.opponent && match.playAs && (
          <p className="game-lobby__matched">
            <FaUserFriends className="game-lobby__icon" />
            <span>
              <strong>Matched!</strong> vs <strong>{match.opponent.name}</strong>
              <span className="game-lobby__id"> (id: {match.opponent.id.slice(0, 8)}…)</span>
              <span>
                {" "}
                — you are <strong>{match.playAs}</strong>
              </span>
            </span>
          </p>
        )}
      </div>

      {match.status === "matched" &&
      match.opponent &&
      playAsColor !== undefined &&
      persistedMovesForBoard !== null ? (
        <div className="board_page board_page--padded">
          <BoardWithOnlinePlayer
            playAs={playAsColor}
            restoreMoves={persistedMovesForBoard}
            restoreChatMessages={persistedChatMessages ?? []}
            onLocalMove={sendGameMove}
            remoteMove={remoteMove}
            onRemoteMoveConsumed={clearRemoteMove}
            remoteResign={remoteResign}
            onRemoteResignConsumed={clearRemoteResign}
            onSendResign={sendResign}
            onGameResult={sendGameResult}
            onSendChatMessage={sendChatMessage}
            remoteChatMessage={remoteChatMessage}
            onRemoteChatConsumed={clearRemoteChatMessage}
            myPlayerId={match.yourPlayerId ?? undefined}
          />
        </div>
      ) : null}

      {match.status === "matched" &&
      match.opponent &&
      playAsColor !== undefined &&
      persistedMovesForBoard === null ? (
        <p className="game-lobby__status">Loading saved game…</p>
      ) : null}
    </div>
  )
}

PlayRandomOpponent.getLayout = function getLayout(page: ReactElement) {
  return <AppLayout>{page}</AppLayout>
}

export default PlayRandomOpponent
