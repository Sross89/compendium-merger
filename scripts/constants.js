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
  MONSTER_FEATURE_SOURCE_ORDER: "monsterFeatureSourceOrder",
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

/**
 * dnd5e's modern (2024) rules collapse class features, subclass features, species traits,
 * background features, and monster features all into a single unified Item type,
 * distinguished by a system.type.value subtype ("class", "subclass", "race"/"species",
 * "background", "monster", or "feat" for an actual, player-chosen feat). Only the
 * container document itself (one "Fighter" class item, one "Elf" species item, etc.) uses
 * the dedicated "class"/"race"/"background" Item type — the many feature items granted
 * along the way are all this one unified type. Its Foundry create-item dialog now labels
 * it "Feature" rather than "Feat" (since it covers far more than just feats), but Foundry
 * systems generally avoid renaming the underlying `type` string once content exists using
 * it (that would require a data migration across every compendium in the ecosystem), so
 * both "feat" (the older/likely-still-current internal key) and "feature" (in case it *was*
 * renamed) are treated as this unified type here — matching on doc.type alone otherwise
 * misses most of a feature-heavy compendium (e.g. a "Character Origins" pack, which is
 * mostly background-feature items with only a handful of actual "background" container
 * items) and dumps it into Feats instead of Backgrounds/Species/Classes.
 */
const FEATURE_ITEM_TYPES = ["feat", "feature"];

function featSubtype(doc) {
  return doc.system?.type?.value || "feat";
}

export function isSpeciesDoc(doc) {
  return SPECIES_TYPES.includes(doc.type) || (FEATURE_ITEM_TYPES.includes(doc.type) && SPECIES_TYPES.includes(featSubtype(doc)));
}

export function isBackgroundDoc(doc) {
  return BACKGROUND_TYPES.includes(doc.type) || (FEATURE_ITEM_TYPES.includes(doc.type) && featSubtype(doc) === "background");
}

export function isClassDoc(doc) {
  return CLASS_TYPES.includes(doc.type) || (FEATURE_ITEM_TYPES.includes(doc.type) && CLASS_TYPES.includes(featSubtype(doc)));
}

/** A true, player-chosen feat — not a class/subclass/species/background/monster feature riding along on the same Item type. */
export function isFeatDoc(doc) {
  return FEATURE_ITEM_TYPES.includes(doc.type) && featSubtype(doc) === "feat";
}

/**
 * A monster feature or creature trait — the unified-type items that make up an NPC/monster
 * stat block (Multiattack, Pack Tactics, Amphibious, and the like). Official WotC content
 * splits its stat-block feature compendiums into things it labels "Monster Features" and
 * "Creature Traits", but both live under the same "monster" system.type.value subtype in
 * dnd5e's data model, so they're merged into one category rather than two.
 */
export function isMonsterFeatureDoc(doc) {
  return FEATURE_ITEM_TYPES.includes(doc.type) && featSubtype(doc) === "monster";
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
