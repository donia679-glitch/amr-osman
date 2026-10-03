# Runs the installed plugin's engines inside SketchUp on the app's parity cases (read-only).
require 'json'
begin
  dir = File.dirname(__FILE__)
  inp = JSON.parse(File.read(File.join(dir, 'parity_in.json'), encoding: 'UTF-8'))
  r = Random.new(12345)
  out = { ruby: RUBY_VERSION, platform: RUBY_PLATFORM,
          rng: [r.rand(10), r.rand(10), r.rand, r.rand(1..5), (0...10).to_a.shuffle(random: Random.new(12345))],
          machines: KitchenUnitDesigner::PanelEngine::Catalog.machines, cut: [], panel: [] }
  t0 = Time.now
  inp["cut"].each do |c|
    o = c["opts"].transform_keys(&:to_sym)
    parts = c["parts"].map { |p| p.transform_keys(&:to_sym) }
    res = KitchenUnitDesigner::CutOptimizer.compute(parts, **o, time_cap: 1e9)
    res[:stats].delete(:ms)
    out[:cut] << { name: c["name"], result: res }
  end
  inp["panel"].each { |c| out[:panel] << { name: c["name"], result: KitchenUnitDesigner::PanelEngine::Layout.compute(c["params"]) } }
  out[:secs] = Time.now - t0
  File.write(File.join(dir, 'parity_out.json'), JSON.generate(out))
rescue Exception => e
  File.write(File.join(File.dirname(__FILE__), 'parity_out.json'), JSON.generate(error: "#{e.class}: #{e.message}", bt: e.backtrace.first(5)))
end
