// Paper screen 3: songs that always play back to back.
import { useState } from 'react'
import type { Track } from '../spotify/api'
import { addPair, removePair, useStore } from '../store'

export function PairsScreen({ playlistId, tracks }: { playlistId: string; tracks: Track[] }) {
  const { pairs } = useStore()
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const list = pairs[playlistId] ?? []
  const title = (id: string) => tracks.find((t) => t.id === id)?.title ?? 'Unknown song'

  const picker = (value: string, onChange: (v: string) => void, label: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{label}</option>
      {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
    </select>
  )

  return (
    <section>
      <div className="card">
        <h3>New pair</h3>
        {picker(first, setFirst, 'Plays first (A)')}
        {picker(second, setSecond, 'Plays second (B)')}
        <button className="primary" disabled={!first || !second || first === second}
          onClick={() => { addPair(playlistId, { firstId: first, secondId: second }); setFirst(''); setSecond('') }}>
          Add pair
        </button>
      </div>
      <ul className="list">
        {list.map((p, i) => (
          <li key={`${p.firstId}-${p.secondId}`}>
            <span>{title(p.firstId)} → {title(p.secondId)}</span>
            <button className="link" onClick={() => removePair(playlistId, i)}>Remove</button>
          </li>
        ))}
        {list.length === 0 && <li className="muted">No pairs yet. Use pairs for Part I / Part II songs or album transitions.</li>}
      </ul>
    </section>
  )
}
