import UIKit
import RoomPlan

/// Apple RoomPlan room scan (LiDAR): walls, doors and windows with their sizes, handed to the app as JSON.
final class RoomScanController: UIViewController, RoomCaptureViewDelegate {
    var onDone: ((String?) -> Void)?
    private var captureView: RoomCaptureView!
    private var result: CapturedRoom?
    private let doneButton = UIButton(type: .system)
    private let useButton = UIButton(type: .system)
    private let cancelButton = UIButton(type: .system)

    static var isSupported: Bool { RoomCaptureSession.isSupported }

    init() { super.init(nibName: nil, bundle: nil) }
    required init?(coder: NSCoder) { super.init(coder: coder) }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        captureView = RoomCaptureView(frame: view.bounds)
        captureView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        captureView.delegate = self
        view.addSubview(captureView)

        style(cancelButton, "إلغاء", .systemGray)
        style(doneButton, "خلصت المسح", UIColor(red: 0.12, green: 0.43, blue: 0.24, alpha: 1))
        style(useButton, "استخدم المسح ✓", UIColor(red: 0.69, green: 0.49, blue: 0.07, alpha: 1))
        useButton.isHidden = true
        cancelButton.addTarget(self, action: #selector(cancel), for: .touchUpInside)
        doneButton.addTarget(self, action: #selector(finish), for: .touchUpInside)
        useButton.addTarget(self, action: #selector(useScan), for: .touchUpInside)
        let bar = UIStackView(arrangedSubviews: [cancelButton, doneButton, useButton])
        bar.axis = .horizontal
        bar.spacing = 12
        bar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bar)
        NSLayoutConstraint.activate([
            bar.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            bar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16)
        ])
    }

    private func style(_ b: UIButton, _ title: String, _ color: UIColor) {
        b.setTitle(title, for: .normal)
        b.titleLabel?.font = .boldSystemFont(ofSize: 18)
        b.setTitleColor(.white, for: .normal)
        b.backgroundColor = color
        b.layer.cornerRadius = 14
        b.contentEdgeInsets = UIEdgeInsets(top: 12, left: 22, bottom: 12, right: 22)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        captureView.captureSession.run(configuration: RoomCaptureSession.Configuration())
    }

    @objc private func finish() {
        doneButton.isEnabled = false
        captureView.captureSession.stop()
    }

    @objc private func cancel() {
        captureView.captureSession.stop()
        dismiss(animated: true) { self.onDone?(nil) }
    }

    @objc private func useScan() {
        guard let room = result, let data = try? JSONEncoder().encode(room), let json = String(data: data, encoding: .utf8) else { cancel(); return }
        dismiss(animated: true) { self.onDone?(json) }
    }

    // RoomCaptureViewDelegate
    func captureView(shouldPresent roomDataForProcessing: CapturedRoomData, error: Error?) -> Bool { true }

    func captureView(didPresent processedResult: CapturedRoom, error: Error?) {
        result = processedResult
        doneButton.isHidden = true
        useButton.isHidden = false
    }
}
