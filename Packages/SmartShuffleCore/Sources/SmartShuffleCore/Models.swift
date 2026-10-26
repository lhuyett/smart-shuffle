import Foundation

/// What the engine knows about one track in a playlist.
public struct TrackStats: Hashable, Sendable {
    public let id: String
    public var title: String
    public var skips: Int
    public var fullPlays: Int
    public var dateAdded: Date?
    public var isStarred: Bool

    public init(id: String, title: String, skips: Int = 0, fullPlays: Int = 0,
                dateAdded: Date? = nil, isStarred: Bool = false) {
        self.id = id
        self.title = title
        self.skips = skips
        self.fullPlays = fullPlays
        self.dateAdded = dateAdded
        self.isStarred = isStarred
    }

    /// Skips, partly forgiven by full listens.
    public var effectiveSkips: Double {
        max(0, Double(skips) - Double(fullPlays) / 2)
    }

    public var totalPlays: Int { skips + fullPlays }
}

/// Song A always plays immediately before song B.
public struct SongPair: Hashable, Sendable {
    public let firstID: String
    public let secondID: String

    public init(firstID: String, secondID: String) {
        self.firstID = firstID
        self.secondID = secondID
    }
}

public struct ShuffleSettings: Hashable, Sendable {
    /// Skips before a song's probability starts dropping (paper screen 2).
    public var skipThreshold: Int
    /// Move songs skipped more than 2x the threshold into low priority.
    public var autoLowPriority: Bool
    /// -1 = favorites first, 0 = balanced, +1 = new songs first (paper screen 4).
    public var newSongBias: Double
    /// A track counts as "new" for this many days after it was added.
    public var newSongWindowDays: Int

    public init(skipThreshold: Int = 3, autoLowPriority: Bool = true,
                newSongBias: Double = 0, newSongWindowDays: Int = 14) {
        self.skipThreshold = max(1, skipThreshold)
        self.autoLowPriority = autoLowPriority
        self.newSongBias = min(1, max(-1, newSongBias))
        self.newSongWindowDays = newSongWindowDays
    }
}

/// Why a song was placed where it is (paper screen 6).
public enum PlayReason: Hashable, Sendable {
    case recentlyAdded
    case favorite
    case pairedAfter(title: String)
    case playedLessFromSkips(skips: Int)
    case random

    public var text: String {
        switch self {
        case .recentlyAdded: return "Recently added"
        case .favorite: return "One of your favorites"
        case .pairedAfter(let title): return "Plays after \(title)"
        case .playedLessFromSkips(let n): return "Playing less often (\(n) skips)"
        case .random: return "Shuffled in"
        }
    }
}

public struct QueuedTrack: Hashable, Sendable {
    public let id: String
    public let reasons: [PlayReason]
}

public struct ShuffleResult: Sendable {
    public let queue: [QueuedTrack]
    /// Skipped too often; shown at the bottom of the playlist, not shuffled.
    public let lowPriority: [TrackStats]
}

public enum TrackCategory: Sendable {
    case favorite, new, oftenSkipped, lowPriority, normal
}
