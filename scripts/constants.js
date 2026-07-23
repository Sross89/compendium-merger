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

/**
 * dnd5e Item subtypes handled by the "Merged Species" bucket. WotC's 2024 rulebooks
 * renamed "Race" to "Species" in the displayed UI, but the underlying Item type string is
 * still "race" (confirmed against the installed dnd5e system + official content packs on
 * disk) — "species" is kept here too as a defensive fallback in case a future dnd5e
 * version does rename the internal key.
 */
export const SPECIES_TYPES = ["race", "species"];

/** dnd5e Item subtypes handled by the "Merged Backgrounds" bucket. */
export const BACKGROUND_TYPES = ["background"];

/** dnd5e Item subtypes handled by the "Merged Classes" bucket. Subclasses are bundled in alongside classes rather than split into a fifth compendium. */
export const CLASS_TYPES = ["class", "subclass"];

/**
 * dnd5e's modern (2024) rules collapse class features, subclass features, species traits,
 * background features, and monster features all into a single unified Item type "feat",
 * distinguished by a system.type.value subtype ("class" for both class AND subclass
 * features, "race" for species traits, "background", "monster", or "feat" for an actual,
 * player-chosen feat). Only the container document itself (one "Fighter" class item, one
 * "Elf" species item, etc.) uses the dedicated "class"/"subclass"/"race"/"background" Item
 * type — the many feature items granted along the way are all type "feat". Confirmed
 * directly against the installed dnd5e system + official content module packs on disk
 * (PHB/DMG/MM/Tasha's/Phandelver): the Foundry create-item dialog now labels this type
 * "Feature" rather than "Feat" in its UI, but the underlying `type` string is still "feat"
 * — "feature" is kept as a defensive fallback in case a future dnd5e version renames the
 * internal key. Matching on doc.type alone (without the subtype) misses most of a
 * feature-heavy compendium (e.g. a "Character Origins" pack, which is mostly
 * background-feature items with only a handful of actual "background" container items)
 * and dumps it into Feats instead of Backgrounds/Species/Classes.
 */
const FEATURE_ITEM_TYPES = ["feat", "feature"];

export function featSubtype(doc) {
  return doc.system?.type?.value || "feat";
}

/**
 * system.type.value subtypes gathered into the "Merged Feats" category, each getting its
 * own in-compendium sub-folder. Beyond true player-chosen feats ("feat"), this also covers
 * Epic Boons ("supernaturalGift", from the 2024 DMG) and Artificer Infusions
 * ("enchantment", from Tasha's Cauldron) — both are "feat"-type items in the same spirit as
 * feats (player-facing bonus features), just not literally subtype "feat".
 */
export const FEAT_SUBTYPE_LABELS = {
  feat: "Feats",
  supernaturalGift: "Supernatural Gifts",
  enchantment: "Enchantments"
};

export const FEAT_SUBTYPE_ORDER = Object.keys(FEAT_SUBTYPE_LABELS);

export function isSpeciesDoc(doc) {
  return SPECIES_TYPES.includes(doc.type) || (FEATURE_ITEM_TYPES.includes(doc.type) && SPECIES_TYPES.includes(featSubtype(doc)));
}

export function isBackgroundDoc(doc) {
  return BACKGROUND_TYPES.includes(doc.type) || (FEATURE_ITEM_TYPES.includes(doc.type) && featSubtype(doc) === "background");
}

export function isClassDoc(doc) {
  return CLASS_TYPES.includes(doc.type) || (FEATURE_ITEM_TYPES.includes(doc.type) && CLASS_TYPES.includes(featSubtype(doc)));
}

/** A true feat, Epic Boon, or Artificer Infusion — not a class/subclass/species/background/monster feature riding along on the same Item type. See FEAT_SUBTYPE_LABELS for the exact subtypes covered. */
export function isFeatDoc(doc) {
  return FEATURE_ITEM_TYPES.includes(doc.type) && FEAT_SUBTYPE_ORDER.includes(featSubtype(doc));
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

/** dnd5e system.type.value values for "equipment" items that are actually armor, not general equipment. Confirmed against installed content. */
export const ARMOR_SUBTYPES = ["light", "medium", "heavy", "shield"];

/** dnd5e system.type.value values for "loot" items that are raw tradeable commodities (herbs, spices, cloth, and the like) rather than generic loot. Confirmed against installed content. */
export const TRADE_GOOD_SUBTYPES = ["trade"];

/** dnd5e system.type.value values for "loot" items that are valuables — art objects, gemstones, and other treasure — rather than generic loot. Confirmed against installed content. */
export const TREASURE_SUBTYPES = ["art", "gem", "treasure"];

/** In-compendium top-level folder names for "Merged Items", and the order they're created/displayed in. */
export const ITEM_CATEGORY_ORDER = ["Weapons", "Armor", "Equipment", "Consumables", "Tools", "Trade Goods", "Treasure", "Loot", "Containers"];

/** Item categories that do NOT get a rarity sub-folder (mundane commodity buckets, not usually magic items). */
export const NO_RARITY_CATEGORIES = ["Trade Goods", "Treasure", "Loot"];

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
