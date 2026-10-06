import UIKit
import QuickLook
import ARKit

/// Shows a design in the real room with Apple AR Quick Look (true scale, on the floor).
final class ARPreview: NSObject, QLPreviewControllerDataSource {
    static let shared = ARPreview()
    private var file: URL?

    func show(fileURL: URL, from top: UIViewController) {
        file = fileURL
        let ql = QLPreviewController()
        ql.dataSource = self
        ql.currentPreviewItemIndex = 0
        ql.modalPresentationStyle = .fullScreen
        top.present(ql, animated: true)
    }

    func numberOfPreviewItems(in controller: QLPreviewController) -> Int { file == nil ? 0 : 1 }

    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        let item = ARQuickLookPreviewItem(fileAt: file!)
        item.allowsContentScaling = false // keep it at its real size
        return item
    }
}
