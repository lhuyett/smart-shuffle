// Thin wrapper over the Spotify Web API endpoints Smart Shuffle needs.
import { accessToken } from './auth'

export interface Playlist {
  id: string
  name: string
  imageUrl?: string
  ownerId: string
}

export interface Track {
  id: string
  uri: string
  title: string
  artist: string
  durationMs: number
  imageUrl?: string
  addedAt?: string
}

export interface PlayerState {
  isPlaying: boolean
  progressMs: number
  track?: Track
}

export class SpotifyError extends Error {
  readonly status: number
  readonly reason?: string
  constructor(status: number, message: string, reason?: string) {
    super(message)
    this.status = status
    this.reason = reason
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T | undefined> {
  const url = path.startsWith('https://') ? path : `https://api.spotify.com/v1${path}`
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', ...init.headers },
  })
  if (res.status === 204) return undefined
  const text = await res.text()
  const json = text ? JSON.parse(text) : undefined
  if (!res.ok) {
    throw new SpotifyError(res.status, json?.error?.message ?? `Spotify error ${res.status}`, json?.error?.reason)
  }
  return json as T
}

function toTrack(raw: any, addedAt?: string): Track | undefined {
  if (!raw || raw.type !== 'track' || !raw.id) return undefined
  return {
    id: raw.id,
    uri: raw.uri,
    title: raw.name,
    artist: (raw.artists ?? []).map((a: any) => a.name).join(', '),
    durationMs: raw.duration_ms,
    imageUrl: raw.album?.images?.[0]?.url,
    addedAt,
  }
}

export async function me(): Promise<{ id: string; name: string }> {
  const json = await call<any>('/me')
  return { id: json.id, name: json.display_name ?? json.id }
}

export async function myPlaylists(): Promise<Playlist[]> {
  const out: Playlist[] = []
  let next: string | null = '/me/playlists?limit=50'
  while (next) {
    const page: any = await call<any>(next)
    for (const p of page.items ?? []) {
      if (p) out.push({ id: p.id, name: p.name, imageUrl: p.images?.[0]?.url, ownerId: p.owner?.id })
    }
    next = page.next
  }
  return out
}

/** Spotify only returns contents of playlists you own or collaborate on (dev mode, 2026). */
export async function playlistTracks(playlistId: string): Promise<Track[]> {
  const out: Track[] = []
  let next: string | null = `/playlists/${playlistId}/items?limit=50`
  while (next) {
    const page: any = await call<any>(next)
    for (const entry of page.items ?? []) {
      // Entries moved from `track` to `item` in the Feb 2026 API change; accept either.
      const track = toTrack(entry.item ?? entry.track, entry.added_at)
      if (track) out.push(track)
    }
    next = page.next
  }
  return out
}

export async function playerState(): Promise<PlayerState | undefined> {
  const json = await call<any>('/me/player')
  if (!json) return undefined
  return { isPlaying: json.is_playing, progressMs: json.progress_ms ?? 0, track: toTrack(json.item) }
}

async function pickDevice(): Promise<string | undefined> {
  const json = await call<any>('/me/player/devices')
  const devices: any[] = json?.devices ?? []
  const device = devices.find((d) => d.is_active) ?? devices.find((d) => d.type === 'Smartphone') ?? devices[0]
  return device?.id
}

// Spotify rejects very large play requests; this keeps the body a safe size.
const MAX_URIS = 500

/** Starts playing exactly these tracks, in this order, on the user's Spotify app. */
export async function playInOrder(uris: string[]) {
  const deviceId = await pickDevice()
  if (!deviceId) throw new SpotifyError(404, 'Open Spotify on your phone first, then try again.', 'NO_ACTIVE_DEVICE')
  const q = `device_id=${encodeURIComponent(deviceId)}`
  await call(`/me/player/shuffle?state=false&${q}`, { method: 'PUT' })
  await call(`/me/player/play?${q}`, { method: 'PUT', body: JSON.stringify({ uris: uris.slice(0, MAX_URIS) }) })
}

export const pause = () => call('/me/player/pause', { method: 'PUT' })
export const resume = () => call('/me/player/play', { method: 'PUT' })
export const next = () => call('/me/player/next', { method: 'POST' })
