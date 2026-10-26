# Smart Shuffle: plan

Based on Luke Huyett's "Dynamic Playlist/Smart Shuffle Preliminary Project" (IT345).

## Goal

A shuffle that learns from what you skip. It plays skipped songs less, pushes
heavily skipped songs to a low priority section, keeps paired songs together,
lets you bias toward new songs or favorites, and tells you why each song is
playing. All of this works without asking the user for extra input.

## Platform: Spotify web app on the iPhone Home Screen

The first version targeted Apple Music with a native Swift app. That was
dropped because there's no Mac to build on and the music lives on Spotify.

| Option | Verdict |
|---|---|
| **Web app + Spotify Web API** | **Chosen.** Needs no Mac and no Apple fee, and hosting on GitHub Pages is free. The Web API can start a list of songs in an exact order on the user's Spotify app and report what's playing. |
| Native app (React Native / Expo cloud builds) | Needs the $99/yr Apple Developer account, and Spotify's iOS SDK still can't set a custom play order any better. |

Constraints from Spotify (development mode, 2026):
- The app owner needs Spotify Premium. Playback control needs Premium too.
- At most 5 users per app, added by hand in the dashboard. That's enough for a small study.
- Songs can only be read from playlists you own or collaborate on.

## Architecture

```
React screens ── usePlayback ── Spotify Web API ── Spotify app on the phone
      │               │
      │               ├── SmartShuffleEngine (pure TS, unit tested)
      │               │
      └──────────── store (localStorage: skips, plays, pairs, settings)
```

- **Playback:** turn off Spotify's own shuffle, then `PUT /me/player/play` with
  the Smart Shuffle order.
- **Skip learning:** poll `GET /me/player` every 3 s. When the song changes, a
  listen shorter than 30 s (or half the song) is a skip, and 90% or more is a
  full play. If the polls were more than 10 s apart, the app was in the
  background, so we don't guess.
- **Privacy:** stats stay in the phone's browser storage.

## Algorithm (v1)

Each track gets a weight, and the order comes from weighted random sampling
without replacement (Efraimidis–Spirakis):

1. Base weight is 1.0.
2. **Skip learning:** `effectiveSkips = skips − fullPlays / 2`. From the
   threshold onward, the weight is multiplied by 0.6 for each extra skip. It
   never drops below 0.05, so a song can't vanish for good.
3. **Auto low priority:** with the toggle on, songs at 2 × threshold or more
   leave the shuffle and are listed under Health.
4. **New vs. favorites:** new songs (added in the last 14 days) and favorites
   (3 or more plays with at least 70% finished, or starred) get up to a 2.5×
   boost, depending on the setting.
5. **Song pairs:** A → B chains are queued as one unit.
6. **Why this song:** the reasons are shown on the player.

## Screens from the paper

| # | Screen | Status |
|---|---|---|
| 1 | Player with Smart Shuffle toggle | ✅ |
| 2 | Skip learning settings | ✅ |
| 3 | Song pairs | ✅ |
| 4 | New song bias | ✅ |
| 5 | Playlist health dashboard | ✅ |
| 6 | Why this song? | ✅ |
| 7 | Mood shuffle | ⏭ Later. Spotify removed audio features for new apps, so moods would need user tags. |

## Next

1. Try it on a real playlist and tune the thresholds.
2. **Background learning:** add a small server (for example a Cloudflare Worker
   on a cron schedule) that polls Spotify, so skips count even when the app is
   closed.
3. **Study build:** export a CSV of skips per session for the one-week
   standard vs. Smart Shuffle comparison.
