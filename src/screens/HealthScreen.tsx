// Paper screen 5: playlist health dashboard.
import { SmartShuffleEngine, type TrackCategory } from '../engine/engine'
import type { Track } from '../spotify/api'
import { toStats } from '../player/usePlayback'
import { resetTrack, toggleStar, useStore } from '../store'

const SECTIONS: { category: TrackCategory; title: string }[] = [
  { category: 'favorite', title: '★ Favorites' },
  { category: 'new', title: '✦ New' },
  { category: 'oftenSkipped', title: '⏭ Often skipped' },
  { category: 'lowPriority', title: '↓ Low priority' },
]

export function HealthScreen({ tracks }: { tracks: Track[] }) {
  const { settings } = useStore() // re-render when stats or settings change
  const engine = new SmartShuffleEngine(settings)
  const stats = tracks.map(toStats)

  return (
    <section>
      {SECTIONS.map(({ category, title }) => {
        const items = stats.filter((s) => engine.category(s) === category)
        return (
          <details key={category} className="card" open={items.length > 0 && items.length <= 10}>
            <summary><strong>{title}</strong> <span className="muted">({items.length})</span></summary>
            <ul className="list">
              {items.map((s) => (
                <li key={s.id}>
                  <span>{s.title}<br /><span className="muted small">{s.skips} skips · {s.fullPlays} full plays</span></span>
                  <span>
                    <button className="link" onClick={() => toggleStar(s.id, s.title)}>{s.starred ? 'Unstar' : 'Star'}</button>
                    <button className="link" onClick={() => resetTrack(s.id)}>Reset</button>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )
      })}
    </section>
  )
}
