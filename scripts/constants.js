export const MODULE_ID = "compendium-merger";

export const SETTINGS = {
  ITEM_SOURCE_ORDER: "itemSourceOrder",
  SPELL_SOURCE_ORDER: "spellSourceOrder",
  MONSTER_SOURCE_ORDER: "monsterSourceOrder",
  VEHICLE_SOURCE_ORDER: "vehicleSourceOrder",
  MONSTER_SORT_MODE: "monsterSortMode",
  FILTER_EMPTY_SOURCES: "filterEmptySources"
};

/** dnd5e Item subtypes handled by the "Merged Items" bucket. More types (Species, Class, Feat, ...) may come later. */
export const ITEM_TYPES = ["weapon", "equipment", "consumable", "tool", "loot", "container"];

/** dnd5e Item subtypes handled by the "Merged Spells" bucket. */
export const SPELL_TYPES = ["spell"];

/** dnd5e Actor subtypes handled by the "Merged Monsters" bucket. */
export const MONSTER_TYPES = ["npc"];

/** dnd5e Actor subtypes handled by the "Merged Vehicles" bucket. Player characters ("character") and encounter "group" actors are intentionally excluded. */
export const VEHICLE_TYPES = ["vehicle"];

export const MERGE_FOLDER_NAME = "Compendium Merger";

/** dnd5e system.type.value values for "equipment" items that are actually armor, not general equipment. */
export const ARMOR_SUBTYPES = ["light", "medium", "heavy", "shield"];

/** In-compendium folder names for "Merged Items", and the order they're created/displayed in. */
export const ITEM_CATEGORY_ORDER = ["Weapons", "Armor", "Equipment", "Consumables", "Tools", "Loot", "Containers"];
