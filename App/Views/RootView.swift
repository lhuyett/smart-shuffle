import SwiftUI
import MusicKit

struct RootView: View {
    @StateObject private var library = MusicLibrary()
    @StateObject private var player = PlayerController()
    @StateObject private var settings = SettingsStore()

    var body: some View {
        NavigationStack {
            Group {
                if library.authorization == .authorized {
                    List(library.playlists) { playlist in
                        NavigationLink(playlist.name) {
                            PlayerView(playlist: playlist)
                        }
                    }
                    .refreshable { await library.loadPlaylists() }
                    .task { await library.loadPlaylists() }
                } else {
                    ContentUnavailableView {
                        Label("Connect Apple Music", systemImage: "music.note")
                    } description: {
                        Text("Smart Shuffle plays your playlists and learns what you skip.")
                    } actions: {
                        Button("Connect") { Task { await library.requestAccess() } }
                            .buttonStyle(.borderedProminent)
                    }
                }
            }
            .navigationTitle("Playlists")
            .toolbar {
                NavigationLink { SettingsView() } label: { Image(systemName: "slider.horizontal.3") }
            }
        }
        .environmentObject(library)
        .environmentObject(player)
        .environmentObject(settings)
    }
}
