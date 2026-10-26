// Spotify sign-in with Authorization Code + PKCE. Runs entirely in the browser; no client secret.

const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ')

const TOKEN_KEY = 'ss.token'
const VERIFIER_KEY = 'ss.pkceVerifier'
const CLIENT_ID_KEY = 'ss.clientId'

interface StoredToken {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export function redirectUri(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString()
}

export function getClientId(): string | null {
  return import.meta.env.VITE_SPOTIFY_CLIENT_ID || localStorage.getItem(CLIENT_ID_KEY)
}

export function setClientId(id: string) {
  localStorage.setItem(CLIENT_ID_KEY, id.trim())
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function login() {
  const clientId = getClientId()
  if (!clientId) throw new Error('Missing Spotify Client ID')
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)))
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
  localStorage.setItem(VERIFIER_KEY, verifier)
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`)
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
}

async function requestToken(body: Record<string, string>): Promise<StoredToken> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: getClientId() ?? '', ...body }),
  })
  if (!res.ok) throw new Error(`Spotify sign-in failed (${res.status})`)
  const json = await res.json()
  const token: StoredToken = {
    accessToken: json.access_token,
    // Spotify may omit a new refresh token on refresh; keep the old one then.
    refreshToken: json.refresh_token ?? body.refresh_token,
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  return token
}

/** Finishes the redirect back from Spotify, if this page load is one. */
export async function handleRedirect(): Promise<void> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (!code) return
  const verifier = localStorage.getItem(VERIFIER_KEY) ?? ''
  window.history.replaceState({}, '', redirectUri())
  await requestToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), code_verifier: verifier })
  localStorage.removeItem(VERIFIER_KEY)
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(TOKEN_KEY) !== null
}

export async function accessToken(): Promise<string> {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (!raw) throw new Error('Not signed in')
  const token: StoredToken = JSON.parse(raw)
  if (Date.now() < token.expiresAt) return token.accessToken
  return (await requestToken({ grant_type: 'refresh_token', refresh_token: token.refreshToken })).accessToken
}
