import { useEffect, useState } from 'react'
import { getClientId, isLoggedIn, login, logout, redirectUri, setClientId } from './spotify/auth'
import { myPlaylists, playlistTracks, me, type Playlist, type Track } from './spotify/api'
import { usePlayback } from './player/usePlayback'
import { PlayerScreen } from './screens/PlayerScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { PairsScreen } from './screens/PairsScreen'
import { HealthScreen } from './screens/HealthScreen'

type Tab = 'player' | 'pairs' | 'health' | 'settings'

export default function App() {
  if (!getClientId()) return <SetupScreen />
  if (!isLoggedIn()) return <LoginScreen />
  return <Home />
}

function SetupScreen() {
  const [id, setId] = useState('')
  return (
    <main className="centered">
      <h1>Smart Shuffle</h1>
      <p>Paste the Client ID from your Spotify developer app to get started.</p>
      <p className="muted small">Redirect URI to add in the Spotify dashboard: <code>{redirectUri()}</code></p>
      <input value={id} onChange={(e) => setId(e.target.value)} placeholder="Client ID" />
      <button className="primary" disabled={!id.trim()} onClick={() => { setClientId(id); location.reload() }}>Save</button>
    </main>
  )
}

function LoginScreen() {
  return (
    <main className="centered">
      <h1>Smart Shuffle</h1>
      <p className="muted">Learns what you skip.</p>
      <button className="primary" onClick={() => login()}>Connect Spotify</button>
    </main>
  )
}

function Home() {
  const [userId, setUserId] = useState<string>()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selected, setSelected] = useState<Playlist | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [tab, setTab] = useState<Tab>('player')
  const [error, setError] = useState<string | null>(null)
  const playback = usePlayback()

  useEffect(() => {
    me().then((u) => setUserId(u.id)).catch((e) => setError(e.message))
    myPlaylists().then(setPlaylists).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!selected) return
    playlistTracks(selected.id).then(setTracks).catch((e) => setError(e.message))
  }, [selected])

  if (tab === 'settings') return <SettingsScreen onBack={() => setTab('player')} />

  if (!selected) {
    // Spotify only lets this app read songs in playlists you own or collaborate on.
    const usable = playlists.filter((p) => !userId || p.ownerId === userId)
    return (
      <main>
        <header>
          <h1>Playlists</h1>
          <button onClick={() => setTab('settings')} aria-label="Settings">⚙︎</button>
        </header>
        {error && <p className="error">{error}</p>}
        <ul className="list">
          {usable.map((p) => (
            <li key={p.id} onClick={() => { setTracks([]); setSelected(p); setTab('player') }}>
              {p.imageUrl ? <img src={p.imageUrl} alt="" /> : <div className="art" />}
              <span>{p.name}</span>
            </li>
          ))}
        </ul>
        <button className="link" onClick={() => { logout(); location.reload() }}>Sign out</button>
      </main>
    )
  }

  return (
    <main>
      <header>
        <button onClick={() => setSelected(null)} aria-label="Back">‹</button>
        <h2>{selected.name}</h2>
        <button onClick={() => setTab('settings')} aria-label="Settings">⚙︎</button>
      </header>
      {error && <p className="error">{error}</p>}
      {tab === 'player' && <PlayerScreen playlist={selected} tracks={tracks} playback={playback} />}
      {tab === 'pairs' && <PairsScreen playlistId={selected.id} tracks={tracks} />}
      {tab === 'health' && <HealthScreen tracks={tracks} />}
      <nav className="tabs">
        <button className={tab === 'player' ? 'active' : ''} onClick={() => setTab('player')}>Play</button>
        <button className={tab === 'pairs' ? 'active' : ''} onClick={() => setTab('pairs')}>Pairs</button>
        <button className={tab === 'health' ? 'active' : ''} onClick={() => setTab('health')}>Health</button>
      </nav>
    </main>
  )
}
