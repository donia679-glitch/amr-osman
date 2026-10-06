import UIKit
import AVFoundation

/// Apple's own QR reader (AVFoundation) for the part labels — the web view has no QR decoder on iOS,
/// so the page asks for this one (message "noveraQR") and gets the text back in window.noveraQRResult(text).
final class QRScanController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onCode: ((String) -> Void)?
    var onError: ((String) -> Void)?

    private let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "novera.qr")
    private var preview: AVCaptureVideoPreviewLayer?
    private var rotation: AVCaptureDevice.RotationCoordinator?
    private var rotationObs: NSKeyValueObservation?
    private var done = false
    private var appeared = false
    private var pendingError: String?

    private var isArabic: Bool { (UserDefaults.standard.string(forKey: "novera-lang") ?? Locale.preferredLanguages.first ?? "ar").hasPrefix("ar") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        addOverlay()
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: setUp()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { ok in
                DispatchQueue.main.async { ok ? self.setUp() : self.fail(self.deniedText) }
            }
        default: fail(deniedText)
        }
    }

    private var deniedText: String {
        isArabic ? "التطبيق مش مسموحله بالكاميرا — افتح الإعدادات ← NOVERA Studio ← الكاميرا وشغّلها، أو اكتب رقم القطعة."
                 : "The app has no camera access — turn it on in Settings → NOVERA Studio → Camera, or type the part number."
    }

    private func setUp() {
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) ?? AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device), session.canAddInput(input) else {
            fail(isArabic ? "مفيش كاميرا متاحة على الجهاز ده — اكتب رقم القطعة." : "No camera available on this device — type the part number.")
            return
        }
        session.addInput(input)
        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else { fail(isArabic ? "الكاميرا مش قادرة تقرا QR." : "The camera can't read QR codes."); return }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        if output.availableMetadataObjectTypes.contains(.qr) { output.metadataObjectTypes = [.qr] }

        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        layer.frame = view.bounds
        view.layer.insertSublayer(layer, at: 0)
        preview = layer
        // keep the picture upright whichever way the iPad is held
        let coord = AVCaptureDevice.RotationCoordinator(device: device, previewLayer: layer)
        rotation = coord
        rotationObs = coord.observe(\.videoRotationAngleForHorizonLevelPreview, options: [.initial, .new]) { [weak layer] c, _ in
            DispatchQueue.main.async {
                guard let conn = layer?.connection, conn.isVideoRotationAngleSupported(c.videoRotationAngleForHorizonLevelPreview) else { return }
                conn.videoRotationAngle = c.videoRotationAngleForHorizonLevelPreview
            }
        }
        queue.async { self.session.startRunning() }
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        appeared = true
        if let e = pendingError { pendingError = nil; fail(e) }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        preview?.frame = view.bounds
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        rotationObs = nil
        queue.async { if self.session.isRunning { self.session.stopRunning() } }
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput objects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard appeared, !done, let code = objects.compactMap({ ($0 as? AVMetadataMachineReadableCodeObject)?.stringValue }).first, !code.isEmpty else { return }
        done = true
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        dismiss(animated: true) { self.onCode?(code) }
    }

    private func fail(_ text: String) {
        // can't dismiss while the screen is still sliding in — wait for viewDidAppear
        guard appeared else { pendingError = text; return }
        guard !done else { return }
        done = true
        dismiss(animated: true) { self.onError?(text) }
    }

    @objc private func close() {
        done = true
        dismiss(animated: true)
    }

    // the frame, the hint and the close button over the camera
    private func addOverlay() {
        let frame = UIView()
        frame.translatesAutoresizingMaskIntoConstraints = false
        frame.layer.borderColor = UIColor.white.withAlphaComponent(0.9).cgColor
        frame.layer.borderWidth = 3
        frame.layer.cornerRadius = 18
        view.addSubview(frame)

        let hint = UILabel()
        hint.translatesAutoresizingMaskIntoConstraints = false
        hint.text = isArabic ? "وجّه الكاميرا على الـQR اللي على ملصق القطعة" : "Point the camera at the QR code on the part label"
        hint.textColor = .white
        hint.font = .systemFont(ofSize: 18, weight: .semibold)
        hint.textAlignment = .center
        hint.numberOfLines = 0
        hint.backgroundColor = UIColor.black.withAlphaComponent(0.45)
        hint.layer.cornerRadius = 12
        hint.clipsToBounds = true
        view.addSubview(hint)

        let x = UIButton(type: .system)
        x.translatesAutoresizingMaskIntoConstraints = false
        x.setTitle(isArabic ? "قفل" : "Close", for: .normal)
        x.titleLabel?.font = .systemFont(ofSize: 18, weight: .bold)
        x.setTitleColor(.white, for: .normal)
        x.backgroundColor = UIColor(red: 0.12, green: 0.43, blue: 0.24, alpha: 1)
        x.layer.cornerRadius = 14
        x.contentEdgeInsets = UIEdgeInsets(top: 12, left: 28, bottom: 12, right: 28)
        x.addTarget(self, action: #selector(close), for: .touchUpInside)
        view.addSubview(x)

        NSLayoutConstraint.activate([
            frame.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            frame.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            frame.widthAnchor.constraint(equalTo: frame.heightAnchor),
            frame.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.6).withPriority(.defaultHigh),
            frame.widthAnchor.constraint(lessThanOrEqualTo: view.heightAnchor, multiplier: 0.5),
            hint.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            hint.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            hint.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            hint.heightAnchor.constraint(greaterThanOrEqualToConstant: 52),
            x.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            x.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
        ])
    }
}

private extension NSLayoutConstraint {
    func withPriority(_ p: UILayoutPriority) -> NSLayoutConstraint { priority = p; return self }
}
