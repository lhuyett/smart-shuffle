import Foundation
import Combine
import MusicKit
import SwiftData
import SmartShuffleCore

/// Owns the ApplicationMusicPlayer queue and turns track changes into skip / full-play stats.
@MainActor
final class PlayerController: ObservableObject {
    @Published var currentTrack: Track?
    @Published var currentReasons: [PlayReason] = []
    @Published var lowPriority: [TrackStats] = []
    @Published var isPlaying = false

    private let player = ApplicationMusicPlayer.shared
    private var tracksByID: [String: Track] = [:]
    private var reasonsByID: [String: [PlayReason]] = [:]
    private var lastEntryTrackID: String?
    private var lastPlaybackTime: TimeInterval = 0
    private var context: ModelContext?
    private var cancellables: Set<AnyCancellable> = []
    private var timer: Timer?

    init() {
        player.queue.objectWillChange
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in Task { @MainActor in self?.queueChanged() } }
            .store(in: &cancellables)
        player.state.objectWillChange
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in
                Task { @MainActor in self?.isPlaying = self?.player.state.playbackStatus == .playing }
            }
            .store(in: &cancellables)
        // Sample playback time so we know how far the previous song got when it changes.
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, self.lastEntryTrackID != nil else { return }
                self.lastPlaybackTime = self.player.playbackTime
            }
        }
    }

    func play(playlistID: String, tracks: [Track], settings: SettingsStore, context: ModelContext) async throws {
        self.context = context
        tracksByID = Dictionary(tracks.map { ($0.id.rawValue, $0) }, uniquingKeysWith: { a, _ in a })

        let ordered: [Track]
        if settings.smartShuffleOn {
            let stats = tracks.map { record(for: $0, in: context).stats(dateAdded: $0.addedDate) }
            let pairs = try context.fetch(FetchDescriptor<PairRecord>(
                predicate: #Predicate { $0.playlistID == playlistID })).map(\.pair)
            let result = SmartShuffleEngine(settings: settings.shuffleSettings).shuffle(stats, pairs: pairs)
            reasonsByID = Dictionary(result.queue.map { ($0.id, $0.reasons) }, uniquingKeysWith: { a, _ in a })
            lowPriority = result.lowPriority
            ordered = result.queue.compactMap { tracksByID[$0.id] }
        } else {
            reasonsByID = [:]
            lowPriority = []
            ordered = tracks.shuffled()
        }

        player.state.shuffleMode = .off
        player.queue = ApplicationMusicPlayer.Queue(for: ordered)
        try await player.play()
    }

    func togglePlayPause() async {
        if player.state.playbackStatus == .playing { player.pause() } else { try? await player.play() }
    }

    func skip() async { try? await player.skipToNextEntry() }

    // MARK: Skip learning

    private func queueChanged() {
        guard case .song(let song)? = player.queue.currentEntry?.item else { return }
        let newID = song.id.rawValue
        guard newID != lastEntryTrackID else { return }

        if let previousID = lastEntryTrackID, let previous = tracksByID[previousID], let context {
            let outcome = PlaybackOutcome.classify(listened: lastPlaybackTime, duration: previous.duration)
            let record = record(for: previous, in: context)
            switch outcome {
            case .skip: record.skips += 1
            case .fullPlay: record.fullPlays += 1
            case .partial: break
            }
            try? context.save()
        }

        lastEntryTrackID = newID
        lastPlaybackTime = 0
        currentTrack = tracksByID[newID]
        currentReasons = reasonsByID[newID] ?? [.random]
    }

    private func record(for track: Track, in context: ModelContext) -> TrackRecord {
        let id = track.id.rawValue
        if let existing = try? context.fetch(FetchDescriptor<TrackRecord>(
            predicate: #Predicate { $0.trackID == id })).first {
            return existing
        }
        let record = TrackRecord(trackID: id, title: track.title)
        context.insert(record)
        return record
    }
}

private extension Track {
    /// When the track was added to the library, used for "new song" weighting.
    var addedDate: Date? {
        switch self {
        case .song(let song): return song.libraryAddedDate
        case .musicVideo(let video): return video.libraryAddedDate
        @unknown default: return nil
        }
    }
}
