# Loads the plugin's kitchen builders (unmodified) on top of the fake SketchUp API.
require 'json'
require_relative 'sketchup_fake/sketchup_fake'

KUD_PLUGIN = ENV["KUD_PLUGIN"] || "/home/claude/kud/kitchen_unit_designer"
%w[
  lib/label_data lib/config lib/helpers lib/bed_builder lib/builders_core
  lib/corner_glass_display_unit_builder lib/builders_categories lib/bedroom_wardrobe_builder
  lib/kitchen_joints lib/hardware_bom lib/handles/catalog lib/handles/kitchen
].each { |f| require File.join(KUD_PLUGIN, f) }
KitchenUnitDesigner::KitchenJoints.install!
