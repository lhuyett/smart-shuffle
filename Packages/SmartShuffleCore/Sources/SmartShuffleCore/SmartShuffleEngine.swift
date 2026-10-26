import Foundation

/// Builds a Smart Shuffle play order from track stats and user settings.
/// Pure Swift with an injectable RNG so it can be unit tested.
public struct SmartShuffleEngine {
    public var settings: ShuffleSettings
    public var now: Date

    static let minimumWeight = 0.05
    static let skipDecay = 0.6
    static let maxBoost = 1.5

    public init(settings: ShuffleSettings, now: Date = Date()) {
        self.settings = settings
        self.now = now
    }

    // MARK: Categorization

    public func isNew(_ track: TrackStats) -> Bool {
        guard let added = track.dateAdded else { return false }
        let window = TimeInterval(settings.newSongWindowDays) * 86_400
        return now.timeIntervalSince(added) <= window
    }

    public func isFavorite(_ track: TrackStats) -> Bool {
        if track.isStarred { return true }
        guard track.totalPlays >= 3 else { return false }
        return Double(track.fullPlays) / Double(track.totalPlays) >= 0.7
    }

    public func isLowPriority(_ track: TrackStats) -> Bool {
        settings.autoLowPriority
            && track.effectiveSkips >= Double(settings.skipThreshold * 2)
    }

    public func category(of track: TrackStats) -> TrackCategory {
        if isLowPriority(track) { return .lowPriority }
        if track.effectiveSkips >= Double(settings.skipThreshold) { return .oftenSkipped }
        if isNew(track) { return .new }
        if isFavorite(track) { return .favorite }
        return .normal
    }

    // MARK: Weighting

    public func weight(of track: TrackStats) -> (Double, [PlayReason]) {
        var weight = 1.0
        var reasons: [PlayReason] = []

        let overThreshold = track.effectiveSkips - Double(settings.skipThreshold) + 1
        if overThreshold > 0 {
            weight *= pow(Self.skipDecay, overThreshold)
            reasons.append(.playedLessFromSkips(skips: track.skips))
        }

        let bias = settings.newSongBias
        if isNew(track) {
            weight *= 1 + max(0, bias) * Self.maxBoost
            reasons.append(.recentlyAdded)
        } else if isFavorite(track) {
            weight *= 1 + max(0, -bias) * Self.maxBoost
            reasons.append(.favorite)
        }

        if reasons.isEmpty { reasons.append(.random) }
        return (max(Self.minimumWeight, weight), reasons)
    }

    // MARK: Ordering

    public func shuffle<R: RandomNumberGenerator>(
        _ tracks: [TrackStats], pairs: [SongPair], using rng: inout R
    ) -> ShuffleResult {
        let lowPriority = tracks.filter(isLowPriority)
        let active = tracks.filter { !isLowPriority($0) }
        let byID = Dictionary(active.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })

        // Follow pair chains (A→B→C) so each chain becomes one unit led by its head.
        var next: [String: String] = [:]
        for pair in pairs where byID[pair.firstID] != nil && byID[pair.secondID] != nil {
            next[pair.firstID] = pair.secondID
        }
        let followers = Set(next.values)

        var units: [(weight: Double, items: [QueuedTrack])] = []
        var placed: Set<String> = []
        func addUnit(startingAt track: TrackStats) {
            let (w, reasons) = weight(of: track)
            var items = [QueuedTrack(id: track.id, reasons: reasons)]
            placed.insert(track.id)
            var current = track
            while let nextID = next[current.id], !placed.contains(nextID), let follower = byID[nextID] {
                items.append(QueuedTrack(id: follower.id, reasons: [.pairedAfter(title: current.title)]))
                placed.insert(nextID)
                current = follower
            }
            units.append((w, items))
        }
        for track in active where !followers.contains(track.id) && !placed.contains(track.id) {
            addUnit(startingAt: track)
        }
        // Pair cycles (A→B→A) have no head; break them at the first unplaced track.
        for track in active where !placed.contains(track.id) {
            addUnit(startingAt: track)
        }

        // Weighted sampling without replacement: key = u^(1/w), highest first.
        let keyed = units.map { unit -> (Double, [QueuedTrack]) in
            let u = Double.random(in: Double.ulpOfOne..<1, using: &rng)
            return (pow(u, 1 / unit.weight), unit.items)
        }
        let queue = keyed.sorted { $0.0 > $1.0 }.flatMap { $0.1 }
        return ShuffleResult(queue: queue, lowPriority: lowPriority)
    }

    public func shuffle(_ tracks: [TrackStats], pairs: [SongPair]) -> ShuffleResult {
        var rng = SystemRandomNumberGenerator()
        return shuffle(tracks, pairs: pairs, using: &rng)
    }
}

/// Decides whether a track change was a skip or a full listen.
public enum PlaybackOutcome: Equatable, Sendable {
    case skip, fullPlay, partial

    public static func classify(listened: TimeInterval, duration: TimeInterval?) -> PlaybackOutcome {
        guard let duration, duration > 0 else {
            return listened < 30 ? .skip : .partial
        }
        if listened < min(30, duration * 0.5) { return .skip }
        if listened >= duration * 0.9 { return .fullPlay }
        return .partial
    }
}
