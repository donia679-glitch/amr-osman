import SwiftUI
import WebKit
import ARKit

/// Shows the app from the bundled Web folder through a private "novera://" address, so it works with no internet
/// and keeps its projects (IndexedDB / localStorage) like a normal app.
struct NoveraWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(context.coordinator, forURLScheme: "novera")
        config.userContentController.add(context.coordinator, name: "noveraSave")
        config.userContentController.add(context.coordinator, name: "noveraScan")
        config.userContentController.add(context.coordinator, name: "noveraAR")
        config.userContentController.add(context.coordinator, name: "noveraLang")
        config.userContentController.add(context.coordinator, name: "noveraVault")
        // tell the page what this device can do (the room scan needs a LiDAR iPad / iPhone Pro)
        config.userContentController.addUserScript(WKUserScript(source: "window.noveraNative = { scan: \(RoomScanController.isSupported ? "true" : "false"), ar: \(ARWorldTrackingConfiguration.isSupported ? "true" : "false") };", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.allowsInlineMediaPlayback = true
        config.websiteDataStore = .default()

        let web = WKWebView(frame: .zero, configuration: config)
        let bg = UIColor(red: 0.055, green: 0.165, blue: 0.094, alpha: 1)
        web.isOpaque = false
        web.backgroundColor = bg
        web.scrollView.backgroundColor = bg
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsLinkPreview = false
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }
        #endif
        context.coordinator.webView = web
        if context.coordinator.root == nil {
            web.loadHTMLString("<html dir='rtl'><body style='font:20px -apple-system;padding:40px;color:#fff;background:#0e2a18'>NOVERA Studio couldn't load its files. Please reinstall the app. · ملفات التطبيق مش موجودة — نزّل التطبيق تاني.</body></html>", baseURL: nil)
        } else {
            web.load(URLRequest(url: URL(string: "novera://localhost/index.html")!))
        }
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKURLSchemeHandler, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
        weak var webView: WKWebView?

        /// the Web folder inside the app
        let root: URL? = {
            // the Web folder can sit in the app itself or in the package's resource bundle inside it
            if let u = Bundle.main.url(forResource: "Web", withExtension: nil) { return u }
            let fm = FileManager.default
            let base = Bundle.main.bundleURL
            for name in (try? fm.contentsOfDirectory(atPath: base.path)) ?? [] where name.hasSuffix(".bundle") {
                let b = base.appendingPathComponent(name)
                for c in [b.appendingPathComponent("Web"), b.appendingPathComponent("Contents/Resources/Web")] where fm.fileExists(atPath: c.path) { return c }
            }
            for b in Bundle.allBundles { if let u = b.url(forResource: "Web", withExtension: nil) { return u } }
            return nil
        }()

        // MARK: serve the bundled files
        func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
            guard let url = task.request.url, let root else {
                task.didFailWithError(URLError(.fileDoesNotExist))
                return
            }
            var path = url.path
            if path.isEmpty || path == "/" { path = "/index.html" }
            let file = root.appendingPathComponent(String(path.dropFirst()))
            guard let data = try? Data(contentsOf: file) else {
                let r = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "text/plain"])!
                task.didReceive(r)
                task.didReceive(Data())
                task.didFinish()
                return
            }
            let headers = [
                "Content-Type": Coordinator.mime(file.pathExtension),
                "Content-Length": "\(data.count)",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache"
            ]
            task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!)
            task.didReceive(data)
            task.didFinish()
        }

        func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

        static func mime(_ ext: String) -> String {
            switch ext.lowercased() {
            case "html": return "text/html; charset=utf-8"
            case "js", "mjs": return "text/javascript; charset=utf-8"
            case "css": return "text/css; charset=utf-8"
            case "json", "webmanifest": return "application/json"
            case "png": return "image/png"
            case "jpg", "jpeg": return "image/jpeg"
            case "svg": return "image/svg+xml"
            case "ttf": return "font/ttf"
            case "woff2": return "font/woff2"
            default: return "application/octet-stream"
            }
        }

        // MARK: exported files (PDF, Excel, pictures …) → the iOS share sheet
        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "noveraScan" { startScan(); return }
            if message.name == "noveraAR" { showAR(message.body); return }
            if message.name == "noveraLang", let l = message.body as? String { UserDefaults.standard.set(l, forKey: "novera-lang"); return }
            if message.name == "noveraVault" { vault(message.body); return }
            guard message.name == "noveraSave",
                  let body = message.body as? [String: Any],
                  let name = body["name"] as? String,
                  let b64 = body["b64"] as? String,
                  let data = Data(base64Encoded: b64) else { return }
            let safe = name.replacingOccurrences(of: "/", with: "-")
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(safe)
            do { try data.write(to: url, options: .atomic) } catch { return }
            DispatchQueue.main.async {
                guard let top = Coordinator.topController(), let web = self.webView else { return }
                let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                sheet.popoverPresentationController?.sourceView = web
                sheet.popoverPresentationController?.sourceRect = CGRect(x: web.bounds.midX, y: 70, width: 1, height: 1)
                top.present(sheet, animated: true)
            }
        }

        // MARK: the projects vault — every project is also kept as a file in Documents/Projects
        // so nothing is lost when WebKit clears its storage (not shown in the Files app — the app reads them back itself).
        static var vaultDir: URL? {
            guard let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return nil }
            let dir = docs.appendingPathComponent("Projects", isDirectory: true)
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            return dir
        }
        func vault(_ body: Any) {
            guard let b = body as? [String: Any], let op = b["op"] as? String, let dir = Coordinator.vaultDir else { return }
            let token = b["token"] as? String
            func reply(_ json: String) {
                guard let token = token else { return }
                let t = token.replacingOccurrences(of: "'", with: "")
                DispatchQueue.main.async { self.webView?.evaluateJavaScript("window.noveraVaultResult && window.noveraVaultResult('\(t)', \(json))") }
            }
            let safeId: (String) -> String = { $0.filter { $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" } }
            switch op {
            case "put":
                guard let id = b["id"] as? String, let json = b["json"] as? String else { return }
                let url = dir.appendingPathComponent("\(safeId(id)).novera.json")
                try? json.data(using: .utf8)?.write(to: url, options: .atomic)
            case "list":
                var items: [[String: Any]] = []
                let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.fileSizeKey], options: [])) ?? []
                for f in files where f.lastPathComponent.hasSuffix(".novera.json") {
                    guard let data = try? Data(contentsOf: f),
                          let rec = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                          let id = rec["id"] as? String else { continue }
                    items.append(["id": id, "name": rec["name"] as? String ?? "", "updatedAt": rec["updatedAt"] as? String ?? "", "size": data.count])
                }
                if let d = try? JSONSerialization.data(withJSONObject: items), let s = String(data: d, encoding: .utf8) { reply(s) } else { reply("[]") }
            case "get":
                guard let id = b["id"] as? String else { reply("null"); return }
                let url = dir.appendingPathComponent("\(safeId(id)).novera.json")
                if let s = try? String(contentsOf: url, encoding: .utf8), let d = try? JSONSerialization.data(withJSONObject: s, options: [.fragmentsAllowed]), let q = String(data: d, encoding: .utf8) { reply(q) } else { reply("null") }
            default: break
            }
        }

        // MARK: AR — the design standing in the room at its real size
        func showAR(_ body: Any) {
            guard let b = body as? [String: Any], let b64 = b["b64"] as? String, let data = Data(base64Encoded: b64) else { return }
            let name = ((b["name"] as? String) ?? "NOVERA.usdz").replacingOccurrences(of: "/", with: "-")
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
            do { try data.write(to: url, options: .atomic) } catch { return }
            DispatchQueue.main.async {
                guard let top = Coordinator.topController() else { return }
                ARPreview.shared.show(fileURL: url, from: top)
            }
        }

        // MARK: room scan (RoomPlan) → the page builds the walls from it
        func startScan() {
            DispatchQueue.main.async {
                guard let top = Coordinator.topController() else { return }
                guard RoomScanController.isSupported else {
                    self.webView?.evaluateJavaScript("window.noveraScanError && window.noveraScanError('الجهاز ده مفيهوش حساس LiDAR — المسح محتاج آيباد برو أو آيفون برو.')")
                    return
                }
                let scan = RoomScanController()
                scan.modalPresentationStyle = .fullScreen
                scan.onDone = { [weak self] json in
                    guard let json else { return }
                    self?.webView?.evaluateJavaScript("window.noveraRoomScan && window.noveraRoomScan(\(json))")
                }
                top.present(scan, animated: true)
            }
        }

        static func topController() -> UIViewController? {
            let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
            var top = scene?.windows.first(where: { $0.isKeyWindow })?.rootViewController ?? scene?.windows.first?.rootViewController
            while let next = top?.presentedViewController { top = next }
            return top
        }

        // MARK: links to the outside (WhatsApp, websites) open in their own apps
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = action.request.url, url.scheme != "novera", url.scheme != "blob", url.scheme != "data", url.scheme != "about" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        @available(iOS 15.0, *)
        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(.grant) // the app's own pages only (voice notes / wall photos); iOS still asks the user once
        }
        // MARK: alert() / confirm() from the page (WKWebView shows nothing unless the app presents them)
        private var isArabic: Bool { (UserDefaults.standard.string(forKey: "novera-lang") ?? Locale.preferredLanguages.first ?? "ar").hasPrefix("ar") }
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            guard let top = Coordinator.topController() else { completionHandler(); return }
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: isArabic ? "تمام" : "OK", style: .default) { _ in completionHandler() })
            top.present(a, animated: true)
        }
        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            guard let top = Coordinator.topController() else { completionHandler(false); return }
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: isArabic ? "لأ" : "Cancel", style: .cancel) { _ in completionHandler(false) })
            a.addAction(UIAlertAction(title: isArabic ? "أيوه" : "OK", style: .default) { _ in completionHandler(true) })
            top.present(a, animated: true)
        }
        func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
            guard let top = Coordinator.topController() else { completionHandler(nil); return }
            let a = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
            a.addTextField { $0.text = defaultText }
            a.addAction(UIAlertAction(title: isArabic ? "إلغاء" : "Cancel", style: .cancel) { _ in completionHandler(nil) })
            a.addAction(UIAlertAction(title: isArabic ? "تمام" : "OK", style: .default) { _ in completionHandler(a.textFields?.first?.text) })
            top.present(a, animated: true)
        }
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url, url.scheme != "novera" { UIApplication.shared.open(url) }
            return nil
        }
    }
}
