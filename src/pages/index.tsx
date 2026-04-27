import AppLayout from "@/components/layout"
import Head from "next/head"
import { useRouter } from "next/router"
import { ReactElement, useCallback } from "react"
import { FaChessBoard, FaRobot, FaUserFriends } from "react-icons/fa"

function generateGameId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

const Home = () => {
  const router = useRouter()

  const goToOpponent = useCallback(() => {
    void router.push(`/game/${generateGameId()}`)
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
        <div className="home-landing__bg" aria-hidden="true" />

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
              onClick={goToOpponent}
            >
              <span className="home-landing__card-icon" aria-hidden="true">
                <FaUserFriends />
              </span>
              <span className="home-landing__card-title">Play vs opponent</span>
              <span className="home-landing__card-desc">
                Same device, two players. Each new game gets its own id in the URL, ready
                for when you wire up online play.
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
