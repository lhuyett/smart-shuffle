import Foundation
import SwiftData
import SmartShuffleCore

/// Per-track listening stats, kept only on this device.
@Model
final class TrackRecord {
    @Attribute(.unique) var trackID: String
    var title: String
    var skips: Int
    var fullPlays: Int
    var firstSeen: Date
    var isStarred: Bool

    init(trackID: String, title: String, firstSeen: Date = .now) {
        self.trackID = trackID
        self.title = title
        self.skips = 0
        self.fullPlays = 0
        self.firstSeen = firstSeen
        self.isStarred = false
    }

    func stats(dateAdded: Date?) -> TrackStats {
        TrackStats(id: trackID, title: title, skips: skips, fullPlays: fullPlays,
                   dateAdded: dateAdded ?? firstSeen, isStarred: isStarred)
    }
}

/// "Song A always plays before song B" (paper screen 3).
@Model
final class PairRecord {
    var playlistID: String
    var firstID: String
    var secondID: String

    init(playlistID: String, firstID: String, secondID: String) {
        self.playlistID = playlistID
        self.firstID = firstID
        self.secondID = secondID
    }

    var pair: SongPair { SongPair(firstID: firstID, secondID: secondID) }
}

/// User settings from screens 2 and 4, stored in UserDefaults.
final class SettingsStore: ObservableObject {
    @Published var smartShuffleOn: Bool { didSet { save() } }
    @Published var skipThreshold: Int { didSet { save() } }
    @Published var autoLowPriority: Bool { didSet { save() } }
    @Published var newSongBias: Double { didSet { save() } }

    private let defaults = UserDefaults.standard

    init() {
        smartShuffleOn = defaults.object(forKey: "smartShuffleOn") as? Bool ?? true
        skipThreshold = defaults.object(forKey: "skipThreshold") as? Int ?? 3
        autoLowPriority = defaults.object(forKey: "autoLowPriority") as? Bool ?? true
        newSongBias = defaults.object(forKey: "newSongBias") as? Double ?? 0
    }

    var shuffleSettings: ShuffleSettings {
        ShuffleSettings(skipThreshold: skipThreshold, autoLowPriority: autoLowPriority,
                        newSongBias: newSongBias)
    }

    private func save() {
        defaults.set(smartShuffleOn, forKey: "smartShuffleOn")
        defaults.set(skipThreshold, forKey: "skipThreshold")
        defaults.set(autoLowPriority, forKey: "autoLowPriority")
        defaults.set(newSongBias, forKey: "newSongBias")
    }
}
