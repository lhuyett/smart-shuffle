// Paper screens 1 (Smart Shuffle toggle) and 6 (Why this song?).
import { reasonText } from '../engine/engine'
import { next, pause, resume, type Playlist, type Track } from '../spotify/api'
import type { usePlayback } from '../player/usePlayback'
import { updateSettings, useStore } from '../store'

interface Props {
  playlist: Playlist
  tracks: Track[]
  playback: ReturnType<typeof usePlayback>
}

export function PlayerScreen({ playlist, tracks, playback }: Props) {
  const { settings } = useStore()
  const { session, player, error, start, refresh } = playback
  const inSession = session?.playlistId === playlist.id
  const current = player?.track
  const reasons = inSession && current ? session.reasons.get(current.id) : undefined

  const act = async (fn: () => Promise<unknown>) => { await fn().catch(() => {}); setTimeout(refresh, 400) }

  return (
    <section className="player">
      {current ? (
        <>
          {current.imageUrl && <img className="cover" src={current.imageUrl} alt="" />}
          <h3>{current.title}</h3>
          <p className="muted">{current.artist}</p>
          {reasons && (
            <div className="card">
              <strong className="small">Why this song?</strong>
              {reasons.map((r, i) => <div key={i} className="small">• {reasonText(r)}</div>)}
            </div>
          )}
        </>
      ) : (
        <p className="muted">{tracks.length ? `${tracks.length} songs` : 'Loading songs…'}</p>
      )}

      <div className="controls">
        <button onClick={() => start(playlist.id, tracks)} disabled={!tracks.length} aria-label="Shuffle and play">⤮</button>
        <button className="big" onClick={() => act(player?.isPlaying ? pause : resume)} aria-label="Play or pause">
          {player?.isPlaying ? '❚❚' : '▶'}
        </button>
        <button onClick={() => act(next)} aria-label="Next">⏭</button>
      </div>

      <label className="toggle">
        <span>
          <strong>Smart Shuffle</strong>
          <span className="muted small">Learns what you skip</span>
        </span>
        <input type="checkbox" checked={settings.smartShuffleOn}
          onChange={(e) => updateSettings({ smartShuffleOn: e.target.checked })} />
      </label>

      {inSession && session.lowPriority.length > 0 && (
        <p className="muted small">{session.lowPriority.length} low priority songs left out. See Health.</p>
      )}
      {error && <p className="error">{error}</p>}
      <p className="muted small">Music plays in your Spotify app. Keep this page open so it can learn your skips.</p>
    </section>
  )
}
