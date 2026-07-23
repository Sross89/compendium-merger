import {
  ITEM_TYPES, SPELL_TYPES, MONSTER_TYPES, VEHICLE_TYPES, MERGEABLE_DOCUMENT_NAMES,
  MERGE_FOLDER_NAME, ARMOR_SUBTYPES, ITEM_CATEGORY_ORDER
} from "./constants.js";

const NO_FOLDER_KEY = "__no-folder__";

const SPELL_CATEGORY_ORDER = ["Cantrips", "1st Level", "2nd Level", "3rd Level", "4th Level", "5th Level", "6th Level", "7th Level", "8th Level", "9th Level"];

/**
 * A document's in-compendium category: a human-readable folder name plus a numeric key
 * to sort those folders by (since folder names like "CR 1/2" don't sort correctly as
 * plain strings). Returning null means "no folder — leave it at the compendium's top level."
 * @typedef {{label: string, sortKey: number}|null} Category
 */

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

/** Which in-compendium folder a merged Monster belongs to: one per Challenge Rating. */
function monsterCategoryFor(doc) {
  const cr = doc.system?.details?.cr;
  if (cr === null || cr === undefined) return null;
  return { label: crLabel(cr), sortKey: Number(cr) };
}

/** Vehicles aren't sorted into sub-folders yet — always uncategorized (flat, alphabetical). */
function vehicleCategoryFor() {
  return null;
}

/** Climb from a folder up to its top-most ancestor (a folder with no parent of its own). */
function getRootFolder(folder) {
  let current = folder;
  while (current?.folder) current = current.folder;
  return current;
}

/**
 * Every Item or Actor compendium, grouped by its top-level (root) Compendium folder —
 * climbing past any nested sub-folders (e.g. a "Legacy Content" folder holding separate
 * "Items & Spells" and "Monsters" sub-folders) so priority is set once per source, not
 * per sub-folder. Compendiums with no parent folder are grouped into a single "(No
 * Folder)" bucket. Every pack anywhere under a root folder — no matter how deeply nested
 * — ends up in that root's group, so checking one folder sweeps in everything inside it.
 * @returns {{id: string, label: string, packs: {id: string, label: string}[]}[]}
 */
export function getSourceFolders() {
  const groups = new Map();

  for (const pack of game.packs.filter(p => MERGEABLE_DOCUMENT_NAMES.includes(p.documentName))) {
    const root = pack.folder ? getRootFolder(pack.folder) : null;
    const key = root?.id ?? NO_FOLDER_KEY;
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        label: root?.name ?? game.i18n.localize("COMPENDIUM-MERGER.App.NoFolder"),
        packs: []
      });
    }
    groups.get(key).packs.push({
      id: pack.metadata.id,
      label: `${pack.title} (${pack.metadata.packageName})`
    });
  }

  for (const group of groups.values()) {
    group.packs.sort((a, b) => a.label.localeCompare(b.label));
  }

  const result = [...groups.values()];
  result.sort((a, b) => {
    if (a.id === NO_FOLDER_KEY) return 1;
    if (b.id === NO_FOLDER_KEY) return -1;
    return a.label.localeCompare(b.label);
  });
  return result;
}

/** The "Compendium Merger" compendium folder, created on first use. */
async function getOrCreateMergeFolder() {
  const existing = game.folders.find(f => f.type === "Compendium" && f.name === MERGE_FOLDER_NAME);
  if (existing) return existing;
  return Folder.create({ name: MERGE_FOLDER_NAME, type: "Compendium", color: "#5a1e1e" });
}

/** Find an existing merged pack of the given document type by label, or create a fresh one inside the merge folder. */
async function getOrCreateMergedPack(type, label) {
  const existing = game.packs.find(pack => pack.documentName === type && pack.metadata.label === label && pack.metadata.packageType === "world");
  if (existing) return existing;

  const folder = await getOrCreateMergeFolder();
  return CompendiumCollection.createCompendium({ type, label, folder: folder.id });
}

/**
 * Wipe every document and folder out of a compendium pack, then insert fresh copies of
 * the given documents, organized into in-compendium folders per `categoryOf(doc)` (e.g.
 * spell level, monster CR, or weapon/armor/equipment/...). Documents whose category is
 * null are left uncategorized at the compendium's top level.
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
    .sort((a, b) => a[1] - b[1])
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

/**
 * Run a full-rebuild merge: scan the given source compendiums in priority order (first =
 * highest priority), bucket Items, Spells, Monsters, and Vehicles by normalized name, and
 * rebuild the four "Merged ..." world compendiums from the result. Anything else (Item
 * feats/classes/subclasses/backgrounds/species, Actor characters/groups, ...) is skipped
 * for now.
 * @param {string[]} orderedPackIds source pack ids, highest priority first
 * @param {(update: {stage: string, packId?: string}) => void} [onProgress]
 * @returns {Promise<{scanned: number, items: number, spells: number, monsters: number, vehicles: number, skipped: number, packsRead: number}>}
 */
export async function runMerge(orderedPackIds, onProgress) {
  const itemsByKey = new Map();
  const spellsByKey = new Map();
  const monstersByKey = new Map();
  const vehiclesByKey = new Map();
  let scanned = 0;
  let skipped = 0;
  let packsRead = 0;

  for (const packId of orderedPackIds) {
    const pack = game.packs.get(packId);
    if (!pack) continue;

    onProgress?.({ stage: "reading", packId });
    const documents = await pack.getDocuments();
    packsRead++;

    for (const doc of documents) {
      scanned++;
      let bucket = null;
      if (pack.documentName === "Item") {
        if (SPELL_TYPES.includes(doc.type)) bucket = spellsByKey;
        else if (ITEM_TYPES.includes(doc.type)) bucket = itemsByKey;
      } else if (pack.documentName === "Actor") {
        if (MONSTER_TYPES.includes(doc.type)) bucket = monstersByKey;
        else if (VEHICLE_TYPES.includes(doc.type)) bucket = vehiclesByKey;
      }

      if (!bucket) {
        skipped++;
        continue;
      }

      const key = doc.name.trim().toLowerCase();
      if (bucket.has(key)) continue; // a higher-priority pack already claimed this name
      bucket.set(key, doc);
    }
  }

  onProgress?.({ stage: "writing" });
  const itemsPack = await getOrCreateMergedPack("Item", "Merged Items");
  const spellsPack = await getOrCreateMergedPack("Item", "Merged Spells");
  const monstersPack = await getOrCreateMergedPack("Actor", "Merged Monsters");
  const vehiclesPack = await getOrCreateMergedPack("Actor", "Merged Vehicles");

  await rebuildPack(itemsPack, [...itemsByKey.values()], itemCategoryFor);
  await rebuildPack(spellsPack, [...spellsByKey.values()], spellCategoryFor);
  await rebuildPack(monstersPack, [...monstersByKey.values()], monsterCategoryFor);
  await rebuildPack(vehiclesPack, [...vehiclesByKey.values()], vehicleCategoryFor);

  onProgress?.({ stage: "done" });

  return {
    scanned,
    items: itemsByKey.size,
    spells: spellsByKey.size,
    monsters: monstersByKey.size,
    vehicles: vehiclesByKey.size,
    skipped,
    packsRead
  };
}
