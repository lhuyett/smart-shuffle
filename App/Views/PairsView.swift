import SwiftUI
import SwiftData
import MusicKit

/// Paper screen 3: songs that always play back to back.
struct PairsView: View {
    let playlistID: String
    let tracks: [Track]

    @Environment(\.modelContext) private var context
    @Query private var allPairs: [PairRecord]
    @State private var firstID: String?
    @State private var secondID: String?

    private var pairs: [PairRecord] { allPairs.filter { $0.playlistID == playlistID } }
    private func title(_ id: String) -> String { tracks.first { $0.id.rawValue == id }?.title ?? "Unknown" }

    var body: some View {
        Form {
            Section("New pair") {
                Picker("Plays first (A)", selection: $firstID) {
                    Text("Choose").tag(String?.none)
                    ForEach(tracks) { Text($0.title).tag(Optional($0.id.rawValue)) }
                }
                Picker("Plays second (B)", selection: $secondID) {
                    Text("Choose").tag(String?.none)
                    ForEach(tracks) { Text($0.title).tag(Optional($0.id.rawValue)) }
                }
                Button("Add pair") {
                    guard let firstID, let secondID, firstID != secondID else { return }
                    context.insert(PairRecord(playlistID: playlistID, firstID: firstID, secondID: secondID))
                    self.firstID = nil
                    self.secondID = nil
                }
                .disabled(firstID == nil || secondID == nil || firstID == secondID)
            }

            Section("Pairs") {
                ForEach(pairs) { pair in
                    Text("\(title(pair.firstID))  →  \(title(pair.secondID))")
                }
                .onDelete { offsets in offsets.map { pairs[$0] }.forEach { context.delete($0) } }
            }
        }
        .navigationTitle("Song pairs")
    }
}
