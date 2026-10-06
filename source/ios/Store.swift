import StoreKit
import SwiftUI

/// The subscription (monthly / yearly) through Apple. Without an active one the app shows the paywall.
@MainActor
final class SubscriptionStore: ObservableObject {
    /// ⚠️ stays false while testing; set to true once the subscription exists in App Store Connect
    static let required = false
    /// the "Subscription Group ID" from App Store Connect → the app → Subscriptions
    static let groupID = "00000000"
    /// the Product IDs of the subscriptions (same as in App Store Connect)
    static let productIDs: Set<String> = ["novera.studio.monthly", "novera.studio.yearly"]

    @Published var isSubscribed = false
    private var updates: Task<Void, Never>?

    init() {
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let t) = result { await t.finish() }
                await self?.refresh()
            }
        }
    }

    func refresh() async {
        var active = false
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result, Self.productIDs.contains(t.productID), t.revocationDate == nil {
                active = true
            }
        }
        isSubscribed = active
    }
}

/// the app's language: the user's choice inside the app, else the device's
var isArabic: Bool {
    if let l = UserDefaults.standard.string(forKey: "novera-lang") { return l != "en" }
    return (Locale.preferredLanguages.first ?? "ar").hasPrefix("ar")
}

struct PaywallView: View {
    @EnvironmentObject var store: SubscriptionStore

    var body: some View {
        SubscriptionStoreView(groupID: SubscriptionStore.groupID) {
            VStack(spacing: 14) {
                Text("N")
                    .font(.system(size: 54, weight: .heavy))
                    .foregroundStyle(noveraGreen)
                    .frame(width: 96, height: 96)
                    .background(RoundedRectangle(cornerRadius: 26).fill(Color(red: 0.85, green: 0.65, blue: 0.23)))
                Text("NOVERA Studio").font(.largeTitle.bold())
                Text(isArabic ? "صمّم المطابخ والدريسنج والأثاث، وطلّع خطة القص والملصقات ودليل التجميع وعرض السعر." : "Design kitchens, wardrobes and furniture, then get the cutting plan, labels, assembly guide and quotation.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
            }
            .padding()
        }
        .storeButton(.visible, for: .restorePurchases)
        .subscriptionStorePolicyDestination(url: URL(string: "https://donia679-glitch.github.io/amr-osman/studio/legal/privacy.html")!, for: .privacyPolicy)
        .subscriptionStorePolicyDestination(url: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!, for: .termsOfService)
        .onInAppPurchaseCompletion { _, _ in await store.refresh() }
        .environment(\.layoutDirection, isArabic ? .rightToLeft : .leftToRight)
    }
}
