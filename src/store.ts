// On-device storage for listening stats, song pairs and settings. Nothing leaves the phone.
import { useSyncExternalStore } from 'react'
import { defaultSettings, type ShuffleSettings, type SongPair } from './engine/engine'

export interface TrackRecord {
  title: string
  skips: number
  fullPlays: number
  starred?: boolean
}

export interface AppSettings extends ShuffleSettings {
  smartShuffleOn: boolean
}

interface State {
  tracks: Record<string, TrackRecord>
  pairs: Record<string, SongPair[]>
  settings: AppSettings
}

const KEY = 'ss.data'
const listeners = new Set<() => void>()

function load(): State {
  const fallback: State = { tracks: {}, pairs: {}, settings: { ...defaultSettings, smartShuffleOn: true } }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return saved ? { ...fallback, ...saved, settings: { ...fallback.settings, ...saved.settings } } : fallback
  } catch {
    return fallback
  }
}

let state = load()

function update(change: (s: State) => State) {
  state = change(state)
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked; keep working in memory.
  }
  listeners.forEach((l) => l())
}

export function useStore(): State {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => state,
  )
}

export const getState = () => state

export function updateSettings(patch: Partial<AppSettings>) {
  update((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
}

export function recordOutcome(trackId: string, title: string, outcome: 'skip' | 'fullPlay') {
  update((s) => {
    const r = s.tracks[trackId] ?? { title, skips: 0, fullPlays: 0 }
    const next = outcome === 'skip' ? { ...r, skips: r.skips + 1 } : { ...r, fullPlays: r.fullPlays + 1 }
    return { ...s, tracks: { ...s.tracks, [trackId]: next } }
  })
}

/** Clears a song's stats, which takes it out of its health category. */
export function resetTrack(trackId: string) {
  update((s) => {
    const r = s.tracks[trackId]
    if (!r) return s
    return { ...s, tracks: { ...s.tracks, [trackId]: { ...r, skips: 0, fullPlays: 0, starred: false } } }
  })
}

export function toggleStar(trackId: string, title: string) {
  update((s) => {
    const r = s.tracks[trackId] ?? { title, skips: 0, fullPlays: 0 }
    return { ...s, tracks: { ...s.tracks, [trackId]: { ...r, starred: !r.starred } } }
  })
}

export function addPair(playlistId: string, pair: SongPair) {
  update((s) => ({ ...s, pairs: { ...s.pairs, [playlistId]: [...(s.pairs[playlistId] ?? []), pair] } }))
}

export function removePair(playlistId: string, index: number) {
  update((s) => ({
    ...s,
    pairs: { ...s.pairs, [playlistId]: (s.pairs[playlistId] ?? []).filter((_, i) => i !== index) },
  }))
}
