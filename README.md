# Smart Shuffle

A Spotify shuffle that learns from what you skip. It's a web app you add to
your iPhone Home Screen. It works out the play order, sends it to your Spotify
app, and watches which songs you skip. Based on the IT345 Preliminary Project
Paper; the plan is in [PLAN.md](PLAN.md).

**Live app:** https://lhuyett.github.io/smart-shuffle/ (once GitHub Pages is on)

## One-time setup

1. **Spotify developer app.** At https://developer.spotify.com/dashboard, create an
   app. Pick **Web API**, and add this Redirect URI exactly:
   `https://lhuyett.github.io/smart-shuffle/`
   Spotify requires the app owner to have **Premium**. In development mode, up
   to 5 Spotify accounts can use it. Add them under *User Management*.
2. **Client ID.** Copy the app's Client ID. Either paste it into the app on first
   launch, or save it as a repository variable named `SPOTIFY_CLIENT_ID`
   (*Settings → Secrets and variables → Actions → Variables*) so it's built in.
   The Client ID isn't secret; sign-in uses PKCE, so there's no client secret.
3. **GitHub Pages.** In the repo's *Settings → Pages*, set *Source* to **GitHub Actions**.
   Every push to `main` then tests and deploys the app.
4. **On your iPhone.** Open the link in Safari, tap Share → **Add to Home Screen**.

## Using it

Open Spotify on your phone, then open Smart Shuffle, pick a playlist and tap
shuffle. Music plays in Spotify. Keep Smart Shuffle open on screen while you
listen so it can see your skips. iPhone pauses web apps in the background.

Limits from Spotify's 2026 rules: only playlists you own or collaborate on can
be read, and controlling playback needs Premium.

## Development

```sh
npm install
npm run dev     # local server
npm test        # algorithm unit tests
npm run build
```

For local sign-in, add `http://127.0.0.1:5173/smart-shuffle/` as a Redirect URI
and open the app at that address (Spotify doesn't allow `localhost`).

## Layout

```
src/engine/     Smart Shuffle algorithm + tests (no Spotify or React code)
src/spotify/    Sign-in (PKCE) and Web API calls
src/player/     Starts sessions and learns skips by polling the player
src/screens/    Player, settings, song pairs, playlist health
src/store.ts    Stats, pairs and settings, saved on the device
```
