import SwiftUI

/// Paper screens 2 (skip learning) and 4 (new song bias).
struct SettingsView: View {
    @EnvironmentObject private var settings: SettingsStore

    var body: some View {
        Form {
            Section {
                Stepper("Lower a song after \(settings.skipThreshold) skips",
                        value: $settings.skipThreshold, in: 1...10)
                Toggle("Move heavily skipped songs to Low Priority", isOn: $settings.autoLowPriority)
            } header: {
                Text("Skip learning")
            } footer: {
                Text("Songs skipped more than \(settings.skipThreshold * 2) times move to a Low Priority section, where you can review or remove them.")
            }

            Section("New songs vs. favorites") {
                Picker("Bias", selection: $settings.newSongBias) {
                    Text("New first").tag(1.0)
                    Text("Balanced").tag(0.0)
                    Text("Favorites first").tag(-1.0)
                }
                .pickerStyle(.segmented)
            }
        }
        .navigationTitle("Smart Shuffle")
    }
}
