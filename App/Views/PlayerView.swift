import SwiftUI
import SwiftData
import MusicKit
import SmartShuffleCore

/// Paper screens 1 (Smart Shuffle toggle) and 6 (Why this song?).
struct PlayerView: View {
    let playlist: Playlist

    @EnvironmentObject private var library: MusicLibrary
    @EnvironmentObject private var player: PlayerController
    @EnvironmentObject private var settings: SettingsStore
    @Environment(\.modelContext) private var context

    @State private var tracks: [Track] = []
    @State private var error: String?

    var body: some View {
        VStack(spacing: 24) {
            if let track = player.currentTrack {
                if let artwork = track.artwork {
                    ArtworkImage(artwork, width: 260)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                VStack(spacing: 4) {
                    Text(track.title).font(.title2.bold())
                    Text(track.artistName).foregroundStyle(.secondary)
                }
                WhyThisSongCard(reasons: player.currentReasons)
            } else {
                Spacer()
                Text("\(tracks.count) songs").foregroundStyle(.secondary)
            }

            Spacer()

            HStack(spacing: 32) {
                Button { Task { await startPlaying() } } label: {
                    Image(systemName: "shuffle").font(.title)
                }
                Button { Task { await player.togglePlayPause() } } label: {
                    Image(systemName: player.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 64))
                }
                Button { Task { await player.skip() } } label: {
                    Image(systemName: "forward.fill").font(.title)
                }
            }

            Toggle(isOn: $settings.smartShuffleOn) {
                VStack(alignment: .leading) {
                    Text("Smart Shuffle").bold()
                    Text("Learns what you skip").font(.caption).foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal)

            if let error { Text(error).foregroundStyle(.red).font(.caption) }
        }
        .padding()
        .navigationTitle(playlist.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            NavigationLink { PairsView(playlistID: playlist.id.rawValue, tracks: tracks) } label: {
                Image(systemName: "link")
            }
            NavigationLink { HealthView(tracks: tracks) } label: {
                Image(systemName: "heart.text.square")
            }
        }
        .task {
            do { tracks = try await library.tracks(in: playlist) } catch { self.error = error.localizedDescription }
        }
    }

    private func startPlaying() async {
        do {
            try await player.play(playlistID: playlist.id.rawValue, tracks: tracks,
                                  settings: settings, context: context)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct WhyThisSongCard: View {
    let reasons: [PlayReason]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Why this song?", systemImage: "questionmark.circle").font(.caption.bold())
            ForEach(reasons, id: \.self) { reason in
                Text("• " + reason.text).font(.caption)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}
