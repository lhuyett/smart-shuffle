# Smart Shuffle: initial plan

Based on Luke Huyett's "Dynamic Playlist/Smart Shuffle Preliminary Project" (IT345).

## Goal

A shuffle that learns from what you skip. It plays skipped songs less, pushes
heavily skipped songs to a low priority section, keeps paired songs together,
lets you bias toward new songs or favorites, and tells you why each song is
playing. All of this works without asking the user for extra input.

## Platform choice: Apple Music through MusicKit

| Option | Verdict |
|---|---|
| **Apple Music (MusicKit for Swift)** | **Chosen.** Native on iPhone, reads the user's library playlists, and `ApplicationMusicPlayer` lets the app own the queue, which Smart Shuffle requires. |
| Spotify iOS SDK | Its App Remote only controls the Spotify app. We can't build our own queue order reliably, and the Web API now restricts new apps. |
| Local files only | Easy, but few people keep local music any more. Could be a fallback later. |

What this needs:
- A Mac with Xcode 16 or later.
- A paid Apple Developer Program account ($99 a year). The MusicKit App Service has to be enabled on the App ID.
- An Apple Music subscription and a real iPhone. The Simulator can't play Apple Music catalog songs.

## Architecture

```
SwiftUI views ── PlayerController ── ApplicationMusicPlayer (MusicKit)
      │                 │
      │                 ├── SmartShuffleEngine (pure Swift, unit tested)
      │                 │
      └──────────── StatsStore (SwiftData: skips, plays, pairs, settings)
```

- **SmartShuffleCore** is a local Swift package with no Apple frameworks in it.
  It holds the algorithm, so it can be tested with `swift test` without a phone.
- **PlayerController** turns the engine's ordering into a MusicKit queue and
  watches track changes. If a track ended before 30 seconds (or before half its
  length, whichever is shorter), it counts as a skip. If it played past 90%, it
  counts as a full play.
- **StatsStore** keeps per-track stats on the device using SwiftData. Nothing
  leaves the phone, which covers the privacy concern raised in the paper.

## Algorithm (v1)

Each track gets a weight, and the order comes from weighted random sampling
without replacement (Efraimidis–Spirakis):

1. Base weight is 1.0.
2. **Skip learning:** `effectiveSkips = skips − fullPlays / 2`. Once it reaches
   the user's skip threshold, the weight is multiplied by 0.6 for each skip
   past it. The weight never drops below 0.05, so a song is never silenced
   for good. The paper's discussion section flagged that risk.
3. **Auto low priority:** if the toggle is on and `effectiveSkips ≥ 2 × threshold`,
   the song leaves the shuffle and appears in the Low Priority section.
4. **New vs. favorites slider** (−1 favorites first, 0 balanced, +1 new first):
   new songs (added in the last 14 days) and favorites (3 or more plays,
   at least 70% of them completed, or starred by hand) get boosted.
5. **Song pairs:** A and B are treated as one unit. When A comes up, B plays
   right after it.
6. **Why this song:** every pick records its reasons, such as "Recently
   added", "Plays after X", or "Favorite". The player shows them.

## MVP scope (screens from the paper)

| # | Screen | MVP? |
|---|---|---|
| 1 | Player with Smart Shuffle toggle ("Learns what you skip") | ✅ |
| 2 | Skip learning settings (threshold slider, auto low priority toggle) | ✅ |
| 3 | Song pair recognition (pick A → B) | ✅ |
| 4 | New song bias slider | ✅ |
| 5 | Playlist health dashboard (favorites / new / skipped / low priority) | ✅ basic |
| 6 | "Why this song?" | ✅ |
| 7 | Mood shuffle (hype / chill / focus / sad) | ⏭ v2. Apple Music only offers genres. Mood needs audio features or user tags. |

## Milestones

1. **Engine + tests.** Done in this scaffold.
2. **Plays music:** sign in to Apple Music, list playlists, play one with Smart Shuffle.
3. **Learns:** skip detection, persisted stats, settings screen.
4. **Pairs, health dashboard, and Why this song.**
5. **Study build:** export a CSV of skips per session for the one-week
   standard vs. Smart Shuffle comparison described in the paper's methodology.
   Ship it to testers through TestFlight.
