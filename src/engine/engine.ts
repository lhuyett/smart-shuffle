// Smart Shuffle algorithm. Pure TypeScript with an injectable RNG so it can be unit tested.

export interface TrackStats {
  id: string
  title: string
  skips: number
  fullPlays: number
  /** ISO date the track was added to the playlist. */
  addedAt?: string
  starred?: boolean
}

/** Song A always plays immediately before song B. */
export interface SongPair {
  firstId: string
  secondId: string
}

export interface ShuffleSettings {
  /** Skips before a song's probability starts dropping (paper screen 2). */
  skipThreshold: number
  /** Move songs skipped more than 2x the threshold into low priority. */
  autoLowPriority: boolean
  /** -1 = favorites first, 0 = balanced, +1 = new songs first (paper screen 4). */
  newSongBias: number
  /** A track counts as "new" for this many days after it was added. */
  newSongWindowDays: number
}

export const defaultSettings: ShuffleSettings = {
  skipThreshold: 3,
  autoLowPriority: true,
  newSongBias: 0,
  newSongWindowDays: 14,
}

/** Why a song was placed where it is (paper screen 6). */
export type PlayReason =
  | { kind: 'recentlyAdded' }
  | { kind: 'favorite' }
  | { kind: 'pairedAfter'; title: string }
  | { kind: 'playedLess'; skips: number }
  | { kind: 'random' }

export function reasonText(reason: PlayReason): string {
  switch (reason.kind) {
    case 'recentlyAdded': return 'Recently added'
    case 'favorite': return 'One of your favorites'
    case 'pairedAfter': return `Plays after ${reason.title}`
    case 'playedLess': return `Playing less often (${reason.skips} skips)`
    case 'random': return 'Shuffled in'
  }
}

export interface QueuedTrack {
  id: string
  reasons: PlayReason[]
}

export interface ShuffleResult {
  queue: QueuedTrack[]
  /** Skipped too often; listed separately, not shuffled. */
  lowPriority: TrackStats[]
}

export type TrackCategory = 'favorite' | 'new' | 'oftenSkipped' | 'lowPriority' | 'normal'

export const MIN_WEIGHT = 0.05
const SKIP_DECAY = 0.6
const MAX_BOOST = 1.5
const DAY_MS = 86_400_000

/** Skips, partly forgiven by full listens. */
export function effectiveSkips(t: TrackStats): number {
  return Math.max(0, t.skips - t.fullPlays / 2)
}

export class SmartShuffleEngine {
  readonly settings: ShuffleSettings
  readonly now: number

  constructor(settings: ShuffleSettings, now: number = Date.now()) {
    this.settings = { ...settings, skipThreshold: Math.max(1, settings.skipThreshold) }
    this.now = now
  }

  isNew(t: TrackStats): boolean {
    if (!t.addedAt) return false
    return this.now - Date.parse(t.addedAt) <= this.settings.newSongWindowDays * DAY_MS
  }

  isFavorite(t: TrackStats): boolean {
    if (t.starred) return true
    const total = t.skips + t.fullPlays
    return total >= 3 && t.fullPlays / total >= 0.7
  }

  isLowPriority(t: TrackStats): boolean {
    return this.settings.autoLowPriority && effectiveSkips(t) >= this.settings.skipThreshold * 2
  }

  category(t: TrackStats): TrackCategory {
    if (this.isLowPriority(t)) return 'lowPriority'
    if (effectiveSkips(t) >= this.settings.skipThreshold) return 'oftenSkipped'
    if (this.isNew(t)) return 'new'
    if (this.isFavorite(t)) return 'favorite'
    return 'normal'
  }

  weight(t: TrackStats): { weight: number; reasons: PlayReason[] } {
    let weight = 1
    const reasons: PlayReason[] = []

    const overThreshold = effectiveSkips(t) - this.settings.skipThreshold + 1
    if (overThreshold > 0) {
      weight *= SKIP_DECAY ** overThreshold
      reasons.push({ kind: 'playedLess', skips: t.skips })
    }

    const bias = Math.min(1, Math.max(-1, this.settings.newSongBias))
    if (this.isNew(t)) {
      weight *= 1 + Math.max(0, bias) * MAX_BOOST
      reasons.push({ kind: 'recentlyAdded' })
    } else if (this.isFavorite(t)) {
      weight *= 1 + Math.max(0, -bias) * MAX_BOOST
      reasons.push({ kind: 'favorite' })
    }

    if (reasons.length === 0) reasons.push({ kind: 'random' })
    return { weight: Math.max(MIN_WEIGHT, weight), reasons }
  }

  shuffle(tracks: TrackStats[], pairs: SongPair[], random: () => number = Math.random): ShuffleResult {
    const lowPriority = tracks.filter((t) => this.isLowPriority(t))
    const active = tracks.filter((t) => !this.isLowPriority(t))
    const byId = new Map(active.map((t) => [t.id, t]))

    // Follow pair chains (A→B→C) so each chain becomes one unit led by its head.
    const next = new Map<string, string>()
    for (const p of pairs) {
      if (byId.has(p.firstId) && byId.has(p.secondId)) next.set(p.firstId, p.secondId)
    }
    const followers = new Set(next.values())

    const units: { weight: number; items: QueuedTrack[] }[] = []
    const placed = new Set<string>()
    const addUnit = (head: TrackStats) => {
      const { weight, reasons } = this.weight(head)
      const items: QueuedTrack[] = [{ id: head.id, reasons }]
      placed.add(head.id)
      let current = head
      for (;;) {
        const nextId = next.get(current.id)
        const follower = nextId ? byId.get(nextId) : undefined
        if (!follower || placed.has(follower.id)) break
        items.push({ id: follower.id, reasons: [{ kind: 'pairedAfter', title: current.title }] })
        placed.add(follower.id)
        current = follower
      }
      units.push({ weight, items })
    }
    for (const t of active) if (!followers.has(t.id) && !placed.has(t.id)) addUnit(t)
    // Pair cycles (A→B→A) have no head; break them at the first unplaced track.
    for (const t of active) if (!placed.has(t.id)) addUnit(t)

    // Weighted sampling without replacement (Efraimidis–Spirakis): key = u^(1/w), highest first.
    const keyed = units.map((u) => ({ key: Math.max(random(), Number.EPSILON) ** (1 / u.weight), items: u.items }))
    keyed.sort((a, b) => b.key - a.key)
    return { queue: keyed.flatMap((k) => k.items), lowPriority }
  }
}

export type PlaybackOutcome = 'skip' | 'fullPlay' | 'partial'

/** Decides whether a track change was a skip or a full listen. */
export function classifyPlayback(listenedMs: number, durationMs?: number): PlaybackOutcome {
  if (!durationMs || durationMs <= 0) return listenedMs < 30_000 ? 'skip' : 'partial'
  if (listenedMs < Math.min(30_000, durationMs * 0.5)) return 'skip'
  if (listenedMs >= durationMs * 0.9) return 'fullPlay'
  return 'partial'
}
