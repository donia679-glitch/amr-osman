require_relative 'load_panel'
P = KitchenUnitDesigner::PanelEngine
list = P::Presets::LIST.transform_values do |v|
  { label: v[:label], group: v[:group], desc: v[:desc], params: P::Schema.deep_stringify(v[:params]) }
end
src = +"// GENERATED from the plugin's lib/panel_engine/presets.rb by parity/ruby/gen_presets.rb — do not edit.\n"
src << "import type { Dict } from \"../core/ruby.ts\";\n"
src << "import { deepDup } from \"../core/ruby.ts\";\n\n"
src << "export interface Preset { label: string; group: string; desc: string; params: Dict }\n\n"
src << "export const LIST: Record<string, Preset> = #{JSON.pretty_generate(list)};\n\n"
src << "export const get = (key: string): Preset | undefined => (Object.prototype.hasOwnProperty.call(LIST, key) ? LIST[key] : undefined);\n\n"
src << "export function paramsFor(key: string): Dict | null {\n  const pr = get(key);\n  return pr ? { ...deepDup(pr.params), preset: key } : null;\n}\n"
File.write(File.expand_path('../../packages/engine/src/panel/presets.ts', __dir__), src)
puts "#{list.size} presets"
