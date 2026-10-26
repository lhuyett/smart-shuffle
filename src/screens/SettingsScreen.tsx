// Paper screens 2 (skip learning) and 4 (new song bias).
import { updateSettings, useStore } from '../store'

const BIAS_OPTIONS = [
  { value: 1, label: 'New first' },
  { value: 0, label: 'Balanced' },
  { value: -1, label: 'Favorites first' },
]

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { settings } = useStore()
  return (
    <main>
      <header>
        <button onClick={onBack} aria-label="Back">‹</button>
        <h2>Smart Shuffle</h2>
        <span />
      </header>

      <section className="card">
        <h3>Skip learning</h3>
        <label className="row">
          <span>Play a song less after <strong>{settings.skipThreshold}</strong> skips</span>
        </label>
        <input type="range" min={1} max={10} value={settings.skipThreshold}
          onChange={(e) => updateSettings({ skipThreshold: Number(e.target.value) })} />
        <label className="toggle">
          <span>Move heavily skipped songs to Low Priority</span>
          <input type="checkbox" checked={settings.autoLowPriority}
            onChange={(e) => updateSettings({ autoLowPriority: e.target.checked })} />
        </label>
        <p className="muted small">
          Songs skipped {settings.skipThreshold * 2} or more times leave the shuffle. You can review them in Health.
        </p>
      </section>

      <section className="card">
        <h3>New songs vs. favorites</h3>
        <div className="segmented">
          {BIAS_OPTIONS.map((o) => (
            <button key={o.value} className={settings.newSongBias === o.value ? 'active' : ''}
              onClick={() => updateSettings({ newSongBias: o.value })}>{o.label}</button>
          ))}
        </div>
      </section>
    </main>
  )
}
