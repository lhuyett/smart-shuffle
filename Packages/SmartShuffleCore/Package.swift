// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SmartShuffleCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "SmartShuffleCore", targets: ["SmartShuffleCore"])
    ],
    targets: [
        .target(name: "SmartShuffleCore"),
        .testTarget(name: "SmartShuffleCoreTests", dependencies: ["SmartShuffleCore"])
    ]
)
