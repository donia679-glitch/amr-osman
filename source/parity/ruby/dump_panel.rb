# Golden fixtures for the panel engine: the plugin's Layout.compute on presets,
# template defaults and randomized params.   ruby parity/ruby/dump_panel.rb [count]
require_relative 'load_panel'
P = KitchenUnitDesigner::PanelEngine
OUT = File.expand_path('../fixtures/panel.json', __dir__)
N = (ARGV[0] || 400).to_i
g = Random.new(181_185)

cases = []
P::Presets::LIST.each_key { |k| cases << { name: "preset:#{k}", params: { "preset" => k } } }
P::Schema::TEMPLATES.each_key { |k| cases << { name: "default:#{k}", params: { "template" => k } } }

pick = ->(a) { a[g.rand(a.size)] }
num = ->(lo, hi, step = 0.1) { ((lo + g.rand * (hi - lo)) / step).round * step }

zone = lambda do
  t = pick.(%w[doors drawers flap open])
  z = { "type" => t }
  z["count"] = t == "drawers" ? g.rand(1..5) : g.rand(1..2)
  z["shelves"] = g.rand(0..4) if %w[doors flap open].include?(t)
  z["height"] = g.rand < 0.3 ? num.(12, 60, 1) : "auto"
  z["hinge"] = pick.(%w[left right])
  z["led"] = g.rand < 0.2
  z
end

N.times do |i|
  tpl = pick.(P::Schema::TEMPLATES.keys)
  p = { "template" => tpl }
  p["width"] = num.(25, tpl.end_with?("_table") ? 320 : 260, 0.5)
  p["height"] = num.(30, 240, 0.5)
  p["depth"] = num.(15, tpl.end_with?("_table") ? 140 : 70, 0.5)
  p["environment"] = pick.(%w[dry wet])
  p["mount"] = pick.(%w[floor wall])
  p["handle"] = pick.(%w[bar push gola none])
  p["top"] = pick.(%w[full rails]) if g.rand < 0.3
  p["front_style"] = "mirror" if g.rand < 0.1
  p["edge_banding"] = g.rand > 0.1
  p["thickness"] = pick.([1.8, 1.8, 1.6, 2.5, 3.6])
  p["led_under"] = g.rand < 0.3
  p["plinth"] = { "height" => num.(0, 15, 0.5), "style" => pick.(%w[apron legs]) } if g.rand < 0.4
  p["back"] = { "enabled" => g.rand > 0.2 } if g.rand < 0.5
  p["joints"] = { "middle_set_over" => num.(30, 90, 1) } if g.rand < 0.3
  p["fronts"] = Array.new(g.rand(1..3)) { zone.() } if g.rand < 0.7
  spec = P::Schema::SPECIAL[tpl]
  if spec
    sub = {}
    spec[:fields].each do |path, _n, type, choices, lo, hi|
      next if g.rand < 0.4
      k = path.split(".")[1]
      sub[k] = case type
               when "num" then num.(lo, hi, 0.5)
               when "int" then g.rand(lo..hi)
               when "bool" then g.rand < 0.5
               when "choice" then pick.(choices.keys)
               end
    end
    p[spec[:fields][0][0].split(".")[0]] = sub
  end
  if tpl == "free"
    p["panels"] = Array.new(g.rand(1..6)) do |j|
      { "name" => "P#{j}", "role" => pick.(P::Schema::ROLES), "material" => pick.(%w[carcass front accent shelf]),
        "x" => num.(0, 80, 0.2), "y" => 0, "z" => num.(0, 150, 0.2),
        "w" => pick.([1.8, num.(5, 90, 0.2)]), "d" => num.(10, 60, 0.2), "h" => pick.([1.8, num.(5, 150, 0.2)]),
        "band" => %w[front left right top].select { g.rand < 0.5 } }
    end
  end
  # materials from the NOVERA library on some cases
  if g.rand < 0.4
    p["materials"] = %w[carcass front accent table_top table_base].each_with_object({}) { |k, h| h[k] = { "lib" => pick.(P::Catalog::LIB.keys) } if g.rand < 0.6 }
  end
  # occasional bad input
  p["width"] = "abc" if g.rand < 0.02
  p["mount"] = "ceiling" if g.rand < 0.02
  cases << { name: "rand#{i}:#{tpl}", params: p }
end

out = cases.map do |c|
  res = P::Layout.compute(c[:params])
  { name: c[:name], params: c[:params], result: res }
end
File.write(OUT, JSON.generate(out))
ok = out.count { |c| c[:result][:ok] }
puts "#{out.size} panel cases (#{ok} ok) -> #{OUT}"
