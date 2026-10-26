import Foundation
import MusicKit

/// Apple Music sign-in and reading the user's library playlists.
@MainActor
final class MusicLibrary: ObservableObject {
    @Published var authorization: MusicAuthorization.Status = MusicAuthorization.currentStatus
    @Published var playlists: [Playlist] = []
    @Published var errorMessage: String?

    func requestAccess() async {
        authorization = await MusicAuthorization.request()
        if authorization == .authorized { await loadPlaylists() }
    }

    func loadPlaylists() async {
        do {
            var request = MusicLibraryRequest<Playlist>()
            request.sort(by: \.lastPlayedDate, ascending: false)
            playlists = Array(try await request.response().items)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func tracks(in playlist: Playlist) async throws -> [Track] {
        let detailed = try await playlist.with([.tracks])
        return Array(detailed.tracks ?? [])
    }
}
