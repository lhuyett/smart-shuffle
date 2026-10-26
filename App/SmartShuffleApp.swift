import SwiftUI
import SwiftData

@main
struct SmartShuffleApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(for: [TrackRecord.self, PairRecord.self])
    }
}
