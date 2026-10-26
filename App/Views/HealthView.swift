import SwiftUI
import SwiftData
import MusicKit
import SmartShuffleCore

/// Paper screen 5: playlist health dashboard.
struct HealthView: View {
    let tracks: [Track]

    @EnvironmentObject private var settings: SettingsStore
    @Query private var records: [TrackRecord]

    private var grouped: [TrackCategory: [TrackRecord]] {
        let ids = Set(tracks.map(\.id.rawValue))
        let engine = SmartShuffleEngine(settings: settings.shuffleSettings)
        return Dictionary(grouping: records.filter { ids.contains($0.trackID) }) {
            engine.category(of: $0.stats(dateAdded: nil))
        }
    }

    var body: some View {
        List {
            section("Favorites", .favorite, icon: "star.fill")
            section("New", .new, icon: "sparkles")
            section("Often skipped", .oftenSkipped, icon: "forward.end")
            section("Low priority", .lowPriority, icon: "arrow.down.to.line")
        }
        .navigationTitle("Playlist health")
    }

    @ViewBuilder
    private func section(_ title: String, _ category: TrackCategory, icon: String) -> some View {
        let items = grouped[category] ?? []
        Section {
            ForEach(items) { record in
                HStack {
                    Text(record.title)
                    Spacer()
                    Text("\(record.skips) skips · \(record.fullPlays) plays")
                        .font(.caption).foregroundStyle(.secondary)
                }
                .swipeActions {
                    // Clearing stats takes a song out of its category (e.g. no longer a favorite).
                    Button("Reset") {
                        record.skips = 0
                        record.fullPlays = 0
                        record.isStarred = false
                    }
                }
            }
        } header: {
            Label("\(title) (\(items.count))", systemImage: icon)
        }
    }
}
