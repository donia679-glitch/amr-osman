# Minimal Geom::* for running the plugin's kitchen builders outside SketchUp.
# Internal units are inches, like SketchUp.
class Numeric
  def cm; to_f / 2.54; end
  def mm; to_f / 25.4; end
  def inch; to_f; end
  def to_l; to_f; end
  def to_cm; to_f * 2.54; end
  def to_mm; to_f * 25.4; end
  def degrees; to_f * Math::PI / 180.0; end
  def radians; to_f * 180.0 / Math::PI; end
end

module Geom
  TOL = 0.001 # inch — SketchUp's point/vertex tolerance

  def self.coords(o)
    case o
    when Point3d, Vector3d then [o.x, o.y, o.z]
    when Array then [o[0].to_f, o[1].to_f, (o[2] || 0).to_f]
    else raise ArgumentError, "not a point: #{o.inspect}"
    end
  end

  class Point3d
    attr_accessor :x, :y, :z

    def initialize(x = 0.0, y = 0.0, z = 0.0)
      if x.is_a?(Point3d) || x.is_a?(Vector3d) || x.is_a?(Array)
        @x, @y, @z = Geom.coords(x)
      else
        @x = x.to_f
        @y = y.to_f
        @z = z.to_f
      end
    end

    def to_a; [@x, @y, @z]; end
    def [](i); to_a[i]; end
    def clone; Point3d.new(@x, @y, @z); end

    def +(v)
      a = Geom.coords(v)
      Point3d.new(@x + a[0], @y + a[1], @z + a[2])
    end

    def -(o)
      a = Geom.coords(o)
      if o.is_a?(Vector3d)
        Point3d.new(@x - a[0], @y - a[1], @z - a[2])
      else
        Vector3d.new(@x - a[0], @y - a[1], @z - a[2])
      end
    end

    def offset(v, len = nil)
      a = Geom.coords(v)
      if len
        l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])
        a = a.map { |c| c * len / l }
      end
      Point3d.new(@x + a[0], @y + a[1], @z + a[2])
    end

    def distance(o)
      a = Geom.coords(o)
      Math.sqrt((@x - a[0])**2 + (@y - a[1])**2 + (@z - a[2])**2)
    end

    def ==(o)
      return false unless o.is_a?(Point3d) || o.is_a?(Array)

      distance(o) < TOL
    end

    def vector_to(o); Point3d.new(o) - self; end

    def transform(t); t * self; end

    def transform!(t)
      @x, @y, @z = (t * self).to_a
      self
    end

    def inspect; "Point3d(#{@x}, #{@y}, #{@z})"; end
    alias to_s inspect
  end

  class Vector3d
    attr_accessor :x, :y, :z

    def initialize(x = 0.0, y = 0.0, z = 0.0)
      if x.is_a?(Point3d) || x.is_a?(Vector3d) || x.is_a?(Array)
        @x, @y, @z = Geom.coords(x)
      else
        @x = x.to_f
        @y = y.to_f
        @z = z.to_f
      end
    end

    def to_a; [@x, @y, @z]; end
    def [](i); to_a[i]; end
    def clone; Vector3d.new(@x, @y, @z); end
    def length; Math.sqrt(@x * @x + @y * @y + @z * @z); end

    def normalize
      l = length
      Vector3d.new(@x / l, @y / l, @z / l)
    end

    def normalize!
      l = length
      @x /= l
      @y /= l
      @z /= l
      self
    end

    def reverse; Vector3d.new(-@x, -@y, -@z); end

    def reverse!
      @x = -@x
      @y = -@y
      @z = -@z
      self
    end

    def dot(o)
      a = Geom.coords(o)
      @x * a[0] + @y * a[1] + @z * a[2]
    end
    alias % dot

    def cross(o)
      a = Geom.coords(o)
      Vector3d.new(@y * a[2] - @z * a[1], @z * a[0] - @x * a[2], @x * a[1] - @y * a[0])
    end
    alias * cross

    def +(o)
      a = Geom.coords(o)
      Vector3d.new(@x + a[0], @y + a[1], @z + a[2])
    end

    def -(o)
      a = Geom.coords(o)
      Vector3d.new(@x - a[0], @y - a[1], @z - a[2])
    end

    def valid?; length > 0; end
    def unitvector?; (length - 1.0).abs < 1e-10; end

    def parallel?(o)
      cross(o).length < 1e-10 * [length * Vector3d.new(o).length, 1e-300].max
    end

    def samedirection?(o)
      parallel?(o) && dot(o) > 0
    end

    def length=(l)
      cur = length
      @x = @x * l / cur
      @y = @y * l / cur
      @z = @z * l / cur
    end

    def transform(t); t.apply_vector(self); end

    def transform!(t)
      @x, @y, @z = t.apply_vector(self).to_a
      self
    end

    def ==(o)
      return false unless o.is_a?(Vector3d) || o.is_a?(Array)

      a = Geom.coords(o)
      (@x - a[0]).abs < 1e-10 && (@y - a[1]).abs < 1e-10 && (@z - a[2]).abs < 1e-10
    end

    def inspect; "Vector3d(#{@x}, #{@y}, #{@z})"; end
    alias to_s inspect
  end

  # 4x4 matrix, stored row-major as m[r][c]; point' = M * [x y z 1]
  class Transformation
    attr_reader :m

    def self.identity_m
      [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.0, 1.0]]
    end

    def initialize(arg = nil, *rest)
      @m = Transformation.identity_m
      if arg.is_a?(Transformation)
        @m = arg.m.map(&:dup)
      elsif arg.is_a?(Point3d) || (arg.is_a?(Array) && arg.size == 3)
        o = Geom.coords(arg)
        @m[0][3], @m[1][3], @m[2][3] = o
      elsif arg.is_a?(Vector3d)
        o = Geom.coords(arg)
        @m[0][3], @m[1][3], @m[2][3] = o
      elsif arg.is_a?(Array) && arg.size == 16
        # SketchUp to_a is column-major
        4.times { |c| 4.times { |r| @m[r][c] = arg[c * 4 + r].to_f } }
      elsif arg.is_a?(Numeric)
        s = arg.to_f
        @m[0][0] = @m[1][1] = @m[2][2] = s
      end
    end

    def self.from_m(m)
      t = new
      t.instance_variable_set(:@m, m)
      t
    end

    def self.translation(v)
      new(Vector3d.new(v))
    end

    def self.scaling(*args)
      m = identity_m
      if args.size == 1
        m[0][0] = m[1][1] = m[2][2] = args[0].to_f
      elsif args.size == 3
        m[0][0], m[1][1], m[2][2] = args.map(&:to_f)
      elsif args.size == 2
        o = Geom.coords(args[0])
        s = args[1].to_f
        3.times { |i| m[i][i] = s; m[i][3] = o[i] * (1 - s) }
      elsif args.size == 4
        o = Geom.coords(args[0])
        s = args[1..3].map(&:to_f)
        3.times { |i| m[i][i] = s[i]; m[i][3] = o[i] * (1 - s[i]) }
      end
      from_m(m)
    end

    # rotation(point, axis, angle) — Rodrigues
    def self.rotation(pt, axis, angle)
      o = Geom.coords(pt)
      a = Vector3d.new(axis).normalize
      c = Math.cos(angle)
      s = Math.sin(angle)
      t = 1 - c
      x, y, z = a.to_a
      r = [
        [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
        [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
        [t * x * z - s * y, t * y * z + s * x, t * z * z + c]
      ]
      m = identity_m
      3.times do |i|
        3.times { |j| m[i][j] = r[i][j] }
        m[i][3] = o[i] - (r[i][0] * o[0] + r[i][1] * o[1] + r[i][2] * o[2])
      end
      from_m(m)
    end

    # axes(origin, xaxis, yaxis, zaxis)
    def self.axes(origin, xa, ya, za = nil)
      o = Geom.coords(origin)
      xv = Geom.coords(xa)
      yv = Geom.coords(ya)
      zv = za ? Geom.coords(za) : Vector3d.new(xv).cross(Vector3d.new(yv)).to_a
      m = identity_m
      3.times do |i|
        m[i][0] = xv[i]
        m[i][1] = yv[i]
        m[i][2] = zv[i]
        m[i][3] = o[i]
      end
      from_m(m)
    end

    def to_a
      a = []
      4.times { |c| 4.times { |r| a << @m[r][c] } }
      a
    end

    def origin; Point3d.new(@m[0][3], @m[1][3], @m[2][3]); end
    def xaxis; Vector3d.new(@m[0][0], @m[1][0], @m[2][0]); end
    def yaxis; Vector3d.new(@m[0][1], @m[1][1], @m[2][1]); end
    def zaxis; Vector3d.new(@m[0][2], @m[1][2], @m[2][2]); end

    def identity?
      @m == Transformation.identity_m
    end

    def apply_point(p)
      a = Geom.coords(p)
      w = @m[3][0] * a[0] + @m[3][1] * a[1] + @m[3][2] * a[2] + @m[3][3]
      r = (0..2).map { |i| @m[i][0] * a[0] + @m[i][1] * a[1] + @m[i][2] * a[2] + @m[i][3] }
      r = r.map { |c| c / w } if w != 1.0
      Point3d.new(*r)
    end

    def apply_vector(v)
      a = Geom.coords(v)
      Vector3d.new(*(0..2).map { |i| @m[i][0] * a[0] + @m[i][1] * a[1] + @m[i][2] * a[2] })
    end

    def *(o)
      case o
      when Transformation
        r = Array.new(4) { Array.new(4, 0.0) }
        4.times do |i|
          4.times do |j|
            r[i][j] = @m[i][0] * o.m[0][j] + @m[i][1] * o.m[1][j] + @m[i][2] * o.m[2][j] + @m[i][3] * o.m[3][j]
          end
        end
        Transformation.from_m(r)
      when Point3d then apply_point(o)
      when Vector3d then apply_vector(o)
      when Array then apply_point(o).to_a
      else raise ArgumentError, "Transformation * #{o.class}"
      end
    end

    def inverse
      # general 4x4 inverse (Gauss-Jordan)
      a = @m.map(&:dup)
      inv = Transformation.identity_m
      4.times do |c|
        p = (c...4).max_by { |r| a[r][c].abs }
        a[c], a[p] = a[p], a[c]
        inv[c], inv[p] = inv[p], inv[c]
        d = a[c][c]
        4.times { |j| a[c][j] /= d; inv[c][j] /= d }
        4.times do |r|
          next if r == c

          f = a[r][c]
          next if f == 0

          4.times { |j| a[r][j] -= f * a[c][j]; inv[r][j] -= f * inv[c][j] }
        end
      end
      Transformation.from_m(inv)
    end
  end

  class BoundingBox
    def initialize
      @min = nil
      @max = nil
    end

    def add(*pts)
      pts.flatten.each do |p|
        if p.is_a?(BoundingBox)
          next if p.empty?

          add(p.min, p.max)
          next
        end
        a = Geom.coords(p)
        if @min
          @min = [[@min[0], a[0]].min, [@min[1], a[1]].min, [@min[2], a[2]].min]
          @max = [[@max[0], a[0]].max, [@max[1], a[1]].max, [@max[2], a[2]].max]
        else
          @min = a.dup
          @max = a.dup
        end
      end
      self
    end

    def empty?; @min.nil?; end
    def valid?; !empty?; end
    def clear; @min = @max = nil; self; end
    def min; empty? ? Point3d.new(1e30, 1e30, 1e30) : Point3d.new(*@min); end
    def max; empty? ? Point3d.new(-1e30, -1e30, -1e30) : Point3d.new(*@max); end
    def width; empty? ? 0.0 : @max[0] - @min[0]; end
    def height; empty? ? 0.0 : @max[1] - @min[1]; end
    def depth; empty? ? 0.0 : @max[2] - @min[2]; end
    def center; Point3d.new(*(0..2).map { |i| (@min[i] + @max[i]) / 2.0 }); end

    def diagonal
      Math.sqrt(width**2 + height**2 + depth**2)
    end

    # SketchUp corner order: bit0 = x, bit1 = y, bit2 = z
    def corner(i)
      Point3d.new(i & 1 == 0 ? @min[0] : @max[0], i & 2 == 0 ? @min[1] : @max[1], i & 4 == 0 ? @min[2] : @max[2])
    end

    def contains?(p)
      a = Geom.coords(p)
      (0..2).all? { |i| a[i] >= @min[i] - TOL && a[i] <= @max[i] + TOL }
    end
  end
end
