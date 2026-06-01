import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import { useRouter } from "next/router"
import type { FENChar } from "@/chess-logic/models"
import { getApiBaseUrl, getWsBaseUrl } from "@/utils/func"
import type {
  ChatMessage,
  GameOverReport,
  OpponentSession,
  OpponentSessionStatus,
  PersistedMove,
  RemoteMovePayload,
  RemoteResignPayload,
  ServerMatchMessage,
} from "@/types/match"

function storageKey(gameId: string): string {
  return `chess-opponent-${gameId}`
}

/** Canonical random game id for reconnect (`join`) after match / refresh. */
export const CHESS_RANDOM_ACTIVE_GAME_KEY = "chess-random-active-game"

function getOrCreatePlayerIdentity(gameId: string): { name: string; playerId: string } {
  const key = storageKey(gameId)
  const existing = sessionStorage.getItem(key)
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as { name: string; playerId: string }
      if (parsed.playerId && typeof parsed.name === "string") {
        return { name: parsed.name, playerId: parsed.playerId }
      }
    } catch {
      // continue
    }
  }
  const raw = window.prompt("Enter your name:") ?? ""
  const name = raw.trim() || "Player"
  const playerId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
  sessionStorage.setItem(key, JSON.stringify({ name, playerId }))
  return { name, playerId }
}

function applyMessage(
  msg: ServerMatchMessage,
  set: Dispatch<SetStateAction<OpponentSession>>
): void {
  switch (msg.type) {
    case "waiting":
      set((s) => ({
        ...s,
        status: "waiting" as const,
        gameId: msg.gameId,
        socketId: msg.socketId,
        yourPlayerId: msg.yourPlayerId,
        playAs: null,
        errorMessage: null,
      }))
      return
    case "matched":
      set((s) => ({
        ...s,
        status: "matched" as const,
        gameId: msg.gameId,
        socketId: msg.socketId,
        yourPlayerId: msg.yourPlayerId,
        opponent: msg.opponent,
        playAs: msg.playAs,
        errorMessage: null,
      }))
      return
    case "room_full":
      set((s) => ({
        ...s,
        status: "room_full" as const,
        errorMessage: "This game room already has two players.",
        playAs: null,
      }))
      return
    case "opponent_disconnected":
      set((s) => ({
        ...s,
        status: "opponent_left" as const,
        opponent: null,
        playAs: null,
        errorMessage: null,
      }))
      return
    case "error":
      set((s) => ({
        ...s,
        status: "error" as const,
        errorMessage: msg.message,
        playAs: null,
      }))
      return
    default:
      return
  }
}

function parseIncomingMove(data: { type: string; [k: string]: unknown }): RemoteMovePayload {
  const prevX = Number(data.prevX)
  const prevY = Number(data.prevY)
  const newX = Number(data.newX)
  const newY = Number(data.newY)
  const p = data.promotion
  const promotion: FENChar | null =
    p == null || p === "" ? null : (String(p).slice(0, 1) as FENChar)
  return { prevX, prevY, newX, newY, promotion }
}

export type UseOpponentMatchResult = {
  match: OpponentSession
  remoteMove: RemoteMovePayload | null
  remoteResign: RemoteResignPayload | null
  remoteChatMessage: ChatMessage | null
  clearRemoteMove: () => void
  clearRemoteResign: () => void
  clearRemoteChatMessage: () => void
  sendGameMove: (p: RemoteMovePayload) => void
  sendGameResult: (report: GameOverReport) => void
  sendResign: () => void
  sendChatMessage: (text: string) => void
  /** `null` while a friend game’s moves are loading from the API. */
  persistedMovesForBoard: PersistedMove[] | null
  persistedChatMessages: ChatMessage[] | null
}

type MatchMode = "friend" | "random"

type UseOpponentMatchOptions = {
  mode?: MatchMode
}

export function useOpponentMatch(
  routerReady: boolean,
  gameId: string | string[] | undefined,
  options?: UseOpponentMatchOptions
): UseOpponentMatchResult {
  const router = useRouter()
  const mode = options?.mode ?? "friend"
  const id = useMemo(() => {
    if (Array.isArray(gameId)) {
      return gameId[0] && gameId[0].length > 0 ? gameId[0] : null
    }
    if (typeof gameId === "string" && gameId.length > 0) {
      return gameId
    }
    return null
  }, [gameId])
  const isRandomMode = mode === "random"
  const identityScope = isRandomMode ? "opponent-random" : id

  const [state, setState] = useState<OpponentSession>({
    status: "loading",
    gameId: id ?? (isRandomMode ? "random-queue" : ""),
    yourPlayerId: null,
    socketId: null,
    opponent: null,
    errorMessage: null,
    playAs: null,
  })
  const [remoteMove, setRemoteMove] = useState<RemoteMovePayload | null>(null)
  const [remoteResign, setRemoteResign] = useState<RemoteResignPayload | null>(null)
  const [remoteChatMessage, setRemoteChatMessage] = useState<ChatMessage | null>(null)
  const [persistedMoves, setPersistedMoves] = useState<PersistedMove[] | null>(null)
  const [persistedChatMessages, setPersistedChatMessages] = useState<ChatMessage[] | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const gameIdRef = useRef<string | null>(null)
  const playerIdRef = useRef<string | null>(null)

  const clearRemoteMove = useCallback(() => {
    setRemoteMove(null)
  }, [])
  const clearRemoteResign = useCallback(() => {
    setRemoteResign(null)
  }, [])
  const clearRemoteChatMessage = useCallback(() => {
    setRemoteChatMessage(null)
  }, [])

  const sendGameMove = useCallback((p: RemoteMovePayload) => {
    const ws = wsRef.current
    const g = gameIdRef.current
    const playerId = playerIdRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || !g || !playerId) {
      return
    }
    const body: Record<string, unknown> = {
      type: "move",
      gameId: g,
      playerId,
      prevX: p.prevX,
      prevY: p.prevY,
      newX: p.newX,
      newY: p.newY,
      promotion: p.promotion,
    }
    if (p.fenAfter && p.fenAfter.length > 0) {
      body.fenAfter = p.fenAfter
    }
    ws.send(JSON.stringify(body))
  }, [])

  const sendGameResult = useCallback(
    (report: GameOverReport) => {
      const ws = wsRef.current
      const g = gameIdRef.current
      const playerId = playerIdRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN || !g || !playerId) {
        return
      }
      ws.send(
        JSON.stringify({
          type: "game_over",
          gameId: g,
          playerId,
          result: report.result,
          reason: report.reason,
        })
      )
    },
    []
  )

  const sendResign = useCallback(() => {
    const ws = wsRef.current
    const g = gameIdRef.current
    const playerId = playerIdRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || !g || !playerId) {
      return
    }
    ws.send(
      JSON.stringify({
        type: "resign",
        gameId: g,
        playerId,
      })
    )
  }, [])

  const sendChatMessage = useCallback((text: string) => {
    const ws = wsRef.current
    const g = gameIdRef.current
    const playerId = playerIdRef.current
    const body = String(text ?? "").trim()
    if (!ws || ws.readyState !== WebSocket.OPEN || !g || !playerId || !body) {
      return
    }
    ws.send(
      JSON.stringify({
        type: "chat_send",
        gameId: g,
        playerId,
        text: body.slice(0, 500),
      })
    )
  }, [])

  useEffect(() => {
    if (state.gameId) {
      gameIdRef.current = state.gameId
    }
  }, [state.gameId])

  useEffect(() => {
    if (state.yourPlayerId) {
      playerIdRef.current = state.yourPlayerId
    }
  }, [state.yourPlayerId])

  useEffect(() => {
    if (!routerReady) {
      return
    }
    if (state.status !== "matched") {
      setPersistedMoves(null)
      setPersistedChatMessages(null)
      return
    }
    const gid = state.gameId
    if (!gid) {
      setPersistedMoves(null)
      setPersistedChatMessages(null)
      return
    }
    let cancelled = false
    setPersistedMoves(null)
    void fetch(`${getApiBaseUrl()}/games/${encodeURIComponent(gid)}/state`)
      .then(async (r) => {
        if (!r.ok) {
          return { moves: [] as PersistedMove[], messages: [] as ChatMessage[] }
        }
        return r.json() as Promise<{ moves?: PersistedMove[]; messages?: ChatMessage[] }>
      })
      .then((data) => {
        if (cancelled) {
          return
        }
        setPersistedMoves(Array.isArray(data.moves) ? data.moves : [])
        setPersistedChatMessages(Array.isArray(data.messages) ? data.messages : [])
      })
      .catch(() => {
        if (!cancelled) {
          setPersistedMoves([])
          setPersistedChatMessages([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [routerReady, state.status, state.gameId])

  useEffect(() => {
    if (!routerReady) {
      return
    }
    if (!id) {
      setState((s) => ({
        ...s,
        status: "error",
        errorMessage: "Invalid game link.",
        gameId: "",
        playAs: null,
      }))
      return
    }

    if (typeof window === "undefined") {
      return
    }

    setState({
      status: "loading",
      gameId: identityScope ?? "",
      yourPlayerId: null,
      socketId: null,
      opponent: null,
      errorMessage: null,
      playAs: null,
    })
    setRemoteMove(null)
    setRemoteResign(null)
    setRemoteChatMessage(null)
    setPersistedMoves(null)
    setPersistedChatMessages(null)

    const { name, playerId } = getOrCreatePlayerIdentity(
      identityScope ?? (isRandomMode ? "opponent-random" : "unknown")
    )
    playerIdRef.current = playerId
    setState({
      gameId: identityScope ?? "",
      yourPlayerId: playerId,
      status: "connecting" as OpponentSessionStatus,
      socketId: null,
      opponent: null,
      errorMessage: null,
      playAs: null,
    })

    const ws = new WebSocket(`${getWsBaseUrl()}/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      if (isRandomMode) {
        const active =
          typeof window !== "undefined"
            ? sessionStorage.getItem(CHESS_RANDOM_ACTIVE_GAME_KEY)
            : null
        if (active && active === id) {
          ws.send(JSON.stringify({ type: "join", gameId: id, playerId, name }))
          return
        }
        ws.send(
          JSON.stringify({
            type: "join_random",
            lobbySessionId: id,
            playerId,
            name,
          })
        )
        return
      }
      ws.send(JSON.stringify({ type: "join", gameId: id, playerId, name }))
    }

    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") {
        return
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(ev.data)
      } catch {
        return
      }
      if (!parsed || typeof parsed !== "object") {
        return
      }
      const obj = parsed as { type?: string; [k: string]: unknown }
      if (obj.type === "move") {
        setRemoteMove(parseIncomingMove(obj as { type: string; [k: string]: unknown }))
        return
      }
      if (obj.type === "resign_broadcast") {
        const result = obj.result
        const resignedBy = String(obj.resignedBy ?? "")
        const gid = String(obj.gameId ?? "")
        if (
          (result === "white_win" || result === "black_win") &&
          resignedBy.length > 0 &&
          gid.length > 0
        ) {
          setRemoteResign({
            result,
            resignedBy,
            gameId: gid,
          })
        }
        return
      }
      if (obj.type === "chat_message") {
        const text = String(obj.text ?? "").trim()
        if (!text) {
          return
        }
        setRemoteChatMessage({
          senderPlayerId: String(obj.senderPlayerId ?? ""),
          senderName: String(obj.senderName ?? "Player"),
          text,
          createdAt: String(obj.createdAt ?? new Date().toISOString()),
        })
        return
      }
      const next = parsed as ServerMatchMessage
      applyMessage(next, setState)
      if ((next.type === "matched" || next.type === "waiting") && next.gameId) {
        gameIdRef.current = next.gameId
      }
      if (next.type === "matched" && isRandomMode && id) {
        const gid = next.gameId
        if (gid && gid !== id && typeof window !== "undefined") {
          sessionStorage.setItem(CHESS_RANDOM_ACTIVE_GAME_KEY, gid)
          void router.replace(`/opponent/${gid}`)
        }
      }
    }

    ws.onerror = () => {
      setState((s) => ({
        ...s,
        status: "error" as const,
        playAs: null,
        errorMessage:
          s.errorMessage ||
          "Could not connect to the game server. Check that the backend is reachable.",
      }))
    }

    ws.onclose = () => {
      wsRef.current = null
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
  }, [routerReady, id, isRandomMode, identityScope, router])

  const match =
    isRandomMode || id ? state : { ...state, status: "loading" as const, gameId: "" }

  return {
    match,
    remoteMove,
    remoteResign,
    clearRemoteMove,
    clearRemoteResign,
    remoteChatMessage,
    clearRemoteChatMessage,
    sendGameMove,
    sendGameResult,
    sendResign,
    sendChatMessage,
    persistedMovesForBoard: persistedMoves,
    persistedChatMessages,
  }
}
