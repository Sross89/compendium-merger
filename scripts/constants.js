export const MODULE_ID = "compendium-merger";

export const SETTINGS = {
  ITEM_SOURCE_ORDER: "itemSourceOrder",
  SPELL_SOURCE_ORDER: "spellSourceOrder",
  MONSTER_SOURCE_ORDER: "monsterSourceOrder",
  VEHICLE_SOURCE_ORDER: "vehicleSourceOrder",
  SPECIES_SOURCE_ORDER: "speciesSourceOrder",
  BACKGROUND_SOURCE_ORDER: "backgroundSourceOrder",
  CLASS_SOURCE_ORDER: "classSourceOrder",
  FEAT_SOURCE_ORDER: "featSourceOrder",
  MONSTER_SORT_MODE: "monsterSortMode",
  FILTER_EMPTY_SOURCES: "filterEmptySources"
};

/** dnd5e Item subtypes handled by the "Merged Items" bucket. */
export const ITEM_TYPES = ["weapon", "equipment", "consumable", "tool", "loot", "container"];

/** dnd5e Item subtypes handled by the "Merged Spells" bucket. */
export const SPELL_TYPES = ["spell"];

/** dnd5e Actor subtypes handled by the "Merged Monsters" bucket. */
export const MONSTER_TYPES = ["npc"];

/** dnd5e Actor subtypes handled by the "Merged Vehicles" bucket. Player characters ("character") and encounter "group" actors are intentionally excluded. */
export const VEHICLE_TYPES = ["vehicle"];

/** dnd5e Item subtypes handled by the "Merged Species" bucket. Covers both the older "race" type string and newer "species" naming. */
export const SPECIES_TYPES = ["race", "species"];

/** dnd5e Item subtypes handled by the "Merged Backgrounds" bucket. */
export const BACKGROUND_TYPES = ["background"];

/** dnd5e Item subtypes handled by the "Merged Classes" bucket. Subclasses are bundled in alongside classes rather than split into a fifth compendium. */
export const CLASS_TYPES = ["class", "subclass"];

/** dnd5e Item subtypes handled by the "Merged Feats" bucket. */
export const FEAT_TYPES = ["feat"];

/**
 * dnd5e's modern (2024) rules collapse class features, subclass features, species traits,
 * background features, and monster features all into a single Item type "feat", distinguished
 * by a system.type.value subtype ("class", "subclass", "race"/"species", "background",
 * "monster", or "feat" for an actual, player-chosen feat). Only the container document itself
 * (one "Fighter" class item, one "Elf" species item, etc.) uses the dedicated "class"/"race"/
 * "background" Item type — the many feature items granted along the way are all type "feat".
 * Matching on doc.type alone therefore misses most of a feature-heavy compendium (e.g. a
 * "Character Origins" pack, which is mostly background-feature "feat" items with only a
 * handful of actual "background" container items) and dumps it into Feats instead of
 * Backgrounds/Species/Classes. These helpers account for both.
 */
function featSubtype(doc) {
  return doc.system?.type?.value || "feat";
}

export function isSpeciesDoc(doc) {
  return SPECIES_TYPES.includes(doc.type) || (doc.type === "feat" && SPECIES_TYPES.includes(featSubtype(doc)));
}

export function isBackgroundDoc(doc) {
  return BACKGROUND_TYPES.includes(doc.type) || (doc.type === "feat" && featSubtype(doc) === "background");
}

export function isClassDoc(doc) {
  return CLASS_TYPES.includes(doc.type) || (doc.type === "feat" && CLASS_TYPES.includes(featSubtype(doc)));
}

/** A true, player-chosen feat — not a class/subclass/species/background/monster feature riding along on the same Item type. */
export function isFeatDoc(doc) {
  return doc.type === "feat" && featSubtype(doc) === "feat";
}

export const MERGE_FOLDER_NAME = "Compendium Merger";

/** dnd5e system.type.value values for "equipment" items that are actually armor, not general equipment. */
export const ARMOR_SUBTYPES = ["light", "medium", "heavy", "shield"];

/** dnd5e system.type.value values for "loot" items that are trade goods (gems, art objects, raw commodities) rather than generic loot. */
export const TRADE_GOOD_SUBTYPES = ["art", "gem", "trade", "treasure"];

/** In-compendium top-level folder names for "Merged Items", and the order they're created/displayed in. */
export const ITEM_CATEGORY_ORDER = ["Weapons", "Armor", "Equipment", "Consumables", "Tools", "Trade Goods", "Loot", "Containers"];

/** Item categories that do NOT get a rarity sub-folder (mundane commodity buckets, not usually magic items). */
export const NO_RARITY_CATEGORIES = ["Trade Goods", "Loot"];

/** dnd5e system.rarity values, in display order, mapped to folder labels. Blank/unset rarity is treated as "Mundane". */
export const RARITY_LABELS = {
  "": "Mundane",
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  veryRare: "Very Rare",
  legendary: "Legendary",
  artifact: "Artifact"
};

export const RARITY_ORDER = ["", "common", "uncommon", "rare", "veryRare", "legendary", "artifact"];
