import XCTest
@testable import SmartShuffleCore

/// Deterministic RNG so shuffle tests are repeatable.
struct SeededRNG: RandomNumberGenerator {
    var state: UInt64
    mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
}

final class SmartShuffleEngineTests: XCTestCase {
    let now = Date(timeIntervalSince1970: 1_800_000_000)

    func testEveryActiveTrackAppearsExactlyOnce() {
        let tracks = (0..<30).map { TrackStats(id: "\($0)", title: "Song \($0)") }
        var rng = SeededRNG(state: 1)
        let result = SmartShuffleEngine(settings: .init(), now: now).shuffle(tracks, pairs: [], using: &rng)
        XCTAssertEqual(Set(result.queue.map(\.id)), Set(tracks.map(\.id)))
        XCTAssertEqual(result.queue.count, 30)
    }

    func testPairedSongsPlayBackToBack() {
        let tracks = (0..<20).map { TrackStats(id: "\($0)", title: "Song \($0)") }
        let pairs = [SongPair(firstID: "3", secondID: "4"), SongPair(firstID: "4", secondID: "5")]
        for seed in 0..<50 {
            var rng = SeededRNG(state: UInt64(seed))
            let ids = SmartShuffleEngine(settings: .init(), now: now)
                .shuffle(tracks, pairs: pairs, using: &rng).queue.map(\.id)
            let i = ids.firstIndex(of: "3")!
            XCTAssertEqual(Array(ids[i...i + 2]), ["3", "4", "5"])
        }
    }

    func testPairCycleDoesNotDropTracks() {
        let tracks = [TrackStats(id: "a", title: "A"), TrackStats(id: "b", title: "B")]
        let pairs = [SongPair(firstID: "a", secondID: "b"), SongPair(firstID: "b", secondID: "a")]
        var rng = SeededRNG(state: 7)
        let result = SmartShuffleEngine(settings: .init(), now: now).shuffle(tracks, pairs: pairs, using: &rng)
        // A full cycle has no head; both tracks must still be in the queue.
        XCTAssertEqual(Set(result.queue.map(\.id)), ["a", "b"])
    }

    func testHeavilySkippedSongMovesToLowPriority() {
        let engine = SmartShuffleEngine(settings: .init(skipThreshold: 3, autoLowPriority: true), now: now)
        let skipped = TrackStats(id: "x", title: "X", skips: 6)
        var rng = SeededRNG(state: 2)
        let result = engine.shuffle([skipped, TrackStats(id: "y", title: "Y")], pairs: [], using: &rng)
        XCTAssertEqual(result.lowPriority.map(\.id), ["x"])
        XCTAssertEqual(result.queue.map(\.id), ["y"])
    }

    func testSkipsLowerWeightButNeverToZero() {
        let engine = SmartShuffleEngine(settings: .init(skipThreshold: 2, autoLowPriority: false), now: now)
        let (fresh, _) = engine.weight(of: TrackStats(id: "a", title: "A"))
        let (skipped, reasons) = engine.weight(of: TrackStats(id: "b", title: "B", skips: 50))
        XCTAssertLessThan(skipped, fresh)
        XCTAssertGreaterThanOrEqual(skipped, SmartShuffleEngine.minimumWeight)
        XCTAssertEqual(reasons.first, .playedLessFromSkips(skips: 50))
    }

    func testNewSongBiasBoostsRecentlyAdded() {
        let newTrack = TrackStats(id: "n", title: "N", dateAdded: now.addingTimeInterval(-86_400))
        let newFirst = SmartShuffleEngine(settings: .init(newSongBias: 1), now: now)
        let favFirst = SmartShuffleEngine(settings: .init(newSongBias: -1), now: now)
        XCTAssertGreaterThan(newFirst.weight(of: newTrack).0, favFirst.weight(of: newTrack).0)
    }

    func testClassifyPlayback() {
        XCTAssertEqual(PlaybackOutcome.classify(listened: 5, duration: 200), .skip)
        XCTAssertEqual(PlaybackOutcome.classify(listened: 195, duration: 200), .fullPlay)
        XCTAssertEqual(PlaybackOutcome.classify(listened: 100, duration: 200), .partial)
    }
}
