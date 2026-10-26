# Smart Shuffle

An iPhone music player that learns from what you skip and plays the rest of
your playlist better. Built with SwiftUI and Apple Music (MusicKit). The full
plan is in [PLAN.md](PLAN.md).

## Layout

```
Packages/SmartShuffleCore/   The shuffle algorithm (pure Swift) and its unit tests
App/                         The SwiftUI iPhone app
  Music/                     Apple Music sign-in, playlists, player + skip detection
  Persistence/               SwiftData records (skips, plays, pairs) and settings
  Views/                     Player, settings, song pairs, playlist health
project.yml                  XcodeGen spec that generates SmartShuffle.xcodeproj
```

## Getting it running

1. On a Mac with Xcode 16 or later, install XcodeGen with `brew install xcodegen`.
2. Run `xcodegen` in this folder, then open `SmartShuffle.xcodeproj`.
3. In the developer portal, enable **MusicKit** under App Services for the
   bundle ID `com.lhuyett.smartshuffle`. Change the bundle ID if you need to.
   This needs a paid Apple Developer account.
4. Choose your team under Signing & Capabilities, then run on a real iPhone
   signed in to Apple Music. The Simulator can't play Apple Music songs.

Run the algorithm tests without a phone:

```sh
cd Packages/SmartShuffleCore && swift test
```

## Status

This is an unbuilt scaffold. It was written without access to a Mac, so expect
a few compile fixes in Xcode the first time you build it.
