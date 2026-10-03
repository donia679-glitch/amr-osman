# Runs the SketchUp plugin's own CutOptimizer (source of truth) on many cases
# and writes golden fixtures for the TypeScript port.
#   ruby parity/ruby/dump_cut.rb [plugin_dir]
require 'json'

PLUGIN = ARGV[0] || ENV['KUD_SRC'] || File.expand_path('../../../kud/kitchen_unit_designer', __dir__)
require File.join(PLUGIN, 'lib', 'cut_optimizer')
OUT = File.expand_path('../fixtures/cut.json', __dir__)

g = Random.new(20261001)
cases = []

kitchen = [
  ['جنب', 72, 56, 10], ['قاعدة', 86.4, 56, 4], ['رف', 86, 50, 4], ['رأس', 86.4, 10, 8],
  ['جنب علوي', 72, 32, 8], ['قاعدة علوي', 56.4, 32, 6], ['ضلفة', 71.6, 44.6, 10], ['درج', 18, 44.6, 6]
].flat_map { |n, w, h, c| Array.new(c) { |i| { name: "#{n} #{i + 1}", w: w, h: h } } }
cases << { name: 'kitchen', parts: kitchen, opts: { sheet_w: 244, sheet_h: 122, kerf: 0.4, trim: 1.0 } }
cases << { name: 'kitchen_remnants', parts: kitchen,
           opts: { sheet_w: 244, sheet_h: 122, kerf: 0.4, trim: 1.0, remnants: [[120, 60], [90, 45]] } }
cases << { name: 'kitchen_norotate', parts: kitchen.map { |p| p.merge(rotate: false) },
           opts: { sheet_w: 244, sheet_h: 122, kerf: 0.4, trim: 1.0 } }
cases << { name: 'kitchen_effort_half', parts: kitchen, opts: { sheet_w: 244, sheet_h: 122, kerf: 0.3, effort: 0.5 } }
cases << { name: 'oversized', parts: [{ name: 'big', w: 300, h: 50 }, { name: 'ok', w: 100, h: 50 }],
           opts: { sheet_w: 244, sheet_h: 122 } }
cases << { name: 'empty', parts: [], opts: { sheet_w: 244, sheet_h: 122 } }
cases << { name: 'single', parts: [{ name: 'one', w: 60, h: 40 }], opts: { sheet_w: 244, sheet_h: 122, trim: 1 } }

40.times do |k|
  n = [3, 8, 15, 30, 60, 110][k % 6]
  parts = Array.new(n) do |i|
    w = (g.rand(15.0..120.0) * 10).round / 10.0
    h = (g.rand(8.0..60.0) * 10).round / 10.0
    { name: "P#{i}", w: w, h: h, rotate: (g.rand < 0.15 ? false : nil) }.compact
  end
  # duplicates (like real projects)
  parts += parts.first(n / 3).map { |p| p.merge(name: "#{p[:name]}b") }
  sw, sh = [[244, 122], [280, 207], [244, 183], [305, 122]][k % 4]
  opts = { sheet_w: sw, sheet_h: sh, kerf: [0.4, 0.3, 0.32][k % 3], trim: [0, 1, 0.5][k % 3],
           rotate: k % 7 != 3, min_offcut: [[30, 10], [40, 15]][k % 2] }
  opts[:remnants] = [[g.rand(60..150), g.rand(30..80)], [g.rand(40..100), g.rand(30..60)]] if k % 5 == 2
  cases << { name: "rand#{k}", parts: parts, opts: opts }
end

out = cases.map do |c|
  res = KitchenUnitDesigner::CutOptimizer.compute(c[:parts], **c[:opts], time_cap: 1e9)
  res[:stats].delete(:ms)
  { name: c[:name], parts: c[:parts], opts: c[:opts], result: res }
end
File.write(OUT, JSON.generate(out))
puts "#{out.size} cut cases -> #{OUT}"
