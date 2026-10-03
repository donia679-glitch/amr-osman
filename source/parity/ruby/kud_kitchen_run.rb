# =============================================================================
# Kitchen-unit parity recorder — ONE file, used two ways:
#   1. Inside the REAL SketchUp: copy this file + kitchen_in.json into the plugin root and load it
#      with the plugin's dev_reload. It builds every case of kitchen_in.json with the installed
#      plugin (inside an operation that is ABORTED after each case — nothing stays in the model),
#      records the result and writes kitchen_out.json next to this file.
#   2. In the plain-Ruby fake (parity/ruby/dump_kitchen.rb loads it with KUD_PARITY_NO_AUTORUN set):
#      same recording code, so both sides emit the exact same format/rounding.
# Uses only public SketchUp API on the recording side.
# =============================================================================
require 'json'
require 'stringio'

module KudKitchenParity
  module_function

  ATTR_SKIP = %w[params_json label_data_json].freeze
  CAM_PREFIX = "ثقب تجميع (قفل كام)".freeze

  def kud; ::KitchenUnitDesigner; end
  def in2cm(v); v.to_f / kud::Helpers.cm(1.0); end

  def r(v, nd = 6)
    x = v.to_f.round(nd)
    x.zero? ? 0.0 : x
  end

  def deep_round(o)
    case o
    when Float then r(o)
    when Array then o.map { |x| deep_round(x) }
    when Hash then o.each_with_object({}) { |(k, v), h| h[k.to_s] = deep_round(v) }
    when Symbol then o.to_s
    else o
    end
  end

  def inst?(e)
    e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
  end

  def sub_entities(e)
    e.is_a?(Sketchup::Group) ? e.entities : e.definition.entities
  end

  def kud_attrs(e, skip = [])
    d = e.attribute_dictionary("KUD")
    return {} unless d

    h = {}
    d.each_pair { |k, v| h[k.to_s] = deep_round(v) unless skip.include?(k.to_s) }
    h.sort.to_h
  end

  def layer_name(e)
    l = e.layer
    l.respond_to?(:name) ? l.name.to_s : ""
  end

  def mat_name(m)
    m.respond_to?(:name) ? m.name.to_s : ""
  end

  # ------------------------------------------------------------- vector helpers ([x,y,z] cm)
  def newell(pts)
    nx = ny = nz = 0.0
    n = pts.size
    n.times do |i|
      a = pts[i]
      b = pts[(i + 1) % n]
      nx += (a[1] - b[1]) * (a[2] + b[2])
      ny += (a[2] - b[2]) * (a[0] + b[0])
      nz += (a[0] - b[0]) * (a[1] + b[1])
    end
    [nx, ny, nz]
  end

  def vlen(v); Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); end
  def vsub(a, b); [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; end
  def vdot(a, b); a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; end

  # sign-normalize a direction: its largest-magnitude component (first on ties) is positive
  def canon_dir(n)
    m = n.map(&:abs).max
    i = n.index { |c| c.abs >= m - 1e-9 }
    n[i] < 0 ? n.map { |c| -c } : n
  end

  def world_pt(tr, v)
    p = tr * v.position
    [in2cm(p.x), in2cm(p.y), in2cm(p.z)]
  end

  # ------------------------------------------------------------- shape analysis
  def analyze(faces, tr)
    fl = faces.map do |f|
      loops = f.loops.map { |l| [l.outer?, l.vertices.map { |v| world_pt(tr, v) }] }
      outer = loops.find(&:first)[1]
      nv = newell(outer)
      area = vlen(nv) / 2.0
      loops.each { |o, pts| area -= vlen(newell(pts)) / 2.0 unless o }
      l = vlen(nv)
      n = l > 0 ? nv.map { |c| c / l } : [0.0, 0.0, 0.0]
      cn = canon_dir(n)
      { outer: outer, all: loops.flat_map(&:last), n: cn, d: vdot(cn, outer[0]), area: area, mat: mat_name(f.material) }
    end

    verts = fl.flat_map { |f| f[:all] }
    bb = [0, 1, 2].map { |i| verts.map { |p| p[i] }.min } + [0, 1, 2].map { |i| verts.map { |p| p[i] }.max }

    # material by area (dominant) + per-plane material breakdown
    tot = Hash.new(0.0)
    fl.each { |f| tot[f[:mat]] += f[:area] }
    best = tot.values.max
    dom = tot.keys.select { |k| tot[k] >= best - 1e-6 }.min

    planes = {}
    fl.each do |f|
      key = f[:n].map { |c| r(c) } + [r(f[:d], 4)]
      pl = (planes[key] ||= { area: 0.0, mats: Hash.new(0.0) })
      pl[:area] += f[:area]
      pl[:mats][f[:mat]] += f[:area]
    end
    fm = planes.keys.sort.filter_map do |k|
      other = planes[k][:mats].reject { |m, a| m == dom || a < 1e-9 }
      next if other.empty?

      k + [other.sort.to_h.transform_values { |a| r(a, 4) }]
    end

    out = { bbox: bb.map { |v| r(v) }, mat: dom }
    out[:fm] = fm unless fm.empty?

    if box?(fl, planes, bb)
      out[:kind] = "box"
    elsif (cyl = cylinder(fl))
      out.merge!(cyl)
    else
      out[:kind] = "solid"
      out[:planes] = planes.keys.sort.map { |k| k + [r(planes[k][:area], 4)] }
      out[:verts] = verts.map { |p| p.map { |c| r(c) } }.uniq.sort
    end
    out
  end

  def box?(fl, planes, bb)
    return false unless fl.all? { |f| f[:n].map(&:abs).max > 1 - 1e-9 }

    want = {}
    3.times do |a|
      n = [0.0, 0.0, 0.0]
      n[a] = 1.0
      o = [0, 1, 2] - [a]
      rect = (bb[o[0] + 3] - bb[o[0]]) * (bb[o[1] + 3] - bb[o[1]])
      want[n + [r(bb[a], 4)]] = rect
      want[n + [r(bb[a + 3], 4)]] = rect
    end
    return false unless want.keys.sort == planes.keys.sort

    return false unless want.all? { |k, a| (planes[k][:area] - a).abs <= 1e-6 * [a, 1.0].max }

    fl.all? do |f|
      f[:all].all? { |p| (0..2).any? { |i| (p[i] - bb[i]).abs < 1e-6 || (p[i] - bb[i + 3]).abs < 1e-6 } }
    end
  end

  # 16-gon (or any >= 12-gon) extrusion: exactly two big parallel caps + quads
  def cylinder(fl)
    caps = fl.select { |f| f[:outer].size >= 12 }
    return nil unless caps.size == 2 && fl.size == caps[0][:outer].size + 2
    return nil unless caps[0][:outer].size == caps[1][:outer].size
    return nil unless (fl - caps).all? { |f| f[:outer].size == 4 }

    c0, c1 = caps.map { |c| [0, 1, 2].map { |i| c[:outer].sum { |p| p[i] } / c[:outer].size } }
    axis = vsub(c1, c0)
    len = vlen(axis)
    return nil if len <= 0

    u = canon_dir(axis.map { |x| x / len })
    rad = caps[0][:outer].map { |p| vlen(vsub(p, c0)) }.sum / caps[0][:outer].size
    { kind: "cyl", c: [0, 1, 2].map { |i| r((c0[i] + c1[i]) / 2.0) }, axis: u.map { |x| r(x) }, r: r(rad), len: r(len), n: caps[0][:outer].size }
  end

  # ------------------------------------------------------------- traversal
  def walk(ents, tr, path, out)
    ents.to_a.each do |e|
      next unless inst?(e)

      t = tr * e.transformation
      sub = sub_entities(e)
      faces = sub.grep(Sketchup::Face)
      kids = sub.to_a.select { |c| inst?(c) }
      name = e.name.to_s
      if faces.any? || kids.empty?
        rec = { path: path, name: name, layer: layer_name(e), attrs: kud_attrs(e) }
        rec[:hidden] = true unless e.visible?
        rec[:imat] = mat_name(e.material) if e.material
        rec.merge!(faces.any? ? analyze(faces, t) : { kind: "empty" })
        out[:parts] << rec
      end
      next if kids.empty?

      g = { path: path, name: name, layer: layer_name(e), attrs: kud_attrs(e) }
      g[:has_faces] = true if faces.any?
      bb = Geom::BoundingBox.new
      collect_points(sub, t, bb)
      g[:bbox] = [in2cm(bb.min.x), in2cm(bb.min.y), in2cm(bb.min.z), in2cm(bb.max.x), in2cm(bb.max.y), in2cm(bb.max.z)].map { |v| r(v) } unless bb.empty?
      out[:groups] << g
      walk(sub, t, path + [name], out)
    end
  end

  def collect_points(ents, tr, bb)
    ents.to_a.each do |e|
      if e.is_a?(Sketchup::Face)
        e.vertices.each { |v| bb.add(tr * v.position) }
      elsif inst?(e)
        collect_points(sub_entities(e), tr * e.transformation, bb)
      end
    end
  end

  def label_rows(list, unit_id)
    list.select { |p| p[:unit_id] == unit_id }.map { |p| deep_round(p.reject { |k, _| k == :unit_id }) }
  end

  def hardware(group)
    bom = kud::HardwareBOM
    stats = bom.empty_stats
    bom.add_leg_or_hanger_hardware(group, stats)
    bom.scan_entities(group.entities, stats)
    stats.transform_keys(&:to_s)
  end

  def record(group)
    out = { parts: [], groups: [] }
    walk(group.entities, group.transformation, [], out)
    uid = group.entityID
    ld = kud::LabelData
    {
      unit: { name: group.name.to_s, layer: layer_name(group), attrs: kud_attrs(group, ATTR_SKIP) },
      joint_sets: out[:parts].count { |p| p[:name].start_with?(CAM_PREFIX) },
      hardware: hardware(group),
      labels: label_rows(ld.pieces, uid),
      assembly_marks: label_rows(ld.assembly_marks, uid),
      divider_marks: label_rows(ld.divider_marks, uid),
      groups: out[:groups],
      parts: out[:parts]
    }
  end

  # ------------------------------------------------------------- build (what Runner.run does to
  # one unit: BuilderFactory → build at x=0 → wall lift → unit attributes; no wall/selection/repeat)
  def build(params)
    model = Sketchup.active_model
    builder = kud::BuilderFactory.for(params)
    group = builder.build(model.entities, 0)
    unit_type = params["unit_type"].to_s
    unit_type = "base" if unit_type.empty?
    z_offset = unit_type == "wall" ? params["wall_mount_height"].to_f : 0.0
    group.transformation *= Geom::Transformation.translation([0, 0, kud::Helpers.cm(z_offset)]) if z_offset != 0
    group.set_attribute("KUD", "is_kitchen_unit", true)
    group.set_attribute("KUD", "category", params["unit_category"].to_s)
    group.set_attribute("KUD", "params_json", params.to_json)
    unit_pieces = kud::LabelData.pieces.select { |p| p[:unit_id] == group.entityID }
    group.set_attribute("KUD", "label_data_json", unit_pieces.to_json) unless unit_pieces.empty?
    group
  end

  # one case → result hash. `wrap` runs the build inside an operation (real) or a fresh model (fake).
  def run_case(c)
    params = JSON.parse(JSON.generate(c["params"]))
    ld = kud::LabelData
    marks = [ld.pieces.size, ld.assembly_marks.size, ld.divider_marks.size]
    res = { name: c["name"], params: params, ok: true, error: nil }
    old_out = $stdout
    log = StringIO.new
    begin
      $stdout = log # the plugin reports rescued problems with puts — keep them in the fixture
      group = build(params)
      res.merge!(record(group))
    rescue StandardError => e
      res[:ok] = false
      res[:error] = "#{e.class}: #{e.message}"
    ensure
      $stdout = old_out
      res[:log] = log.string.lines.map(&:chomp)
      ld.pieces.slice!(marks[0]..)
      ld.assembly_marks.slice!(marks[1]..)
      ld.divider_marks.slice!(marks[2]..)
    end
    res
  end

  # ------------------------------------------------------------- real SketchUp driver
  def run_in_sketchup(dir)
    model = Sketchup.active_model
    inp = JSON.parse(File.read(File.join(dir, "kitchen_in.json"), encoding: "UTF-8"))
    pref = kud::Handles::PREF
    key = kud::Handles::PREF_DEFAULT
    old_default = Sketchup.read_default(pref, key, "")
    vis = model.layers.to_a.map { |l| [l, l.visible?] }
    results = []
    t0 = Time.now
    begin
      Sketchup.write_default(pref, key, "") # no global handles default during the run
      vis.each { |l, _| l.visible = true }   # HardwareBOM skips hidden tags
      inp["cases"].each do |c|
        model.start_operation("KUD kitchen parity", true)
        begin
          results << run_case(c)
        ensure
          model.abort_operation
        end
      end
    ensure
      Sketchup.write_default(pref, key, old_default.to_s)
      vis.each { |l, v| l.visible = v if l.valid? }
    end
    File.write(File.join(dir, "kitchen_out.json"),
               JSON.generate(ruby: RUBY_VERSION, platform: RUBY_PLATFORM, sketchup: Sketchup.version,
                             secs: Time.now - t0, cases: results))
  rescue Exception => e # rubocop:disable Lint/RescueException
    File.write(File.join(dir, "kitchen_out.json"), JSON.generate(error: "#{e.class}: #{e.message}", bt: e.backtrace&.first(8)))
  end
end

KudKitchenParity.run_in_sketchup(File.dirname(__FILE__)) unless defined?(KUD_PARITY_NO_AUTORUN)
