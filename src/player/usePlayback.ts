// Starts a Smart Shuffle session and learns from skips by polling what Spotify is playing.
import { useCallback, useEffect, useRef, useState } from 'react'
import { SmartShuffleEngine, classifyPlayback, type PlayReason, type TrackStats } from '../engine/engine'
import { playInOrder, playerState, type PlayerState, type Track } from '../spotify/api'
import { getState, recordOutcome } from '../store'

const POLL_MS = 3000
/** If polls were further apart than this (app was in the background), we can't tell skip from listen. */
const MAX_GAP_MS = 10_000

export interface Session {
  playlistId: string
  tracks: Map<string, Track>
  reasons: Map<string, PlayReason[]>
  lowPriority: TrackStats[]
}

export function toStats(t: Track): TrackStats {
  const r = getState().tracks[t.id]
  return { id: t.id, title: t.title, addedAt: t.addedAt, skips: r?.skips ?? 0, fullPlays: r?.fullPlays ?? 0, starred: r?.starred }
}

export function usePlayback() {
  const [session, setSession] = useState<Session | null>(null)
  const [player, setPlayer] = useState<PlayerState | undefined>()
  const [error, setError] = useState<string | null>(null)
  const last = useRef<{ trackId?: string; progressMs: number; playing: boolean; at: number }>({ progressMs: 0, playing: false, at: 0 })

  const start = useCallback(async (playlistId: string, tracks: Track[]) => {
    setError(null)
    const { settings, pairs } = getState()
    let order: Track[]
    let reasons = new Map<string, PlayReason[]>()
    let lowPriority: TrackStats[] = []
    if (settings.smartShuffleOn) {
      const result = new SmartShuffleEngine(settings).shuffle(tracks.map(toStats), pairs[playlistId] ?? [])
      const byId = new Map(tracks.map((t) => [t.id, t]))
      order = result.queue.map((q) => byId.get(q.id)!).filter(Boolean)
      reasons = new Map(result.queue.map((q) => [q.id, q.reasons]))
      lowPriority = result.lowPriority
    } else {
      order = shuffled(tracks)
    }
    try {
      await playInOrder(order.map((t) => t.uri))
      last.current = { progressMs: 0, playing: false, at: 0 }
      setSession({ playlistId, tracks: new Map(tracks.map((t) => [t.id, t])), reasons, lowPriority })
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const poll = useCallback(async () => {
    try {
      const state = await playerState()
      setPlayer(state)
      const now = Date.now()
      const prev = last.current
      const currentId = state?.track?.id
      if (session && prev.trackId && currentId !== prev.trackId && now - prev.at <= MAX_GAP_MS) {
        const prevTrack = session.tracks.get(prev.trackId)
        // Only learn from songs in this playlist session.
        if (prevTrack) {
          // Add the time since the last poll, since the song kept playing until it changed.
          const listened = prev.progressMs + (prev.playing ? now - prev.at : 0)
          const outcome = classifyPlayback(listened, prevTrack.durationMs)
          if (outcome !== 'partial') recordOutcome(prevTrack.id, prevTrack.title, outcome)
        }
      }
      last.current = { trackId: currentId, progressMs: state?.progressMs ?? 0, playing: state?.isPlaying ?? false, at: now }
    } catch (e) {
      setError((e as Error).message)
    }
  }, [session])

  useEffect(() => {
    poll()
    const id = setInterval(() => { if (document.visibilityState === 'visible') poll() }, POLL_MS)
    return () => clearInterval(id)
  }, [poll])

  return { session, player, error, start, refresh: poll }
}

/** Plain random shuffle (Fisher–Yates), used when Smart Shuffle is off. */
function shuffled<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
