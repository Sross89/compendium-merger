import { MODULE_ID, SETTINGS } from "./constants.js";

export function registerSettings() {
  // Remembers the GM's chosen source compendiums and their priority order between
  // sessions. Shape: [{ id: packId, checked: bool }, ...] in priority order (first = highest).
  game.settings.register(MODULE_ID, SETTINGS.SOURCE_ORDER, {
    scope: "client",
    config: false,
    type: Array,
    default: []
  });
}
