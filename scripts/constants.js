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

/**
 * Cache of Item type -> "is this a physical/inventory item" (weapon, equipment, consumable,
 * tool, loot, container, and anything a module registers with the same shape), computed
 * once from the live game system rather than a hardcoded list. This mirrors exactly what
 * dnd5e's own Item5e.compendiumBrowserTypes() uses to build the Compendium Browser's
 * "Items" tab: every registered Item.TYPES entry whose data model declares an
 * "inventorySection" is physical. Reading it this way means a third-party module that
 * registers its own inventory-style Item type (e.g. Tasha's Cauldron's "Tattoo") is picked
 * up automatically, with no update needed here when that happens.
 */
let physicalItemTypesCache = null;

function getPhysicalItemTypes() {
  if (physicalItemTypesCache) return physicalItemTypesCache;
  const types = new Set();
  for (const type of Item.TYPES) {
    if ([CONST.BASE_DOCUMENT_TYPE, "backpack"].includes(type)) continue;
    if ("inventorySection" in (CONFIG.Item.dataModels[type] ?? {})) types.add(type);
  }
  physicalItemTypesCache = types;
  return types;
}

/** Whether a document belongs in the "Merged Items" bucket — see getPhysicalItemTypes(). */
export function isPhysicalItemDoc(doc) {
  return getPhysicalItemTypes().has(doc.type);
}

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
  // Class AND subclass features both use subtype "class" — there's no separate "subclass"
  // subtype value in dnd5e's CONFIG.DND5E.featureTypes.
  return CLASS_TYPES.includes(doc.type) || (FEATURE_ITEM_TYPES.includes(doc.type) && featSubtype(doc) === "class");
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

/**
 * Whether an "equipment"-type item's subtype counts as armor rather than general
 * equipment. Reads CONFIG.DND5E.armorTypes live instead of a hardcoded list — that config
 * object is dnd5e's own source of truth (it's what the character sheet's armor-proficiency
 * UI uses too), so it already includes subtypes a hand-maintained list previously missed
 * entirely, like "natural" armor.
 */
export function isArmorSubtype(subtype) {
  return subtype in (CONFIG.DND5E?.armorTypes ?? {});
}

/**
 * How each of dnd5e's canonical "loot" subtypes (CONFIG.DND5E.lootTypes: art, gear, gem,
 * junk, material, resource, trade, treasure) is grouped into Merged Items' Trade Goods /
 * Treasure / Loot folders. dnd5e doesn't group loot subtypes into buckets like this itself
 * — this mapping is this module's own curation, not something read from the system — but
 * it's checked against the full live key set below so a subtype this module has never
 * needed to think about (a future dnd5e addition, or one a homebrew module registers)
 * still lands somewhere sensible (generic Loot) instead of silently going uncategorized.
 */
export const LOOT_CATEGORY_BY_SUBTYPE = {
  art: "Treasure",
  gem: "Treasure",
  treasure: "Treasure",
  trade: "Trade Goods",
  material: "Trade Goods",
  resource: "Trade Goods",
  gear: "Loot",
  junk: "Loot"
};

/** Which Merged Items folder a "loot"-type item's subtype belongs in — see LOOT_CATEGORY_BY_SUBTYPE. Anything not in that curated map (including no subtype at all) falls back to generic "Loot". */
export function lootCategoryFor(subtype) {
  return LOOT_CATEGORY_BY_SUBTYPE[subtype] ?? "Loot";
}

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
