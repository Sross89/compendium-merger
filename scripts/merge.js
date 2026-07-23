import {
  ITEM_TYPES, SPELL_TYPES, MONSTER_TYPES, VEHICLE_TYPES, SPECIES_TYPES,
  isSpeciesDoc, isBackgroundDoc, isClassDoc, isFeatDoc, isMonsterFeatureDoc, featSubtype,
  MERGE_FOLDER_NAME, ARMOR_SUBTYPES, TRADE_GOOD_SUBTYPES, TREASURE_SUBTYPES, ITEM_CATEGORY_ORDER, NO_RARITY_CATEGORIES, RARITY_LABELS, RARITY_ORDER,
  FEAT_SUBTYPE_LABELS, FEAT_SUBTYPE_ORDER
} from "./constants.js";

const SPELL_CATEGORY_ORDER = ["Cantrips", "1st Level", "2nd Level", "3rd Level", "4th Level", "5th Level", "6th Level", "7th Level", "8th Level", "9th Level"];

/**
 * A document's in-compendium folder path: an array of {label, sortKey} segments from
 * root to leaf (e.g. [{label: "Weapons", ...}, {label: "Rare", ...}] nests a "Rare"
 * folder inside "Weapons"). Returning null means "no folder — leave it at the
 * compendium's top level."
 * @typedef {{label: string, sortKey: number|string}} CategorySegment
 * @typedef {CategorySegment[]|null} CategoryPath
 */

/** All compendiums of the given document type ("Item" or "Actor"), visible to the current user. */
export function getPacksFor(documentName) {
  return game.packs
    .filter(pack => pack.documentName === documentName)
    .map(pack => ({ id: pack.metadata.id, label: `${pack.title} (${pack.metadata.packageName})` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Cache of pack id -> full documents, so toggling the content filter repeatedly doesn't refetch. */
const packDocumentsCache = new Map();

/** pack.getDocuments() should already return a plain array, but normalize defensively in case a given Foundry version hands back a Collection instead (Map-based, .size not .length) — same defensive pattern used elsewhere in this file for pack.folders. */
function toArray(indexLike) {
  if (Array.isArray(indexLike)) return indexLike;
  return indexLike?.contents ?? Array.from(indexLike?.values?.() ?? []);
}

/**
 * Full Documents rather than the lightweight index — subtype-aware matchers (e.g.
 * isBackgroundDoc) need doc.system.type.value, and getIndex()'s `fields` option isn't
 * guaranteed to reconstruct arbitrary nested system fields the way accessing a real
 * Document's data always does. Costs more than an index fetch, but only runs when the
 * "only show compendiums with matching content" filter is on, and is cached per pack.
 */
async function getPackDocuments(packId) {
  if (packDocumentsCache.has(packId)) return packDocumentsCache.get(packId);
  const pack = game.packs.get(packId);
  const rawDocuments = pack ? await pack.getDocuments() : [];
  const documents = toArray(rawDocuments);
  packDocumentsCache.set(packId, documents);
  return documents;
}

/**
 * Same as getPacksFor(), but filtered down to only compendiums that contain at least one
 * document `matches` accepts. A strict majority requirement was tried here previously, but
 * real official content broke that assumption: dnd5e's 2024 "Origins" packs (Character
 * Origins, the PHB's own Origins pack) legitimately bundle Species and Backgrounds
 * together in one compendium, with Backgrounds only a small minority by document count
 * (species traits/features vastly outnumber background features) — a majority filter hid
 * those packs from the Backgrounds tab entirely, even though they contain perfectly good
 * background content. "At least one match" means a pack that's mostly Species but has 16
 * real Backgrounds in it still shows up under Backgrounds, same as it always did.
 * @param {"Item"|"Actor"} documentName
 * @param {(doc: object) => boolean} matches
 * @returns {Promise<{id: string, label: string}[]>}
 */
export async function getPacksWithType(documentName, matches) {
  const packs = getPacksFor(documentName);
  const results = [];
  for (const pack of packs) {
    const documents = await getPackDocuments(pack.id);
    if (documents.some(matches)) results.push(pack);
  }
  return results;
}

/** Human-readable rarity label, matching dnd5e's rarity naming. Blank/unset is "Mundane". */
function rarityLabel(rarity) {
  return RARITY_LABELS[rarity] ?? RARITY_LABELS[""];
}

function raritySortKey(rarity) {
  const index = RARITY_ORDER.indexOf(rarity);
  return index === -1 ? 0 : index;
}

/**
 * Which in-compendium folder path a merged Item belongs to. Top level is
 * Weapons/Armor/Equipment/Consumables/Tools/Trade Goods/Treasure/Loot/Containers;
 * everything except Trade Goods, Treasure, and Loot (mundane commodity buckets) also gets
 * a rarity sub-folder (Mundane/Common/Uncommon/Rare/Very Rare/Legendary/Artifact).
 */
function itemCategoryFor(doc) {
  let label = null;
  if (doc.type === "weapon") label = "Weapons";
  else if (doc.type === "consumable") label = "Consumables";
  else if (doc.type === "tool") label = "Tools";
  else if (doc.type === "container") label = "Containers";
  else if (doc.type === "loot") {
    const subtype = doc.system?.type?.value;
    if (TREASURE_SUBTYPES.includes(subtype)) label = "Treasure";
    else if (TRADE_GOOD_SUBTYPES.includes(subtype)) label = "Trade Goods";
    else label = "Loot";
  } else if (doc.type === "equipment") {
    label = ARMOR_SUBTYPES.includes(doc.system?.type?.value) ? "Armor" : "Equipment";
  }
  if (label === null) return null;

  const path = [{ label, sortKey: ITEM_CATEGORY_ORDER.indexOf(label) }];
  if (!NO_RARITY_CATEGORIES.includes(label)) {
    const rarity = doc.system?.rarity ?? "";
    path.push({ label: rarityLabel(rarity), sortKey: raritySortKey(rarity) });
  }
  return path;
}

/** Which in-compendium folder a merged Spell belongs to: Cantrips, 1st Level, ... 9th Level. */
function spellCategoryFor(doc) {
  const level = doc.system?.level ?? 0;
  return [{ label: SPELL_CATEGORY_ORDER[level] ?? SPELL_CATEGORY_ORDER.at(-1), sortKey: level }];
}

/** Human-readable CR label, matching how dnd5e displays fractional challenge ratings. */
function crLabel(cr) {
  if (cr === 0.125) return "CR 1/8";
  if (cr === 0.25) return "CR 1/4";
  if (cr === 0.5) return "CR 1/2";
  return `CR ${cr}`;
}

/** Monster category: one folder per Challenge Rating. */
function monsterCRCategoryFor(doc) {
  const cr = doc.system?.details?.cr;
  if (cr === null || cr === undefined) return null;
  return [{ label: crLabel(cr), sortKey: Number(cr) }];
}

/** Monster category: one folder per creature type (Aberration, Beast, Humanoid, ...). */
function monsterTypeCategoryFor(doc) {
  const type = doc.system?.details?.type?.value;
  if (!type) return null;
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return [{ label, sortKey: label }];
}

/** Vehicles aren't sorted into sub-folders yet — always uncategorized (flat, alphabetical). */
function uncategorized() {
  return null;
}

/**
 * Background category: the base Background container item (e.g. "Acolyte") gets its own
 * folder, separate from the passive feature it grants (e.g. "Shelter of the Faithful" —
 * "feat"-type, subtype "background") — otherwise the feature ends up mixed in
 * alphabetically alongside the actual backgrounds themselves.
 */
function backgroundCategoryFor(doc) {
  if (doc.type === "background") return [{ label: "Backgrounds", sortKey: 0 }];
  return [{ label: "Background Features", sortKey: 1 }];
}

/**
 * Species category: the base Species/race container item (e.g. "Elf") gets its own folder,
 * separate from the racial trait it grants (e.g. "Draconic Ancestry" — "feat"-type,
 * subtype "race") — same idea as Backgrounds.
 */
function speciesCategoryFor(doc) {
  if (SPECIES_TYPES.includes(doc.type)) return [{ label: "Species", sortKey: 0 }];
  return [{ label: "Species Traits", sortKey: 1 }];
}

/** Feat category: one folder per subtype (Feats, Supernatural Gifts, Enchantments — see FEAT_SUBTYPE_LABELS). */
function featCategoryFor(doc) {
  const subtype = featSubtype(doc);
  const label = FEAT_SUBTYPE_LABELS[subtype] ?? FEAT_SUBTYPE_LABELS.feat;
  return [{ label, sortKey: FEAT_SUBTYPE_ORDER.indexOf(subtype) }];
}

/**
 * Class category: the base Class container item, the Subclass container item, and every
 * class/subclass-granted feature (all "feat"-type, subtype "class" — class and subclass
 * features aren't distinguished from each other at the subtype level) each get their own
 * folder, rather than dumping all the mechanical passives/features in alongside the two
 * container items.
 */
function classCategoryFor(doc) {
  if (doc.type === "class") return [{ label: "Classes", sortKey: 0 }];
  if (doc.type === "subclass") return [{ label: "Subclasses", sortKey: 1 }];
  return [{ label: "Class Features", sortKey: 2 }];
}

/** The "Compendium Merger" compendium folder, created on first use. */
async function getOrCreateMergeFolder() {
  const existing = game.folders.find(f => f.type === "Compendium" && f.name === MERGE_FOLDER_NAME);
  if (existing) return existing;
  return Folder.create({ name: MERGE_FOLDER_NAME, type: "Compendium", color: "#5a1e1e" });
}

/**
 * Find an existing merged pack of the given document type by label, or create a fresh
 * one, ensuring it lives inside the merge folder either way. Compendium pack folder
 * membership is stored in the pack's own configuration (not the creation metadata), so
 * it has to be set via a separate configure() call after createCompendium() — and is
 * re-checked even for an already-existing pack in case it was ever left mis-placed.
 */
async function getOrCreateMergedPack(type, label) {
  const mergeFolder = await getOrCreateMergeFolder();

  const existing = game.packs.find(pack => pack.documentName === type && pack.metadata.label === label && pack.metadata.packageType === "world");
  if (existing) {
    if (existing.folder?.id !== mergeFolder.id) await existing.configure({ folder: mergeFolder.id });
    return existing;
  }

  const pack = await CompendiumCollection.createCompendium({ type, label });
  await pack.configure({ folder: mergeFolder.id });
  return pack;
}

/**
 * Find (creating if needed) the in-compendium folder at the end of `path`, nesting
 * folders as necessary — e.g. a ["Weapons", "Rare"] path creates (or reuses) a "Rare"
 * folder living inside a "Weapons" folder. `cache` is scoped to one rebuildPack() run
 * so repeated calls for the same path don't recreate folders.
 * @param {CompendiumCollection} pack
 * @param {CategorySegment[]} path
 * @param {Map<string, Folder>} cache
 * @returns {Promise<string>} the leaf folder's id
 */
async function ensureFolderPath(pack, path, cache) {
  let parentId = null;
  let pathKey = "";
  for (const segment of path) {
    pathKey += `>${segment.label}`;
    if (!cache.has(pathKey)) {
      const folder = await Folder.create(
        { name: segment.label, type: pack.documentName, folder: parentId, sort: segment.sortKey * 10000 },
        { pack: pack.collection }
      );
      cache.set(pathKey, folder);
    }
    parentId = cache.get(pathKey).id;
  }
  return parentId;
}

/**
 * Wipe every document and folder out of a compendium pack, then insert fresh copies of
 * the given documents, organized into in-compendium folders (nested where `categoryOf`
 * returns a multi-segment path, e.g. rarity nested under item category) per
 * `categoryOf(doc)`. Documents whose category is null are left uncategorized at the
 * compendium's top level.
 * @param {CompendiumCollection} pack
 * @param {object[]} documents
 * @param {(doc: object) => CategoryPath} categoryOf
 */
async function rebuildPack(pack, documents, categoryOf) {
  if (pack.locked) await pack.configure({ locked: false });

  const existingIds = pack.index.map(entry => entry._id);
  if (existingIds.length) {
    await pack.documentClass.deleteDocuments(existingIds, { pack: pack.collection });
  }
  const existingFolders = pack.folders?.contents ?? [];
  if (existingFolders.length) {
    await Folder.deleteDocuments(existingFolders.map(f => f.id), { pack: pack.collection });
  }

  const folderCache = new Map();
  const sorted = [...documents].sort((a, b) => a.name.localeCompare(b.name));
  const data = [];
  for (const doc of sorted) {
    const obj = doc.toObject();
    delete obj._id;
    const path = categoryOf(doc);
    obj.folder = path ? await ensureFolderPath(pack, path, folderCache) : null;
    data.push(obj);
  }
  if (data.length) {
    await pack.documentClass.createDocuments(data, { pack: pack.collection });
  }
}

/** Scan the given packs in priority order, keeping the first (highest-priority) document per normalized name that passes `matchesType`. */
async function collectByKey(packIds, matchesType, onProgress) {
  const byKey = new Map();
  let scanned = 0;
  let skipped = 0;
  let packsRead = 0;

  for (const packId of packIds) {
    const pack = game.packs.get(packId);
    if (!pack) continue;

    onProgress?.({ stage: "reading", packId });
    const documents = await pack.getDocuments();
    packsRead++;

    for (const doc of documents) {
      scanned++;
      if (!matchesType(doc)) {
        skipped++;
        continue;
      }
      const key = doc.name.trim().toLowerCase();
      if (byKey.has(key)) continue; // a higher-priority pack already claimed this name
      byKey.set(key, doc);
    }
  }

  return { byKey, scanned, skipped, packsRead };
}

/**
 * Run a full-rebuild merge. Each of the nine categories (Items, Spells, Monsters,
 * Vehicles, Species, Backgrounds, Classes, Feats, Monster Features) has its own
 * independent priority-ordered list of source compendiums — a source that's great for
 * spells isn't necessarily the one you want winning for monsters, so priority is set per
 * category rather than once globally. Rebuilds all nine "Merged ..." world compendiums
 * from the result.
 * @param {object} params
 * @param {string[]} [params.itemPackIds] highest priority first
 * @param {string[]} [params.spellPackIds] highest priority first
 * @param {string[]} [params.monsterPackIds] highest priority first
 * @param {string[]} [params.vehiclePackIds] highest priority first
 * @param {string[]} [params.speciesPackIds] highest priority first
 * @param {string[]} [params.backgroundPackIds] highest priority first
 * @param {string[]} [params.classPackIds] highest priority first
 * @param {string[]} [params.featPackIds] highest priority first
 * @param {string[]} [params.monsterFeaturePackIds] highest priority first
 * @param {"cr"|"type"} [params.monsterSortMode]
 * @param {(update: {stage: string, packId?: string}) => void} [onProgress]
 * @returns {Promise<{scanned: number, skipped: number, packsRead: number, items: number, spells: number, monsters: number, vehicles: number, species: number, backgrounds: number, classes: number, feats: number, monsterFeatures: number}>}
 */
export async function runMerge({
  itemPackIds = [], spellPackIds = [], monsterPackIds = [], vehiclePackIds = [],
  speciesPackIds = [], backgroundPackIds = [], classPackIds = [], featPackIds = [],
  monsterFeaturePackIds = [],
  monsterSortMode = "cr"
} = {}, onProgress) {
  const items = await collectByKey(itemPackIds, doc => ITEM_TYPES.includes(doc.type), onProgress);
  const spells = await collectByKey(spellPackIds, doc => SPELL_TYPES.includes(doc.type), onProgress);
  const monsters = await collectByKey(monsterPackIds, doc => MONSTER_TYPES.includes(doc.type), onProgress);
  const vehicles = await collectByKey(vehiclePackIds, doc => VEHICLE_TYPES.includes(doc.type), onProgress);
  const species = await collectByKey(speciesPackIds, isSpeciesDoc, onProgress);
  const backgrounds = await collectByKey(backgroundPackIds, isBackgroundDoc, onProgress);
  const classes = await collectByKey(classPackIds, isClassDoc, onProgress);
  const feats = await collectByKey(featPackIds, isFeatDoc, onProgress);
  const monsterFeatures = await collectByKey(monsterFeaturePackIds, isMonsterFeatureDoc, onProgress);

  onProgress?.({ stage: "writing" });
  const itemsPack = await getOrCreateMergedPack("Item", "Merged Items");
  const spellsPack = await getOrCreateMergedPack("Item", "Merged Spells");
  const monstersPack = await getOrCreateMergedPack("Actor", "Merged Monsters");
  const vehiclesPack = await getOrCreateMergedPack("Actor", "Merged Vehicles");
  const speciesPack = await getOrCreateMergedPack("Item", "Merged Species");
  const backgroundsPack = await getOrCreateMergedPack("Item", "Merged Backgrounds");
  const classesPack = await getOrCreateMergedPack("Item", "Merged Classes");
  const featsPack = await getOrCreateMergedPack("Item", "Merged Feats");
  const monsterFeaturesPack = await getOrCreateMergedPack("Item", "Merged Monster Features");

  const monsterCategoryFor = monsterSortMode === "type" ? monsterTypeCategoryFor : monsterCRCategoryFor;

  await rebuildPack(itemsPack, [...items.byKey.values()], itemCategoryFor);
  await rebuildPack(spellsPack, [...spells.byKey.values()], spellCategoryFor);
  await rebuildPack(monstersPack, [...monsters.byKey.values()], monsterCategoryFor);
  await rebuildPack(vehiclesPack, [...vehicles.byKey.values()], uncategorized);
  await rebuildPack(speciesPack, [...species.byKey.values()], speciesCategoryFor);
  await rebuildPack(backgroundsPack, [...backgrounds.byKey.values()], backgroundCategoryFor);
  await rebuildPack(classesPack, [...classes.byKey.values()], classCategoryFor);
  await rebuildPack(featsPack, [...feats.byKey.values()], featCategoryFor);
  await rebuildPack(monsterFeaturesPack, [...monsterFeatures.byKey.values()], uncategorized);

  onProgress?.({ stage: "done" });

  const parts = [items, spells, monsters, vehicles, species, backgrounds, classes, feats, monsterFeatures];
  return {
    scanned: parts.reduce((sum, part) => sum + part.scanned, 0),
    skipped: parts.reduce((sum, part) => sum + part.skipped, 0),
    packsRead: parts.reduce((sum, part) => sum + part.packsRead, 0),
    items: items.byKey.size,
    spells: spells.byKey.size,
    monsters: monsters.byKey.size,
    vehicles: vehicles.byKey.size,
    species: species.byKey.size,
    backgrounds: backgrounds.byKey.size,
    classes: classes.byKey.size,
    feats: feats.byKey.size,
    monsterFeatures: monsterFeatures.byKey.size
  };
}
