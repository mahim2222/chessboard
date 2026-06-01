import AppLayout from "@/components/layout"
import BoardWithOnlinePlayer from "@/components/multiplayer/board"
import { useOpponentMatch } from "@/hooks/useOpponentMatch"
import { Color } from "@/chess-logic/models"
import { ReactElement } from "react"
import { useRouter } from "next/router"
import { FaUserFriends, FaLink } from "react-icons/fa"
import { useCallback } from "react"

const PlayAgainstOpponent = () => {
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
  } = useOpponentMatch(router.isReady, router.query.id)
  const shareUrl =
    typeof window !== "undefined" && match.gameId
      ? `${window.location.origin}/game/${match.gameId}`
      : ""

  const copyLink = useCallback(() => {
    if (!shareUrl) {
      return
    }
    void navigator.clipboard.writeText(shareUrl)
  }, [shareUrl])

  if (match.status === "error" || match.status === "room_full") {
    return (
      <div className="game-lobby">
        <p className="game-lobby__alert">
          {match.status === "room_full"
            ? match.errorMessage
            : match.errorMessage || "Something went wrong."}
        </p>
      </div>
    )
  }

  if (
    match.status === "loading" ||
    match.status === "connecting" ||
    match.status === "waiting" ||
    match.status === "opponent_left" ||
    match.status === "matched"
  ) {
    const playAsColor =
      match.playAs === "white"
        ? Color.White
        : match.playAs === "black"
          ? Color.Black
          : undefined

    return (
      <div className="game-lobby">
        <div className="game-lobby__card">
          <h1 className="game-lobby__title">Online game</h1>
          {match.yourPlayerId && (
            <p className="game-lobby__meta">
              Your id: <code>{match.yourPlayerId.slice(0, 8)}…</code>
            </p>
          )}

          {match.status === "loading" || match.status === "connecting" ? (
            <p className="game-lobby__status">Connecting to the server…</p>
          ) : null}

          {match.status === "waiting" ? (
            <>
              <p className="game-lobby__status game-lobby__status--pulse">
                Waiting for your opponent to join this room…
              </p>
              {shareUrl ? (
                <div className="game-lobby__share">
                  <p>Send them this link:</p>
                  <code className="game-lobby__url">{shareUrl}</code>
                  <button type="button" className="game-lobby__btn" onClick={copyLink}>
                    <FaLink style={{ marginRight: 6 }} />
                    Copy link
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {match.status === "opponent_left" ? (
            <>
              <p className="game-lobby__status">
                Your opponent disconnected. Share the link again so someone else can
                join.
              </p>
              {shareUrl ? (
                <div className="game-lobby__share">
                  <code className="game-lobby__url">{shareUrl}</code>
                  <button type="button" className="game-lobby__btn" onClick={copyLink}>
                    <FaLink style={{ marginRight: 6 }} />
                    Copy link
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {match.status === "matched" && match.opponent && match.playAs ? (
            <p className="game-lobby__matched">
              <FaUserFriends className="game-lobby__icon" />
              <span>
                <strong>Matched!</strong> vs <strong>{match.opponent.name}</strong>
                <span className="game-lobby__id"> (id: {match.opponent.id.slice(0, 8)}…)</span>
                <span> — you are <strong>{match.playAs}</strong></span>
              </span>
            </p>
          ) : null}

          {match.socketId ? (
            <p className="game-lobby__hint">
              Socket id: <code>{match.socketId.slice(0, 8)}…</code>
            </p>
          ) : null}
        </div>

        {match.status === "matched" && match.opponent && playAsColor !== undefined ? (
          persistedMovesForBoard === null ? (
            <p className="game-lobby__status">Loading saved game…</p>
          ) : (
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
          )
        ) : null}
      </div>
    )
  }

  return null
}

PlayAgainstOpponent.getLayout = function getLayout(page: ReactElement) {
  return <AppLayout>{page}</AppLayout>
}

export default PlayAgainstOpponent
