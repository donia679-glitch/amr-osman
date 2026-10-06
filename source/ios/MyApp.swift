import SwiftUI

/// NOVERA Studio: the whole design app runs inside, offline, from the Web folder.
@main
struct NoveraStudioApp: App {
    @StateObject private var store = SubscriptionStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
        }
    }
}

let noveraGreen = Color(red: 0.055, green: 0.165, blue: 0.094)

struct RootView: View {
    @EnvironmentObject var store: SubscriptionStore

    var body: some View {
        ZStack {
            noveraGreen.ignoresSafeArea()
            if !SubscriptionStore.required || store.isSubscribed {
                NoveraWebView()
                    .ignoresSafeArea(.container, edges: .bottom)
            } else {
                PaywallView()
            }
        }
        .preferredColorScheme(nil)
        .task { await store.refresh() }
    }
}
