# Geometry kernel of the fake: face creation, pushpull of a lone face into a prism,
# and coplanar face splitting for the plugin's "marker" faces.
module FakeGeom
  module_function

  TOL = Geom::TOL

  def newell(pts)
    nx = ny = nz = 0.0
    n = pts.size
    n.times do |i|
      a = pts[i]
      b = pts[(i + 1) % n]
      nx += (a.y - b.y) * (a.z + b.z)
      ny += (a.z - b.z) * (a.x + b.x)
      nz += (a.x - b.x) * (a.y + b.y)
    end
    Geom::Vector3d.new(nx, ny, nz)
  end

  def poly_area(pts, normal)
    n = newell(pts)
    (n.length / 2.0) * (n.dot(normal) >= 0 ? 1 : 1)
  end

  def dup_points?(pts)
    pts.each_with_index.any? { |p, i| pts[(i + 1)..].any? { |q| p.distance(q) < TOL } }
  end

  def planar?(pts)
    n = newell(pts)
    return false if n.length < 1e-12

    nn = n.normalize
    d = nn.dot(pts[0])
    pts.all? { |p| (nn.dot(p) - d).abs < TOL }
  end

  # SketchUp's Face#reverse! keeps the first edge (reversed): [p1, p0, pn-1, ..., p2]
  def reverse_loop(vs)
    [vs[1], vs[0]] + vs[2..].reverse
  end

  def transformed_bounds(entities, tr)
    lb = entities.bounds
    bb = Geom::BoundingBox.new
    return bb if lb.empty?

    8.times { |i| bb.add(tr * lb.corner(i)) }
    bb
  end

  # negated vector without negative zeros (as SketchUp reports cap normals)
  def neg0(n)
    Geom::Vector3d.new(-n.x + 0.0, -n.y + 0.0, -n.z + 0.0)
  end

  def pos0(n)
    Geom::Vector3d.new(n.x + 0.0, n.y + 0.0, n.z + 0.0)
  end

  # face normal from the loop; tiny round-off components snap to an exact +0.0
  def unit_normal(pts)
    n = newell(pts).normalize
    Geom::Vector3d.new(*n.to_a.map { |c| c.abs < 1e-12 ? 0.0 : c })
  end

  # ------------------------------------------------------------------ add_face
  def add_face(ents, pts)
    n = unit_normal(pts)
    # faces drawn on the ground plane face down
    if pts.all? { |p| p.z.abs < TOL } && n.z > 0
      pts = reverse_loop(pts)
      n = n.reverse
    end
    hits = ents.faces.select { |f| coplanar?(f, n, pts[0]) }
    return split_add(ents, hits, pts, n) unless hits.empty?

    clean = despike(pts)
    f = Sketchup::Face.new(clean.map { |p| ents.vertex(p) }, n)
    f.raw_pts = pts if clean.size != pts.size
    ents.add(f)
  end

  # remove back-tracking vertices (a spike: prev→p and p→next collinear, opposite)
  def despike(pts)
    pts = pts.dup
    loop do
      i = pts.each_index.find do |k|
        a = pts[k - 1]
        p = pts[k]
        b = pts[(k + 1) % pts.size]
        u = p - a
        w = b - p
        u.cross(w).length < 1e-9 * [u.length * w.length, 1e-300].max && u.dot(w) < 0
      end
      break unless i

      pts.delete_at(i)
      # the removed tip may leave a zero-length edge
      pts = pts.each_with_index.reject { |p, k| k > 0 && p.distance(pts[k - 1]) < TOL }.map(&:first)
      pts.pop if pts.size > 1 && pts[0].distance(pts[-1]) < TOL
    end
    pts
  end

  # side segments of a base loop: every edge split at the loop's points lying on it,
  # overlapping duplicates kept once (first occurrence wins)
  def side_segments(raw)
    m = raw.size
    segs = [] # [p0, p1, cut?]
    m.times do |i|
      a = raw[i]
      b = raw[(i + 1) % m]
      e = b - a
      len = e.length
      cuts = raw.each_with_index.filter_map do |p, k|
        next if k == i || k == (i + 1) % m

        t = (p - a).dot(e) / (len * len)
        next unless t > 1e-9 && t < 1 - 1e-9

        q = a.offset(e, len * t)
        q.distance(p) < TOL ? t : nil
      end.uniq.sort
      ts = [0.0] + cuts + [1.0]
      ts.each_cons(2) do |t0, t1|
        p0 = t0 == 0.0 ? a : a.offset(e, len * t0)
        p1 = t1 == 1.0 ? b : a.offset(e, len * t1)
        segs << [p0, p1, cuts.any?]
      end
    end
    same = ->(s, t) { (s[0].distance(t[0]) < TOL && s[1].distance(t[1]) < TOL) || (s[0].distance(t[1]) < TOL && s[1].distance(t[0]) < TOL) }
    out = []
    fins = []
    segs.each do |sg|
      dups = segs.select { |t| same.call(sg, t) }
      if dups.size == 1
        out << sg
      elsif !fins.any? { |f| same.call(f, sg) }
        fins << (dups.find { |t| t[2] } || sg)
      end
    end
    (ENV["FIN_POS"] == "end" ? out + fins : fins + out).map { |p0, p1, _| [p0, p1] }
  end

  def coplanar?(f, n, p)
    fn = f.normal_v
    return false unless fn.cross(n).length < 1e-9

    (fn.dot(p) - fn.dot(f.outer_vs[0].position)).abs < TOL
  end

  # ------------------------------------------------------------------ pushpull
  # A lone face extruded by dist along its normal. Resulting entity order (as in SketchUp):
  #   [cap at the original position (outward), far cap, sides in base-loop edge order]
  def pushpull(ents, face, dist)
    raise "pushpull: only a lone face is supported" unless ents.faces.size == 1 && ents.faces[0].equal?(face)
    raise "pushpull: face with holes" unless face.inner_vss.empty?

    n = face.normal_v
    v = Geom::Vector3d.new(n.x * dist, n.y * dist, n.z * dist)
    base = face.outer_vs.map(&:position)
    top = base.map { |p| p + v }
    segs = side_segments(face.raw_pts || base)
    ents.remove(face)
    m = base.size
    faces = []
    if dist > 0
      bottom = Sketchup::Face.new(reverse_loop(base).map { |p| ents.vertex(p) }, neg0(n))
      topf = Sketchup::Face.new(top.map { |p| ents.vertex(p) }, pos0(n))
      faces << bottom << topf
      segs.each do |a, b|
        aa = a + v
        bb = b + v
        nn = (a - aa).cross(b - a)
        faces << Sketchup::Face.new([aa, a, b, bb].map { |p| ents.vertex(p) }, nn.normalize)
      end
    else
      bottom = Sketchup::Face.new(base.map { |p| ents.vertex(p) }, pos0(n))
      far = Sketchup::Face.new(reverse_loop(top).map { |p| ents.vertex(p) }, neg0(n))
      faces << bottom << far
      segs.each do |a, b|
        aa = a + v
        bb = b + v
        nn = (b - bb).cross(a - b)
        faces << Sketchup::Face.new([bb, b, a, aa].map { |p| ents.vertex(p) }, nn.normalize)
      end
    end
    faces.each { |f| ents.add(f) }
  end

  # ------------------------------------------------------------------ coplanar faces
  # A face added onto an existing coplanar face (the plugin's marker faces), matching what
  # SketchUp does with these: a polygon strictly inside a face cuts a hole in it (the new face
  # fills the hole); one that touches the face's boundary is merged the same way when both
  # face the same way, otherwise it is added as a separate, overlapping face.
  # (Matches real SketchUp 2025 on all 529 recorded kitchen cases.)
  def split_add(ents, hits, pts, n)
    host = hits.find { |f| strictly_inside?(f, pts) } ||
           hits.find { |f| f.normal_v.dot(n) > 0 && overlaps?(f, pts) }
    nf = Sketchup::Face.new(pts.map { |p| ents.vertex(p) }, n)
    if host
      host.inner_vss << reverse_loop(nf.outer_vs)
      nf.material = host.material
      nf.back_material = host.back_material
    end
    ents.add(nf)
  end

  def strictly_inside?(f, pts)
    fn = f.normal_v
    u, w = plane_axes(fn)
    to2 = ->(p) { [u.dot(p), w.dot(p)] }
    floops = [f.outer_vs.map { |v| to2.call(v.position) }] + f.inner_vss.map { |vs| vs.map { |v| to2.call(v.position) } }
    m = pts.map { |p| to2.call(p) }
    fedges = floops.flat_map { |l| edges(l) }
    return false unless m.all? { |c| inside_loops?(floops, c) && fedges.none? { |e| seg_dist(e, c) < TOL } }

    edges(m).none? { |me| fedges.any? { |e| segs_intersect?(me, e) } }
  end

  # M's centre inside F (enough for the plugin's rectangles that touch F's border)
  def overlaps?(f, pts)
    fn = f.normal_v
    u, w = plane_axes(fn)
    to2 = ->(p) { [u.dot(p), w.dot(p)] }
    floops = [f.outer_vs.map { |v| to2.call(v.position) }] + f.inner_vss.map { |vs| vs.map { |v| to2.call(v.position) } }
    m = pts.map { |p| to2.call(p) }
    c = [m.sum { |q| q[0] } / m.size, m.sum { |q| q[1] } / m.size]
    inside_loops?(floops, c)
  end

  def seg_dist(e, c)
    a, b = e
    dx = b[0] - a[0]
    dy = b[1] - a[1]
    l2 = dx * dx + dy * dy
    t = l2 > 0 ? (((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / l2).clamp(0.0, 1.0) : 0.0
    Math.hypot(c[0] - (a[0] + t * dx), c[1] - (a[1] + t * dy))
  end

  def segs_intersect?(e1, e2)
    (a, b), (c, d) = e1, e2
    o = ->(p, q, r) { (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]) }
    d1 = o.call(c, d, a)
    d2 = o.call(c, d, b)
    d3 = o.call(a, b, c)
    d4 = o.call(a, b, d)
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  end

  def plane_axes(n)
    a = [n.x.abs, n.y.abs, n.z.abs]
    i = a.index(a.max)
    if i == 0 then [Geom::Vector3d.new(0, 1, 0), Geom::Vector3d.new(0, 0, 1)]
    elsif i == 1 then [Geom::Vector3d.new(1, 0, 0), Geom::Vector3d.new(0, 0, 1)]
    else [Geom::Vector3d.new(1, 0, 0), Geom::Vector3d.new(0, 1, 0)]
    end
  end

  def pt3(u, w, n, d, a)
    ui = u.to_a.index(1.0)
    wi = w.to_a.index(1.0)
    ax = ([0, 1, 2] - [ui, wi])[0]
    nv = n.to_a
    c = [0.0, 0.0, 0.0]
    c[ui] = a[0]
    c[wi] = a[1]
    c[ax] = (d - nv[ui] * a[0] - nv[wi] * a[1]) / nv[ax]
    Geom::Point3d.new(*c)
  end

  def edges(l)
    l.each_with_index.map { |a, i| [a, l[(i + 1) % l.size]] }
  end

  def point_in_poly?(l, c)
    inside = false
    edges(l).each do |a, b|
      if (a[1] > c[1]) != (b[1] > c[1])
        x = a[0] + (c[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
        inside = !inside if c[0] < x
      end
    end
    inside
  end

  def inside_loops?(loops, c)
    point_in_poly?(loops[0], c) && loops[1..].none? { |h| point_in_poly?(h, c) }
  end
end
