import {
  ITEM_TYPES, SPELL_TYPES, MONSTER_TYPES, VEHICLE_TYPES,
  MERGE_FOLDER_NAME, ARMOR_SUBTYPES, ITEM_CATEGORY_ORDER
} from "./constants.js";

const SPELL_CATEGORY_ORDER = ["Cantrips", "1st Level", "2nd Level", "3rd Level", "4th Level", "5th Level", "6th Level", "7th Level", "8th Level", "9th Level"];

/**
 * A document's in-compendium category: a human-readable folder name plus a sort key
 * (number or string) to order those folders by. Returning null means "no folder — leave
 * it at the compendium's top level."
 * @typedef {{label: string, sortKey: number|string}|null} Category
 */

/** All compendiums of the given document type ("Item" or "Actor"), visible to the current user. */
export function getPacksFor(documentName) {
  return game.packs
    .filter(pack => pack.documentName === documentName)
    .map(pack => ({ id: pack.metadata.id, label: `${pack.title} (${pack.metadata.packageName})` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Cache of pack id -> lightweight index as a plain array (just enough to check document types), so toggling the content filter repeatedly doesn't refetch. */
const packTypeIndexCache = new Map();

/** pack.getIndex() returns a Foundry Collection (Map-based, .size not .length) — normalize to a plain array once so callers can just use array methods. */
function toArray(indexLike) {
  if (Array.isArray(indexLike)) return indexLike;
  return indexLike?.contents ?? Array.from(indexLike?.values?.() ?? []);
}

async function getPackTypeIndex(packId) {
  if (packTypeIndexCache.has(packId)) return packTypeIndexCache.get(packId);
  const pack = game.packs.get(packId);
  const rawIndex = pack ? await pack.getIndex({ fields: ["type"] }) : [];
  const entries = toArray(rawIndex);
  packTypeIndexCache.set(packId, entries);
  return entries;
}

/**
 * Same as getPacksFor(), but filtered down to only compendiums where `types` make up
 * the majority of what's actually inside — not just "contains at least one." Many
 * compendiums (a Backgrounds or Character Classes pack, say) bundle a handful of
 * starting-equipment items alongside their real content; requiring a majority keeps
 * those out of the Items list instead of letting one stray item pull the whole pack in,
 * while still catching genuinely mixed packs (e.g. a combined "Items & Spells" pack)
 * for whichever category they're actually mostly made of.
 * @param {"Item"|"Actor"} documentName
 * @param {string[]} types
 * @returns {Promise<{id: string, label: string}[]>}
 */
export async function getPacksWithType(documentName, types) {
  const packs = getPacksFor(documentName);
  const results = [];
  for (const pack of packs) {
    const index = await getPackTypeIndex(pack.id);
    if (!index.length) continue;
    const matching = index.filter(entry => types.includes(entry.type)).length;
    if (matching / index.length > 0.5) results.push(pack);
  }
  return results;
}

/** Which in-compendium folder a merged Item belongs to: Weapons/Armor/Equipment/Consumables/Tools/Loot/Containers. */
function itemCategoryFor(doc) {
  let label = null;
  if (doc.type === "weapon") label = "Weapons";
  else if (doc.type === "consumable") label = "Consumables";
  else if (doc.type === "tool") label = "Tools";
  else if (doc.type === "loot") label = "Loot";
  else if (doc.type === "container") label = "Containers";
  else if (doc.type === "equipment") label = ARMOR_SUBTYPES.includes(doc.system?.type?.value) ? "Armor" : "Equipment";
  if (label === null) return null;
  return { label, sortKey: ITEM_CATEGORY_ORDER.indexOf(label) };
}

/** Which in-compendium folder a merged Spell belongs to: Cantrips, 1st Level, ... 9th Level. */
function spellCategoryFor(doc) {
  const level = doc.system?.level ?? 0;
  return { label: SPELL_CATEGORY_ORDER[level] ?? SPELL_CATEGORY_ORDER.at(-1), sortKey: level };
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
  return { label: crLabel(cr), sortKey: Number(cr) };
}

/** Monster category: one folder per creature type (Aberration, Beast, Humanoid, ...). */
function monsterTypeCategoryFor(doc) {
  const type = doc.system?.details?.type?.value;
  if (!type) return null;
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return { label, sortKey: label };
}

/** Vehicles aren't sorted into sub-folders yet — always uncategorized (flat, alphabetical). */
function vehicleCategoryFor() {
  return null;
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

/** Compare two category sort keys: numeric subtraction for numbers (e.g. CR, spell level), alphabetical otherwise (e.g. creature type, item category name). */
function compareSortKeys(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

/**
 * Wipe every document and folder out of a compendium pack, then insert fresh copies of
 * the given documents, organized into in-compendium folders per `categoryOf(doc)` (e.g.
 * spell level, monster CR/type, or weapon/armor/equipment/...). Documents whose category
 * is null are left uncategorized at the compendium's top level.
 * @param {CompendiumCollection} pack
 * @param {object[]} documents
 * @param {(doc: object) => Category} categoryOf
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

  const categoriesByLabel = new Map();
  for (const doc of documents) {
    const category = categoryOf(doc);
    if (category) categoriesByLabel.set(category.label, category.sortKey);
  }
  const orderedLabels = [...categoriesByLabel.entries()]
    .sort((a, b) => compareSortKeys(a[1], b[1]))
    .map(([label]) => label);

  const folderIdByLabel = new Map();
  for (const [index, label] of orderedLabels.entries()) {
    const folder = await Folder.create({ name: label, type: pack.documentName, sort: index * 10000 }, { pack: pack.collection });
    folderIdByLabel.set(label, folder.id);
  }

  const sorted = [...documents].sort((a, b) => a.name.localeCompare(b.name));
  const data = sorted.map(doc => {
    const obj = doc.toObject();
    delete obj._id;
    const category = categoryOf(doc);
    obj.folder = category ? (folderIdByLabel.get(category.label) ?? null) : null;
    return obj;
  });
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
 * Run a full-rebuild merge. Each category (Items, Spells, Monsters, Vehicles) has its own
 * independent priority-ordered list of source compendiums — a source that's great for
 * spells isn't necessarily the one you want winning for monsters, so priority is set per
 * category rather than once globally. Rebuilds all four "Merged ..." world compendiums
 * from the result.
 * @param {object} params
 * @param {string[]} [params.itemPackIds] highest priority first
 * @param {string[]} [params.spellPackIds] highest priority first
 * @param {string[]} [params.monsterPackIds] highest priority first
 * @param {string[]} [params.vehiclePackIds] highest priority first
 * @param {"cr"|"type"} [params.monsterSortMode]
 * @param {(update: {stage: string, packId?: string}) => void} [onProgress]
 * @returns {Promise<{scanned: number, items: number, spells: number, monsters: number, vehicles: number, skipped: number, packsRead: number}>}
 */
export async function runMerge({
  itemPackIds = [], spellPackIds = [], monsterPackIds = [], vehiclePackIds = [], monsterSortMode = "cr"
} = {}, onProgress) {
  const items = await collectByKey(itemPackIds, doc => ITEM_TYPES.includes(doc.type), onProgress);
  const spells = await collectByKey(spellPackIds, doc => SPELL_TYPES.includes(doc.type), onProgress);
  const monsters = await collectByKey(monsterPackIds, doc => MONSTER_TYPES.includes(doc.type), onProgress);
  const vehicles = await collectByKey(vehiclePackIds, doc => VEHICLE_TYPES.includes(doc.type), onProgress);

  onProgress?.({ stage: "writing" });
  const itemsPack = await getOrCreateMergedPack("Item", "Merged Items");
  const spellsPack = await getOrCreateMergedPack("Item", "Merged Spells");
  const monstersPack = await getOrCreateMergedPack("Actor", "Merged Monsters");
  const vehiclesPack = await getOrCreateMergedPack("Actor", "Merged Vehicles");

  const monsterCategoryFor = monsterSortMode === "type" ? monsterTypeCategoryFor : monsterCRCategoryFor;

  await rebuildPack(itemsPack, [...items.byKey.values()], itemCategoryFor);
  await rebuildPack(spellsPack, [...spells.byKey.values()], spellCategoryFor);
  await rebuildPack(monstersPack, [...monsters.byKey.values()], monsterCategoryFor);
  await rebuildPack(vehiclesPack, [...vehicles.byKey.values()], vehicleCategoryFor);

  onProgress?.({ stage: "done" });

  return {
    scanned: items.scanned + spells.scanned + monsters.scanned + vehicles.scanned,
    skipped: items.skipped + spells.skipped + monsters.skipped + vehicles.skipped,
    packsRead: items.packsRead + spells.packsRead + monsters.packsRead + vehicles.packsRead,
    items: items.byKey.size,
    spells: spells.byKey.size,
    monsters: monsters.byKey.size,
    vehicles: vehicles.byKey.size
  };
}
