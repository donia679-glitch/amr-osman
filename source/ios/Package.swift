// swift-tools-version: 5.8
// NOVERA Studio — iPad / iPhone app (Swift Playgrounds project). The design app itself lives in Web/.

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "NOVERA Studio",
    platforms: [
        .iOS("17.0") // the subscription screen (SubscriptionStoreView) needs iOS 17
    ],
    products: [
        .iOSApplication(
            name: "NOVERA Studio",
            targets: ["AppModule"],
            bundleIdentifier: "com.novera.studio",
            displayVersion: "1.0",
            bundleVersion: "1",
            appIcon: .asset("AppIcon"),
            accentColor: .presetColor(.green),
            supportedDeviceFamilies: [
                .pad,
                .phone
            ],
            supportedInterfaceOrientations: [
                .portrait,
                .landscapeRight,
                .landscapeLeft,
                .portraitUpsideDown(.when(deviceFamilies: [.pad]))
            ],
            capabilities: [
                .camera(purposeString: "NOVERA Studio uses the camera to scan the room with its measurements and to photograph walls and materials for your design. · الكاميرا لمسح الأوضة بالمقاسات وتصوير الحيطان والخامات للتصميم."),
                .microphone(purposeString: "NOVERA Studio uses the microphone only when you record a voice note during a site survey. · الميكروفون لتسجيل ملاحظة صوتية وانت بترفع المقاسات بس."),
                .photoLibraryAdd(purposeString: "NOVERA Studio saves the images you export (renders, plans, labels) to your photo library when you choose to. · لحفظ الصور اللي بتصدّرها (ريندر، مسقط، ملصقات) في الصور لما تختار ده.")
            ]
        )
    ],
    targets: [
        .executableTarget(
            name: "AppModule",
            path: ".",
            resources: [
                .copy("Web"),
                .copy("PrivacyInfo.xcprivacy")
            ]
        )
    ]
)
