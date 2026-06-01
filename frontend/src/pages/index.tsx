import AppLayout from "@/components/layout"
import Head from "next/head"
import { useRouter } from "next/router"
import { ReactElement, useCallback } from "react"
import { FaChessBoard, FaRobot, FaUserFriends } from "react-icons/fa"
import { CHESS_RANDOM_ACTIVE_GAME_KEY } from "@/hooks/useOpponentMatch"

function generateGameId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

const Home = () => {
  const router = useRouter()

  const goToFriend = useCallback(() => {
    void router.push(`/game/${generateGameId()}`)
  }, [router])

  const goToOpponent = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(CHESS_RANDOM_ACTIVE_GAME_KEY)
    }
    void router.push(`/opponent/${generateGameId()}`)
  }, [router])

  const goToComputer = useCallback(() => {
    void router.push("/computer")
  }, [router])

  return (
    <>
      <Head>
        <title>Chess — Play online or vs computer</title>
        <meta
          name="description"
          content="Play chess against a friend on the same device or challenge the engine."
        />
      </Head>

      <div className="home-landing">
        <div className="home-landing__content">
          <div className="home-landing__header">
            <div className="home-landing__icon-wrap">
              <FaChessBoard className="home-landing__icon" />
            </div>
            <h1 className="home-landing__title">Chess</h1>
            <p className="home-landing__tagline">Choose how you want to play</p>
          </div>

          <div className="home-landing__actions">
            <button
              type="button"
              className="home-landing__card"
              onClick={goToFriend}
            >
              <span className="home-landing__card-icon" aria-hidden="true">
                <FaUserFriends />
              </span>
              <span className="home-landing__card-title">Play vs Friend</span>
              <span className="home-landing__card-desc">
                Share the link; you and a friend connect over the server. Each game has a
                unique id in the URL.
              </span>
            </button>

            <button
              type="button"
              className="home-landing__card"
              onClick={goToOpponent}
            >
              <span className="home-landing__card-icon" aria-hidden="true">
                <FaUserFriends />
              </span>
              <span className="home-landing__card-title">Play vs Opponent</span>
              <span className="home-landing__card-desc">
                You get a unique URL for this session. The server pairs you automatically
                when another player is waiting; games and moves are saved like friend mode.
              </span>
            </button>

            <button
              type="button"
              className="home-landing__card home-landing__card--accent"
              onClick={goToComputer}
            >
              <span className="home-landing__card-icon" aria-hidden="true">
                <FaRobot />
              </span>
              <span className="home-landing__card-title">Play vs computer</span>
              <span className="home-landing__card-desc">
                Face Stockfish with adjustable strength right in your browser
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

Home.getLayout = function getLayout(page: ReactElement) {
  return <AppLayout>{page}</AppLayout>
}

export default Home
