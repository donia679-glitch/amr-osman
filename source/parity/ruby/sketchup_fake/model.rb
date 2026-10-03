# Minimal Sketchup::* object model for the kitchen builders: entities, groups, component
# definitions/instances, faces (single-polygon extrusions via pushpull), coplanar "marker"
# faces that split an existing face, attributes, materials, layers.
module Sketchup
  @next_id = 1
  @defaults = {}

  class << self
    def next_id
      id = @next_id
      @next_id += 1
      id
    end

    def active_model; @model ||= Model.new; end
    def reset_model!; @model = Model.new; end
    def read_default(sec, key, d = nil); @defaults.fetch([sec.to_s, key.to_s], d); end
    def write_default(sec, key, v); @defaults[[sec.to_s, key.to_s]] = v; true; end
    def version; "25.0.fake"; end
    def require(f); Kernel.require(f); end
  end

  class Color
    attr_accessor :red, :green, :blue, :alpha

    def initialize(r = 0, g = 0, b = 0, a = 255)
      if r.is_a?(Array)
        r, g, b, a = r + [255]
      elsif r.is_a?(String)
        h = r.delete("#")
        r, g, b = h[0, 2].to_i(16), h[2, 2].to_i(16), h[4, 2].to_i(16)
      end
      @red = r.to_i
      @green = g.to_i
      @blue = b.to_i
      @alpha = (a || 255).to_i
    end

    def to_a; [@red, @green, @blue, @alpha]; end
  end

  class AttributeDictionary
    def initialize; @h = {}; end
    def [](k); @h[k.to_s]; end
    def []=(k, v); @h[k.to_s] = v; end
    def each_pair(&b); @h.each_pair(&b); end
    alias each each_pair
    def keys; @h.keys; end
    def values; @h.values; end
    def delete_key(k); @h.delete(k.to_s); end
    def size; @h.size; end
    def to_h; @h.dup; end
  end

  class Entity
    attr_reader :entityID

    def initialize
      @entityID = Sketchup.next_id
      @dicts = {}
      @valid = true
    end

    def valid?; @valid; end
    def deleted?; !@valid; end
    def erase!; @valid = false; @parent&.remove(self); true; end
    attr_accessor :parent

    def attribute_dictionary(name, create = false)
      return @dicts[name.to_s] if @dicts.key?(name.to_s)

      create ? (@dicts[name.to_s] = AttributeDictionary.new) : nil
    end

    def attribute_dictionaries; @dicts.values; end

    def set_attribute(dict, key, value)
      attribute_dictionary(dict, true)[key] = value
      value
    end

    def get_attribute(dict, key, default = nil)
      d = @dicts[dict.to_s]
      return default unless d

      v = d[key]
      v.nil? ? default : v
    end

    def delete_attribute(dict, key = nil)
      if key
        @dicts[dict.to_s]&.delete_key(key)
      else
        @dicts.delete(dict.to_s)
      end
    end

    def model; Sketchup.active_model; end
    def typename; self.class.name.split("::").last; end
  end

  class Drawingelement < Entity
    attr_accessor :material, :layer
    attr_writer :visible

    def initialize
      super
      @material = nil
      @layer = Sketchup.active_model.layers["Layer0"]
      @visible = true
    end

    def visible?; @visible; end
    def hidden?; !@visible; end
    def hidden=(h); @visible = !h; end

    def material=(m)
      @material = m.is_a?(String) ? Sketchup.active_model.materials[m] : m
    end

    def layer=(l)
      @layer = l.is_a?(String) ? (Sketchup.active_model.layers[l] || Sketchup.active_model.layers.add(l)) : l
    end
  end

  class Material
    attr_accessor :name, :color, :alpha, :texture

    def initialize(name)
      @name = name
      @color = Color.new(255, 255, 255)
      @alpha = 1.0
      @texture = nil
    end

    def display_name; @name; end
    def color=(c); @color = c.is_a?(Color) ? c : Color.new(*Array(c)); end
    def materialType; 0; end
    def use_alpha?; @alpha < 1.0; end
    def valid?; true; end
    def get_attribute(_d, _k, default = nil); default; end
    def set_attribute(*); end
  end

  class Materials
    include Enumerable

    def initialize; @list = []; end
    def [](k); k.is_a?(Integer) ? @list[k] : @list.find { |m| m.name == k.to_s }; end

    def add(name)
      n = name.to_s
      if self[n]
        i = 1
        i += 1 while self["#{n}#{i}"]
        n = "#{n}#{i}"
      end
      m = Material.new(n)
      @list << m
      m
    end

    def each(&b); @list.each(&b); end
    def size; @list.size; end
    alias length size
    def current; nil; end
    def load(_path); raise "Materials#load not available in the fake"; end
  end

  class Layer
    attr_accessor :name, :visible

    def initialize(name); @name = name; @visible = true; end
    def visible?; @visible; end
    def valid?; true; end
  end

  class Layers
    include Enumerable

    def initialize; @list = [Layer.new("Layer0")]; end
    def [](k); k.is_a?(Integer) ? @list[k] : @list.find { |l| l.name == k.to_s }; end

    def add(name)
      l = self[name]
      return l if l

      l = Layer.new(name.to_s)
      @list << l
      l
    end

    def each(&b); @list.each(&b); end
    def to_a; @list.dup; end
    def size; @list.size; end
  end

  class Definitions
    include Enumerable

    def initialize; @list = []; end
    def [](k); @list.find { |d| d.name == k.to_s }; end

    def add(name)
      n = name.to_s
      if self[n]
        i = 1
        i += 1 while self["#{n}##{i}"]
        n = "#{n}##{i}"
      end
      d = ComponentDefinition.new(n)
      @list << d
      d
    end

    def each(&b); @list.each(&b); end
    def size; @list.size; end
  end

  class Selection
    include Enumerable
    def initialize; @list = []; end
    def each(&b); @list.each(&b); end
    def to_a; @list.dup; end
    def clear; @list.clear; end
    def add(*e); @list.concat(e.flatten); end
    def empty?; @list.empty?; end
  end

  class Model
    attr_reader :entities, :materials, :layers, :definitions, :selection

    def initialize
      @materials = Materials.new
      @layers = Layers.new
      @definitions = Definitions.new
      @selection = Selection.new
      @entities = nil
      @entities = Entities.new(self)
    end

    def active_entities; @entities; end
    def start_operation(*); true; end
    def commit_operation; true; end
    def abort_operation; true; end

    def find_entity_by_id(id)
      find = lambda do |ents|
        ents.each do |e|
          return e if e.entityID == id
          sub = e.is_a?(Group) ? e.entities : (e.is_a?(ComponentInstance) ? e.definition.entities : nil)
          r = sub && find.call(sub)
          return r if r
        end
        nil
      end
      find.call(@entities)
    end

    def active_view; nil; end
    def get_attribute(_d, _k, default = nil); default; end
    def set_attribute(*); end
    def title; "fake"; end
    def path; ""; end
  end

  # -------------------------------------------------------------------------- geometry
  class Vertex < Entity
    attr_accessor :position

    def initialize(pos)
      super()
      @position = pos
    end
  end

  class Loop < Entity
    attr_reader :vertices

    def initialize(vertices, outer)
      super()
      @vertices = vertices
      @outer = outer
    end

    def outer?; @outer; end
    def edges; []; end
  end

  class Face < Drawingelement
    attr_accessor :back_material, :normal_v, :outer_vs, :inner_vss, :raw_pts

    def initialize(outer_vs, normal, inner_vss = [])
      super()
      @outer_vs = outer_vs
      @inner_vss = inner_vss
      @normal_v = normal
      @back_material = nil
    end

    def normal; @normal_v.clone; end
    def loops; [Loop.new(@outer_vs, true)] + @inner_vss.map { |vs| Loop.new(vs, false) }; end
    def outer_loop; Loop.new(@outer_vs, true); end
    def vertices; (@outer_vs + @inner_vss.flatten).uniq; end
    def edges; []; end

    def back_material=(m)
      @back_material = m.is_a?(String) ? Sketchup.active_model.materials[m] : m
    end

    def plane
      n = @normal_v
      p = @outer_vs[0].position
      [n.x, n.y, n.z, -(n.x * p.x + n.y * p.y + n.z * p.z)]
    end

    def area
      a = FakeGeom.poly_area(@outer_vs.map(&:position), @normal_v)
      @inner_vss.each { |vs| a -= FakeGeom.poly_area(vs.map(&:position), @normal_v) }
      a
    end

    def reverse!
      @normal_v = @normal_v.reverse
      @outer_vs = FakeGeom.reverse_loop(@outer_vs)
      @inner_vss = @inner_vss.map { |vs| FakeGeom.reverse_loop(vs) }
      self
    end

    def pushpull(dist, _copy = false)
      parent.pushpull_face(self, dist.to_f)
      nil
    end

    def classify_point(_p); 1; end
  end

  class Edge < Drawingelement; end

  class Entities
    include Enumerable
    attr_reader :owner

    def initialize(owner)
      @owner = owner
      @list = []
      @verts = []
    end

    def each(&b); @list.dup.each(&b); end
    def to_a; @list.dup; end
    def size; @list.size; end
    alias length size
    alias count_all size
    def [](i); @list[i]; end
    def empty?; @list.empty?; end
    def model; Sketchup.active_model; end
    def parent; @owner; end

    def remove(e); @list.delete(e); end

    def add(e)
      e.parent = self
      @list << e
      e
    end

    def insert_at(i, e)
      e.parent = self
      @list.insert(i, e)
      e
    end

    def vertex(pt)
      p = Geom::Point3d.new(pt)
      v = @verts.find { |x| x.position.distance(p) < Geom::TOL }
      unless v
        v = Vertex.new(p)
        @verts << v
      end
      v
    end

    def faces; @list.grep(Face); end

    def add_group(*ents)
      g = Group.new
      add(g)
      g
    end

    def add_instance(definition, tr)
      i = ComponentInstance.new(definition, tr)
      add(i)
      i
    end

    def add_face(*pts)
      pts = pts.flatten.map { |p| p.is_a?(Vertex) ? p.position : Geom::Point3d.new(p) }
      raise ArgumentError, "Duplicate points in array" if FakeGeom.dup_points?(pts)
      raise ArgumentError, "Points are not planar" unless FakeGeom.planar?(pts)
      raise ArgumentError, "Not enough points" if pts.size < 3

      FakeGeom.add_face(self, pts)
    end

    def add_line(*); nil; end
    def add_edges(*); []; end
    def add_cpoint(*); nil; end
    def add_text(*); nil; end

    def erase_entities(*ents)
      ents.flatten.each { |e| e.erase! }
    end

    def transform_entities(tr, ents)
      ents = Array(ents)
      vs = ents.flat_map { |e| e.is_a?(Face) ? e.vertices : [] }.uniq
      vs.each { |v| v.position = tr * v.position }
      ents.each do |e|
        if e.is_a?(Group) || e.is_a?(ComponentInstance)
          e.transformation = tr * e.transformation
        end
      end
      true
    end

    def pushpull_face(face, dist)
      FakeGeom.pushpull(self, face, dist)
    end

    def grep(klass, &b)
      r = @list.select { |e| klass === e }
      b ? r.map(&b) : r
    end

    # local bounds of everything inside (SketchUp: ComponentDefinition#bounds)
    def bounds
      bb = Geom::BoundingBox.new
      @list.each do |e|
        if e.is_a?(Face)
          e.vertices.each { |v| bb.add(v.position) }
        elsif e.is_a?(Group) || e.is_a?(ComponentInstance)
          bb.add(e.bounds)
        end
      end
      bb
    end
  end

  class ComponentDefinition < Entity
    attr_accessor :name, :description
    attr_reader :entities

    def initialize(name)
      super()
      @name = name
      @entities = Entities.new(self)
      @instances = []
    end

    def instances; @instances; end
    def bounds; @entities.bounds; end
    def group?; false; end
    def image?; false; end
    def count_instances; @instances.size; end
  end

  class ComponentInstance < Drawingelement
    attr_accessor :name, :transformation
    attr_reader :definition

    def initialize(definition, tr)
      super()
      @definition = definition
      @transformation = Geom::Transformation.new(tr)
      @name = ""
      definition.instances << self
    end

    def entities; @definition.entities; end

    def transform!(t)
      @transformation = t * @transformation
      self
    end

    def move!(t); @transformation = Geom::Transformation.new(t); self; end

    def bounds
      FakeGeom.transformed_bounds(@definition.entities, @transformation)
    end

    def make_unique; self; end
    def explode; []; end
  end

  class Group < Drawingelement
    attr_accessor :name, :transformation, :description
    attr_reader :entities, :definition

    def initialize
      super()
      @definition = ComponentDefinition.new("Group")
      @entities = @definition.entities
      @transformation = Geom::Transformation.new
      @name = ""
    end

    def transform!(t)
      @transformation = t * @transformation
      self
    end

    def move!(t); @transformation = Geom::Transformation.new(t); self; end

    def bounds
      FakeGeom.transformed_bounds(@entities, @transformation)
    end

    def local_bounds; @entities.bounds; end
    def make_unique; self; end
    def explode; []; end
    def manifold?; true; end
  end
end

module UI
  def self.messagebox(*); 1; end
  def self.openURL(*); true; end
  def self.start_timer(*); 0; end
  def self.add_context_menu_handler(*); end
  def self.menu(*); nil; end
end

def file_loaded?(_f); true; end
def file_loaded(_f); end
