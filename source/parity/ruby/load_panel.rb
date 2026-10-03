# Loads the plugin's pure-Ruby panel engine (no SketchUp) — shared by dump scripts.
require 'json'
PLUGIN = ENV['KUD_SRC'] || File.expand_path('../../../kud/kitchen_unit_designer', __dir__)
module KitchenUnitDesigner; end
# isolate machines.json (Catalog writes defaults there on first use)
ENV['HOME'] = ENV['USERPROFILE'] = File.expand_path('../.home', __dir__)
Dir.mkdir(ENV['HOME']) unless Dir.exist?(ENV['HOME'])
%w[catalog table_spec schema design templates templates_rooms templates_tables checker layout presets].each do |f|
  require File.join(PLUGIN, 'lib', 'panel_engine', f)
end

# The plugin runs in SketchUp on Windows (Ruby x64-mswin64), where Array#sort_by goes through
# MSVC qsort: arrays of <= 8 use "shortsort", which reorders equal keys. Linux Ruby keeps them.
# Emulate Windows here so fixtures match the real plugin (verified against SketchUp 2025).
class Array
  alias_method :__linux_sort_by, :sort_by
  def sort_by(&blk)
    return __linux_sort_by(&blk) if size > 8 || blk.nil?
    a = map { |v| [blk.call(v), v] }
    (a.size - 1).downto(1) do |hi|
      max = 0
      (1..hi).each { |p| max = p if (a[p][0] <=> a[max][0]) > 0 }
      a[max], a[hi] = a[hi], a[max]
    end
    a.map(&:last)
  end
end
