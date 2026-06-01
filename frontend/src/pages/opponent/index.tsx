import AppLayout from "@/components/layout"
import Head from "next/head"
import { useRouter } from "next/router"
import type { ReactElement } from "react"
import { useEffect } from "react"

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

const OpponentLobbyRedirect = () => {
  const router = useRouter()

  useEffect(() => {
    void router.replace(`/opponent/${generateSessionId()}`)
  }, [router])

  return (
    <>
      <Head>
        <title>Random opponent — Starting…</title>
      </Head>
      <div className="game-lobby">
        <p className="game-lobby__status">Starting matchmaking…</p>
      </div>
    </>
  )
}

OpponentLobbyRedirect.getLayout = function getLayout(page: ReactElement) {
  return <AppLayout>{page}</AppLayout>
}

export default OpponentLobbyRedirect
