// NOVERA Studio — realistic rendering for the 3D view.
// 1) the live "render" look: time of day, ceiling spots, LED strips that really light the counter,
//    ambient occlusion in the corners (GTAO) and a soft glow on the LEDs (bloom);
// 2) the final render: a progressive path tracer (three-gpu-pathtracer) that traces real light bounces,
//    soft shadows, reflections and glass, and saves a big still image.
// Scene units are centimetres (1 unit = 1 cm), so light intensities are scaled for that.

export const SCENE_DEF = { time: "day", exposure: 1, spots: true, led: true, ao: true, bloom: true, sunAz: 0, bevel: 2 };

export const TIMES = {
  day: { label: "نهار", sun: 2.8, sunColor: 0xfff6ea, elev: 50, hemi: 0.18, env: 0.26, ptEnv: 0.5, bg: 0xe9ece6, bgDark: 0x1f2622, spot: 0.25, led: 2.2 },
  evening: { label: "مغرب", sun: 1.6, sunColor: 0xffbf86, elev: 18, hemi: 0.08, env: 0.12, ptEnv: 0.3, bg: 0xd8c6b2, bgDark: 0x2a241f, spot: 0.8, led: 4 },
  night: { label: "ليل", sun: 0, sunColor: 0xffffff, elev: 50, hemi: 0.07, env: 0.07, ptEnv: 0.035, bg: 0x1b1f23, bgDark: 0x121518, spot: 1, led: 7 },
};

const SPOT_CD = 90000; // candela for a ceiling spot (≈ 1.4 lux-equivalent on the floor 2.5 m below)
const LED_NITS = 16;

export function sceneOf(state) {
  state.scene = { ...SCENE_DEF, ...(state.scene || {}) };
  return state.scene;
}

/** ceiling spots over the furniture + an area light under every LED strip */
export function lightRig(view, s, box, wallH) {
  const THREE = view.three;
  if (view.rig) { view.scene.remove(view.rig); view.rig.traverse((o) => o.dispose?.()); }
  const rig = (view.rig = new THREE.Group());
  view.scene.add(rig);
  const T = TIMES[s.time] || TIMES.day;
  if (box.isEmpty()) return rig;
  // in a room the spots sit in its ceiling; a lone unit gets them higher up and further forward
  const H = wallH ? Math.max(wallH, box.max.y + 25) : Math.max(box.max.y + 120, 260);
  const ahead = wallH ? 35 : 70;
  // spots: over the front of every unit, merged when closer than 80 cm, plus a centre light for the room
  if (s.spots && T.spot > 0) {
    const pts = [];
    for (const ug of view.pickables || []) {
      const b = new THREE.Box3().setFromObject(ug);
      if (b.isEmpty()) continue;
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(ug.getWorldQuaternion(new THREE.Quaternion()));
      const half = (Math.abs(fwd.x) * (b.max.x - b.min.x) + Math.abs(fwd.z) * (b.max.z - b.min.z)) / 2;
      const c = b.getCenter(new THREE.Vector3()).addScaledVector(fwd, half + ahead - 25);
      const w = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
      const n = Math.max(1, Math.round(w / 110));
      const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
      for (let i = 0; i < n; i++) pts.push(c.clone().addScaledVector(side, (i - (n - 1) / 2) * (w / n)));
    }
    if (!pts.length) pts.push(box.getCenter(new THREE.Vector3()));
    const merged = [];
    for (const p of pts) if (!merged.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 80)) merged.push(p);
    for (const p of merged.slice(0, 10)) {
      const L = new THREE.SpotLight(0xffd9a8, SPOT_CD * T.spot, 0, 0.95, 0.75, 2);
      L.position.set(p.x, H - 2, p.z);
      L.target.position.set(p.x, 0, p.z);
      L.userData.spot = true;
      rig.add(L, L.target);
      // a small glowing disc in the ceiling plane so the light has a visible source in the final render
      const disc = new THREE.Mesh(new THREE.CircleGeometry(4, 20), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff1d6, emissiveIntensity: 3 * T.spot }));
      disc.rotation.x = Math.PI / 2;
      disc.position.set(p.x, H - 0.5, p.z);
      disc.userData.fixture = true;
      rig.add(disc);
    }
  }
  // LED strips: each emissive strip gets a rectangular light — strips under a shelf/cabinet shine down,
  // upright strips (in the cabinet sides) shine into the cabinet
  if (s.led) {
    let n = 0;
    const Y = new THREE.Vector3(0, 1, 0), down = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0));
    for (const ug of view.pickables || []) {
      const uc = new THREE.Box3().setFromObject(ug).getCenter(new THREE.Vector3());
      ug.traverse((o) => {
        if (!o.isMesh || !o.userData.led || n >= 16) return;
        o.geometry.computeBoundingBox();
        const b = o.geometry.boundingBox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
        if (Math.max(sx, sy, sz) < 8) return;
        o.updateMatrixWorld(true);
        const c = b.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld);
        let L;
        if (sy <= Math.max(sx, sz)) {
          const along = (sx >= sz ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)).transformDirection(o.matrixWorld);
          L = new THREE.RectAreaLight(0xffdca0, LED_NITS * T.led, Math.max(sx, sz), Math.max(Math.min(sx, sz), 1.5));
          L.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(Y, Math.atan2(-along.z, along.x)).multiply(down));
          L.position.copy(c).addScaledVector(Y, -sy / 2 - 0.3);
        } else {
          const nrm = uc.clone().sub(c); nrm.y = 0;
          if (nrm.lengthSq() < 1e-6) return;
          nrm.normalize();
          L = new THREE.RectAreaLight(0xffdca0, LED_NITS * T.led * 0.8, Math.max(Math.min(sx, sz), 1.5), sy);
          L.position.copy(c).addScaledVector(nrm, 0.5);
          L.lookAt(c.clone().add(nrm));
        }
        L.userData.led = true;
        rig.add(L);
        n++;
      });
    }
  }
  return rig;
}

/** apply the time of day to the view's sun/sky/background and to every material's env reflection */
export function applyTime(view, s, dark) {
  const THREE = view.three, T = TIMES[s.time] || TIMES.day;
  view.hemi.intensity = T.hemi;
  view.sun.intensity = T.sun;
  view.sun.color.set(T.sunColor);
  view.sun.visible = T.sun > 0;
  view.fill.intensity = T.sun > 0 ? 0.3 * (T.sun / 2.2) : 0;
  view.ren.toneMappingExposure = s.exposure;
  view.scene.background = new THREE.Color(view.stageBg || (dark ? T.bgDark : T.bg));
  view.group?.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      if (!m) continue;
      if ("envMapIntensity" in m) m.envMapIntensity = m.userData.mirror ? 1 : T.env * (m.userData.refl ?? 1);
      if (o.userData.led && m.emissive) { m.emissiveIntensity = s.led ? T.led : 0.05; m.color?.set(s.led ? 0xfff0d0 : 0xd8d2c4); }
    }
  });
}

/** where the sun comes from: elevation by time of day, azimuth by the user's slider, aimed at the design */
export function placeSun(view, s, box) {
  const THREE = view.three, T = TIMES[s.time] || TIMES.day;
  const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const R = Math.max(sz.x, sz.z, 200) * 0.75;
  // the sun comes over the viewer's left shoulder (plus the user's turn), so shadows fall onto the walls you look at
  const cv = view.cam.position.clone().sub(view.ctl.target); cv.y = 0;
  const camAz = cv.lengthSq() > 1e-6 ? Math.atan2(cv.x, cv.z) : 0;
  const el = (T.elev * Math.PI) / 180, az = camAz + ((s.sunAz - 40) * Math.PI) / 180;
  const D = R * 3;
  view.sun.position.set(c.x + Math.sin(az) * Math.cos(el) * D, c.y + Math.sin(el) * D, c.z + Math.cos(az) * Math.cos(el) * D);
  view.sun.target.position.copy(c);
  const sc = view.sun.shadow.camera;
  sc.left = sc.bottom = -R * 1.4; sc.right = sc.top = R * 1.4; sc.near = 1; sc.far = D * 2.5;
  sc.updateProjectionMatrix();
  view.sun.shadow.mapSize.set(2048, 2048);
  view.sun.shadow.bias = -0.0004;
  view.sun.shadow.normalBias = 0.6;
  view.sun.shadow.radius = 4;
}

// ------------------------------------------------------------------ live post effects
export class Post {
  constructor(view) { this.view = view; this.ready = false; this.failed = false; }
  async init() {
    if (this.ready || this.failed || this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { UnrealBloomPass }, { OutputPass }, { RectAreaLightUniformsLib }] = await Promise.all([
          import("three/addons/postprocessing/EffectComposer.js"), import("three/addons/postprocessing/RenderPass.js"),
          import("three/addons/postprocessing/GTAOPass.js"), import("three/addons/postprocessing/UnrealBloomPass.js"),
          import("three/addons/postprocessing/OutputPass.js"), import("three/addons/lights/RectAreaLightUniformsLib.js")]);
        RectAreaLightUniformsLib.init();
        const v = this.view, THREE = v.three;
        const size = v.ren.getSize(new THREE.Vector2());
        const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
        this.composer = new EffectComposer(v.ren, rt);
        this.renderPass = new RenderPass(v.scene, v.cam);
        this.gtao = new GTAOPass(v.scene, v.cam, size.x, size.y);
        this.gtao.blendIntensity = 1;
        this.gtao.updateGtaoMaterial({ radius: 34, distanceExponent: 1.6, thickness: 10, scale: 1.5, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
        this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1, rings: 2, samples: 16 });
        this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.45, 2.4);
        this.out = new OutputPass();
        for (const p of [this.renderPass, this.gtao, this.bloom, this.out]) this.composer.addPass(p);
        this.resize();
        this.ready = true;
      } catch (e) { console.warn("post effects unavailable", e); this.failed = true; }
    })();
    return this.loading;
  }
  configure(s) {
    if (!this.ready) return;
    this.gtao.enabled = !!s.ao;
    this.bloom.enabled = !!s.bloom && s.led;
  }
  resize() {
    if (!this.composer) return;
    const r = this.view.ren, THREE = this.view.three;
    const sz = r.getSize(new THREE.Vector2());
    this.composer.setPixelRatio(r.getPixelRatio());
    this.composer.setSize(sz.x, sz.y);
  }
  render() { this.composer.render(); }
  /** render once at w × h into the (already resized) canvas, for a snapshot */
  renderTo(w, h) {
    this.composer.setPixelRatio(1);
    this.composer.setSize(w, h);
    this.composer.render();
  }
}

// ------------------------------------------------------------------ final render (path tracing)
export const PT_QUALITY = { fast: ["سريع", 120], high: ["عالي", 500], max: ["أقصى جودة", 2000] };
export const PT_SIZES = { screen: ["قد الشاشة", 1], hd: ["Full HD", 1920], k4: ["4K", 3840] };

export class FinalRender {
  constructor(view) { this.view = view; this.active = false; this.pt = null; }
  async load() {
    if (this.lib) return this.lib;
    // three r160 scenes have no environment/background rotation yet; the tracer reads them (identity is right for us)
    const THREE = this.view.three, probe = new THREE.Scene();
    if (!probe.environmentRotation) THREE.Scene.prototype.environmentRotation = new THREE.Euler();
    if (!probe.backgroundRotation) THREE.Scene.prototype.backgroundRotation = new THREE.Euler();
    const [lib, pass] = await Promise.all([import("three-gpu-pathtracer"), import("three/addons/postprocessing/Pass.js")]);
    this.lib = { ...lib, FullScreenQuad: pass.FullScreenQuad };
    return this.lib;
  }
  /** start tracing the current view; opts: { quality, size, denoise }, ui(progress) gets called while it runs */
  async start(opts, ui) {
    const v = this.view, THREE = v.three;
    this.opts = opts; this.ui = ui;
    ui({ phase: "load" });
    const lib = await this.load();
    if (!this.pt) {
      this.pt = new lib.WebGLPathTracer(v.ren);
      this.pt.tiles.set(2, 2);
      this.pt.renderDelay = 0;
      this.pt.fadeDuration = 0;
      this.pt.minSamples = 1;
      this.pt.filterGlossyFactor = 0.5;
      this.pt.bounces = 6;
      this.pt.textureSize.set(1024, 1024);
      this.denoiseQuad = new lib.FullScreenQuad(new lib.DenoiseMaterial({ map: null, blending: THREE.NoBlending, premultipliedAlpha: v.ren.getContextAttributes().premultipliedAlpha }));
      this.denoiseQuad.material.sigma = 2.2; this.denoiseQuad.material.threshold = 0.08; this.denoiseQuad.material.kSigma = 1;
      const base = this.pt.renderToCanvasCallback;
      this.pt.renderToCanvasCallback = (target, renderer, quad) => {
        if (this.opts?.denoise && this.pt.samples > 4) {
          const dq = this.denoiseQuad, k = Math.min(1, 40 / Math.max(this.pt.samples, 1));
          dq.material.sigma = 1.6 + 3 * k; dq.material.threshold = 0.03 + 0.17 * k;
          dq.material.map = target.texture;
          const ac = renderer.autoClear; renderer.autoClear = false; dq.render(renderer); renderer.autoClear = ac;
        } else base(target, renderer, quad);
      };
    }
    // the scene as the tracer should see it
    ui({ phase: "build" });
    await new Promise((r) => setTimeout(r, 30));
    this.swap = prepareForTrace(v);
    this.resize();
    this.keepEnv = v.scene.environment;
    v.scene.environment = v.envCube || null;
    v.scene.environmentIntensity = (TIMES[v.sceneSettings?.time] || TIMES.day).ptEnv;
    this.sig = this.cutForTrace();
    this.pt.setScene(v.scene, v.cam);
    this.target = PT_QUALITY[opts.quality]?.[1] || 500;
    // the camera stays put while tracing — a touch on the screen must not throw the picture away
    this.locked = true;
    v.ctl.enabled = false;
    this.t0 = performance.now();
    this.active = true;
    this.paused = false;
    this.pt.pausePathTracing = false;
    ui({ phase: "run", samples: 0, target: this.target });
  }
  /** the canvas renders at the chosen size; the page shows it scaled to fit */
  resize() {
    const v = this.view, r = v.ren, el = r.domElement;
    const w = v.host.clientWidth || 800, h = v.host.clientHeight || 600;
    const long = PT_SIZES[this.opts.size]?.[1] || 1;
    let W, H;
    if (long === 1) { W = Math.round(w * Math.min(devicePixelRatio, 2)); H = Math.round(h * Math.min(devicePixelRatio, 2)); }
    else if (w >= h) { W = long; H = Math.round((long * h) / w); }
    else { H = long; W = Math.round((long * w) / h); }
    this.keepSize ??= { pr: r.getPixelRatio() };
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    el.style.width = w + "px"; el.style.height = h + "px";
    v.cam.aspect = W / H; v.cam.updateProjectionMatrix();
    this.size = [W, H];
  }
  tick() {
    if (!this.active) return;
    const v = this.view;
    if (v.ctl.update() || this.camMoved) {
      this.camMoved = false;
      // walls that turn see-through with the camera change the materials, so the tracer needs the scene again
      const sig = this.cutForTrace();
      if (sig !== this.sig) { this.sig = sig; this.pt.setScene(v.scene, v.cam); } else this.pt.updateCamera();
      this.t0 = performance.now();
    }
    const done = this.pt.samples >= this.target;
    this.pt.pausePathTracing = done || this.paused;
    this.pt.renderSample();
    if ((this.frame = (this.frame || 0) + 1) % 6 === 0 || done) this.ui({ phase: done ? "done" : this.paused ? "paused" : "run", samples: Math.floor(this.pt.samples), target: this.target, secs: (performance.now() - this.t0) / 1000, size: this.size });
  }
  /** the traced picture as a PNG data URL (call any time; denoised when that option is on) */
  grab() {
    this.pt.pausePathTracing = true;
    this.pt.renderSample();
    const url = this.view.ren.domElement.toDataURL("image/png");
    this.pt.pausePathTracing = this.paused || this.pt.samples >= this.target;
    return url;
  }
  /** the walls in front of the camera stay in the scene but turn "matte" (invisible to the camera, still in
   * reflections and bounced light) — so mirrors, glossy fronts and the floor reflect a whole room */
  cutForTrace() {
    const v = this.view;
    v.cutaway();
    const sig = (v.walls || []).map((w) => (w.visible ? 1 : 0)).join("");
    this.matte ??= new Map();
    const matteOf = (m) => {
      if (!m) return m;
      if (!this.matte.has(m.uuid)) { const c = m.clone(); c.matte = true; c.castShadow = false; this.matte.set(m.uuid, c); }
      return this.matte.get(m.uuid);
    };
    for (const w of v.walls || []) {
      const cut = !w.visible;
      w.visible = true;
      w.traverse((o) => {
        if (!o.isMesh) return;
        if (!o.userData.ptOrig) o.userData.ptOrig = o.material;
        const m0 = o.userData.ptOrig;
        o.material = cut ? (Array.isArray(m0) ? m0.map(matteOf) : matteOf(m0)) : m0;
      });
    }
    return sig;
  }
  uncut() {
    for (const w of this.view.walls || []) w.traverse((o) => { if (o.userData.ptOrig) { o.material = o.userData.ptOrig; delete o.userData.ptOrig; } });
    for (const m of this.matte?.values() || []) m.dispose();
    this.matte = null;
    this.view.cutaway();
  }
  /** unlock to re-frame (every camera move restarts the picture), lock again to keep it */
  setLocked(on) {
    this.locked = on;
    this.view.ctl.enabled = !on;
  }
  stop() {
    if (!this.active) return;
    const v = this.view, r = v.ren;
    this.active = false;
    v.ctl.enabled = true;
    this.uncut();
    restoreAfterTrace(v, this.swap);
    v.scene.environment = this.keepEnv;
    r.setPixelRatio(this.keepSize?.pr || Math.min(devicePixelRatio, 2));
    this.keepSize = null;
    v.resize();
    v.dirty = true;
  }
}

/** glass → real refraction, mirrors → perfect reflection; hide the selection outline and helper lines */
function prepareForTrace(view) {
  const THREE = view.three, swaps = [];
  // every unit builds its own materials; the tracer is faster (and safer) with one material per look
  const shared = new Map();
  const keyOf = (m) => [m.type, m.color?.getHexString(), m.map?.uuid || "", m.roughness, m.metalness, m.clearcoat ?? 0, !!m.matte, m.transparent, m.opacity, m.side, m.emissive?.getHexString(), m.emissiveIntensity, m.userData?.glass, m.userData?.mirror].join("|");
  const share = (m) => { if (!m) return m; const k = keyOf(m); if (!shared.has(k)) shared.set(k, m); return shared.get(k); };
  // multi-material meshes (walls: caps + face finish) are split into one mesh per material — the tracer
  // mixes up material indices on grouped geometry
  const multi = [];
  view.scene.traverse((o) => { if (o.isMesh && Array.isArray(o.material) && o.visible) multi.push(o); });
  for (const o of multi) {
    const geo = o.geometry, groups = geo.groups.length ? geo.groups : [{ start: 0, count: geo.index ? geo.index.count : geo.attributes.position.count, materialIndex: 0 }];
    for (const gr of groups) {
      const m = o.material[gr.materialIndex];
      if (!m) continue;
      let g2;
      if (geo.index) { g2 = geo.clone(); g2.clearGroups(); g2.setIndex(Array.from(geo.index.array.slice(gr.start, gr.start + gr.count))); }
      else {
        g2 = new THREE.BufferGeometry();
        for (const [name, at] of Object.entries(geo.attributes)) g2.setAttribute(name, new THREE.BufferAttribute(at.array.slice(gr.start * at.itemSize, (gr.start + gr.count) * at.itemSize), at.itemSize, at.normalized));
      }
      const part = new THREE.Mesh(g2, m);
      part.position.copy(o.position); part.quaternion.copy(o.quaternion); part.scale.copy(o.scale);
      part.userData = { ...o.userData, split: true };
      o.parent.add(part);
      swaps.push([part, "add"]);
    }
    o.visible = false;
    swaps.push([o, "vis"]);
  }
  view.scene.traverse((o) => {
    if (!o.isMesh || o.userData.selFoot || (view.selGlass || []).includes(o)) return;
    const m = o.material, n = Array.isArray(m) ? m.map(share) : share(m);
    if (Array.isArray(m) ? n.some((x, i) => x !== m[i]) : n !== m) { swaps.push([o, "share", m]); o.material = n; }
  });
  view.scene.traverse((o) => {
    if (o.isLineSegments || o.isLine || o.userData.selFoot || (view.selGlass || []).includes(o)) { if (o.visible) { o.visible = false; swaps.push([o, "vis"]); } return; }
    if (!o.isMesh) return;
    const m = o.material;
    if (Array.isArray(m)) return;
    if (m?.userData?.glass) {
      const g = new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, roughness: 0.04, metalness: 0, transmission: 1, ior: 1.5, thickness: 0.6, transparent: false });
      swaps.push([o, "mat", m]); o.material = g;
    } else if (m?.userData?.mirror) {
      const g = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.02, metalness: 1 });
      swaps.push([o, "mat", m]); o.material = g;
    }
  });
  return swaps;
}
function restoreAfterTrace(view, swaps = []) {
  for (const [o, kind, m] of swaps.slice().reverse()) {
    if (kind === "vis") o.visible = true;
    else if (kind === "add") { o.parent?.remove(o); o.geometry.dispose(); }
    else if (kind === "share") o.material = m;
    else { o.material.dispose(); o.material = m; }
  }
}
