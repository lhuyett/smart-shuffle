import { describe, expect, it } from 'vitest'
import { MIN_WEIGHT, SmartShuffleEngine, classifyPlayback, defaultSettings, type TrackStats } from './engine'

/** Deterministic RNG (mulberry32) so shuffle tests are repeatable. */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const now = Date.parse('2026-10-26T00:00:00Z')
const track = (id: string, extra: Partial<TrackStats> = {}): TrackStats =>
  ({ id, title: `Song ${id}`, skips: 0, fullPlays: 0, ...extra })
const engine = (overrides = {}) => new SmartShuffleEngine({ ...defaultSettings, ...overrides }, now)

describe('SmartShuffleEngine', () => {
  it('queues every active track exactly once', () => {
    const tracks = Array.from({ length: 30 }, (_, i) => track(`${i}`))
    const ids = engine().shuffle(tracks, [], seeded(1)).queue.map((q) => q.id)
    expect(ids).toHaveLength(30)
    expect(new Set(ids)).toEqual(new Set(tracks.map((t) => t.id)))
  })

  it('plays paired songs back to back', () => {
    const tracks = Array.from({ length: 20 }, (_, i) => track(`${i}`))
    const pairs = [{ firstId: '3', secondId: '4' }, { firstId: '4', secondId: '5' }]
    for (let seed = 0; seed < 50; seed++) {
      const ids = engine().shuffle(tracks, pairs, seeded(seed)).queue.map((q) => q.id)
      const i = ids.indexOf('3')
      expect(ids.slice(i, i + 3)).toEqual(['3', '4', '5'])
    }
  })

  it('does not drop tracks in a pair cycle', () => {
    const pairs = [{ firstId: 'a', secondId: 'b' }, { firstId: 'b', secondId: 'a' }]
    const ids = engine().shuffle([track('a'), track('b')], pairs, seeded(7)).queue.map((q) => q.id)
    expect(new Set(ids)).toEqual(new Set(['a', 'b']))
  })

  it('moves heavily skipped songs to low priority', () => {
    const result = engine({ skipThreshold: 3 }).shuffle([track('x', { skips: 6 }), track('y')], [], seeded(2))
    expect(result.lowPriority.map((t) => t.id)).toEqual(['x'])
    expect(result.queue.map((q) => q.id)).toEqual(['y'])
  })

  it('lowers skipped songs but never to zero', () => {
    const e = engine({ skipThreshold: 2, autoLowPriority: false })
    const skipped = e.weight(track('b', { skips: 50 }))
    expect(skipped.weight).toBeLessThan(e.weight(track('a')).weight)
    expect(skipped.weight).toBeGreaterThanOrEqual(MIN_WEIGHT)
    expect(skipped.reasons[0]).toEqual({ kind: 'playedLess', skips: 50 })
  })

  it('boosts new songs when biased toward new', () => {
    const fresh = track('n', { addedAt: new Date(now - 86_400_000).toISOString() })
    expect(engine({ newSongBias: 1 }).weight(fresh).weight)
      .toBeGreaterThan(engine({ newSongBias: -1 }).weight(fresh).weight)
  })

  it('plays favorites more often when biased toward favorites', () => {
    const tracks = [track('fav', { fullPlays: 10, starred: true }), ...Array.from({ length: 9 }, (_, i) => track(`${i}`))]
    let firstCount = 0
    for (let seed = 0; seed < 500; seed++) {
      if (engine({ newSongBias: -1 }).shuffle(tracks, [], seeded(seed)).queue[0].id === 'fav') firstCount++
    }
    // Uniform would be ~50/500; a 2.5x weight should give roughly 2x that.
    expect(firstCount).toBeGreaterThan(80)
  })
})

describe('classifyPlayback', () => {
  it('classifies skips, full plays and partial listens', () => {
    expect(classifyPlayback(5_000, 200_000)).toBe('skip')
    expect(classifyPlayback(195_000, 200_000)).toBe('fullPlay')
    expect(classifyPlayback(100_000, 200_000)).toBe('partial')
  })
})
