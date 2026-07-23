import { MODULE_ID, SETTINGS } from "./constants.js";

export function registerSettings() {
  // Remembers the GM's chosen source folders and their priority order between
  // sessions. Shape: [{ id: folderId, checked: bool }, ...] in priority order (first = highest).
  game.settings.register(MODULE_ID, SETTINGS.SOURCE_ORDER, {
    scope: "client",
    config: false,
    type: Array,
    default: []
  });
}
