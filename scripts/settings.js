import { MODULE_ID, SETTINGS } from "./constants.js";

const ORDER_SETTING_KEYS = [
  SETTINGS.ITEM_SOURCE_ORDER,
  SETTINGS.SPELL_SOURCE_ORDER,
  SETTINGS.MONSTER_SOURCE_ORDER,
  SETTINGS.VEHICLE_SOURCE_ORDER,
  SETTINGS.SPECIES_SOURCE_ORDER,
  SETTINGS.BACKGROUND_SOURCE_ORDER,
  SETTINGS.CLASS_SOURCE_ORDER,
  SETTINGS.FEAT_SOURCE_ORDER
];

export function registerSettings() {
  // Remembers the GM's chosen source compendiums and their priority order between
  // sessions, independently per category. Shape: [{ id: packId, checked: bool }, ...]
  // in priority order (first = highest).
  for (const key of ORDER_SETTING_KEYS) {
    game.settings.register(MODULE_ID, key, {
      scope: "client",
      config: false,
      type: Array,
      default: []
    });
  }

  // Whether "Merged Monsters" is sorted into in-compendium folders by Challenge Rating
  // or by creature type.
  game.settings.register(MODULE_ID, SETTINGS.MONSTER_SORT_MODE, {
    scope: "client",
    config: false,
    type: String,
    default: "cr"
  });

  // Whether each category's compendium list is filtered down to only compendiums that
  // actually contain at least one document of that category's type.
  game.settings.register(MODULE_ID, SETTINGS.FILTER_EMPTY_SOURCES, {
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });
}
