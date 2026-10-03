# Runs every case of fixtures/kitchen_in.json through the fake → fixtures/kitchen.json
# (same recorder code as inside real SketchUp).
KUD_PARITY_NO_AUTORUN = true
require_relative 'load_kitchen'
require_relative 'kud_kitchen_run'

inp = JSON.parse(File.read(File.join(__dir__, "../fixtures/kitchen_in.json"), encoding: "UTF-8"))
only = ENV["ONLY"]
results = []
t0 = Time.now
inp["cases"].each do |c|
  next if only && !c["name"].include?(only)

  Sketchup.reset_model!
  results << KudKitchenParity.run_case(c)
end
out = ENV["OUT"] || File.join(__dir__, "../fixtures/kitchen.json")
File.write(out, JSON.generate(ruby: RUBY_VERSION, platform: RUBY_PLATFORM, sketchup: "fake", secs: Time.now - t0, cases: results))
puts "#{results.size} cases, #{results.count { |r| r[:ok] }} ok, #{(Time.now - t0).round(1)} s"
