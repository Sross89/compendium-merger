import { ITEM_TYPES, SPELL_TYPES, MERGE_FOLDER_NAME, ARMOR_SUBTYPES, ITEM_CATEGORY_ORDER } from "./constants.js";

const NO_FOLDER_KEY = "__no-folder__";

const SPELL_CATEGORY_ORDER = ["Cantrips", "1st Level", "2nd Level", "3rd Level", "4th Level", "5th Level", "6th Level", "7th Level", "8th Level", "9th Level"];

/** Which in-compendium folder a merged Item belongs to: Weapons/Armor/Equipment/Consumables/Tools/Loot/Containers. */
function itemCategoryFor(doc) {
  if (doc.type === "weapon") return "Weapons";
  if (doc.type === "consumable") return "Consumables";
  if (doc.type === "tool") return "Tools";
  if (doc.type === "loot") return "Loot";
  if (doc.type === "container") return "Containers";
  if (doc.type === "equipment") {
    return ARMOR_SUBTYPES.includes(doc.system?.type?.value) ? "Armor" : "Equipment";
  }
  return null;
}

/** Which in-compendium folder a merged Spell belongs to: Cantrips, 1st Level, ... 9th Level. */
function spellCategoryFor(doc) {
  return SPELL_CATEGORY_ORDER[doc.system?.level ?? 0] ?? SPELL_CATEGORY_ORDER.at(-1);
}

/** Climb from a folder up to its top-most ancestor (a folder with no parent of its own). */
function getRootFolder(folder) {
  let current = folder;
  while (current?.folder) current = current.folder;
  return current;
}

/**
 * Every Item compendium, grouped by its top-level (root) Compendium folder — climbing
 * past any nested sub-folders (e.g. a "Legacy Content" folder holding separate "Items &
 * Spells" and "Monsters" sub-folders) so priority is set once per source, not per
 * sub-folder. Compendiums with no parent folder are grouped into a single "(No Folder)"
 * bucket. Every pack anywhere under a root folder — no matter how deeply nested — ends
 * up in that root's group, so checking one folder sweeps in everything inside it.
 * @returns {{id: string, label: string, packs: {id: string, label: string}[]}[]}
 */
export function getSourceFolders() {
  const groups = new Map();

  for (const pack of game.packs.filter(p => p.documentName === "Item")) {
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

/** Find an existing merged pack by label, or create a fresh one inside the merge folder. */
async function getOrCreateMergedPack(label) {
  const existing = game.packs.find(pack => pack.documentName === "Item" && pack.metadata.label === label && pack.metadata.packageType === "world");
  if (existing) return existing;

  const folder = await getOrCreateMergeFolder();
  return CompendiumCollection.createCompendium({
    type: "Item",
    label,
    folder: folder.id
  });
}

/**
 * Wipe every document and folder out of a compendium pack, then insert fresh copies of
 * the given documents, organized into in-compendium folders per `categoryOf(doc)` (e.g.
 * spell level, or weapon/armor/equipment/...). Folders are created in `categoryOrder`,
 * skipping any category nothing actually belongs to; documents with no category (null)
 * are left uncategorized at the compendium's top level.
 */
async function rebuildPack(pack, documents, categoryOf, categoryOrder) {
  if (pack.locked) await pack.configure({ locked: false });

  const existingIds = pack.index.map(entry => entry._id);
  if (existingIds.length) {
    await pack.documentClass.deleteDocuments(existingIds, { pack: pack.collection });
  }
  const existingFolders = pack.folders?.contents ?? [];
  if (existingFolders.length) {
    await Folder.deleteDocuments(existingFolders.map(f => f.id), { pack: pack.collection });
  }

  const present = new Set(documents.map(doc => categoryOf(doc)).filter(Boolean));
  const folderIdByCategory = new Map();
  for (const [index, category] of categoryOrder.filter(c => present.has(c)).entries()) {
    const folder = await Folder.create({ name: category, type: pack.documentName, sort: index * 10000 }, { pack: pack.collection });
    folderIdByCategory.set(category, folder.id);
  }

  const sorted = [...documents].sort((a, b) => a.name.localeCompare(b.name));
  const data = sorted.map(doc => {
    const obj = doc.toObject();
    delete obj._id;
    const category = categoryOf(doc);
    obj.folder = category ? (folderIdByCategory.get(category) ?? null) : null;
    return obj;
  });
  if (data.length) {
    await pack.documentClass.createDocuments(data, { pack: pack.collection });
  }
}

/**
 * Run a full-rebuild merge: scan the given source compendiums in priority order (first
 * = highest priority), bucket Items and Spells by normalized name, and rebuild the
 * "Merged Items" / "Merged Spells" world compendiums from the result. Anything not in
 * ITEM_TYPES or SPELL_TYPES (feats, classes, backgrounds, species, ...) is skipped for now.
 * @param {string[]} orderedPackIds source pack ids, highest priority first
 * @param {(update: {stage: string, packId?: string}) => void} [onProgress]
 * @returns {Promise<{scanned: number, items: number, spells: number, skipped: number, packsRead: number}>}
 */
export async function runMerge(orderedPackIds, onProgress) {
  const itemsByKey = new Map();
  const spellsByKey = new Map();
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
      let bucket;
      if (SPELL_TYPES.includes(doc.type)) bucket = spellsByKey;
      else if (ITEM_TYPES.includes(doc.type)) bucket = itemsByKey;
      else {
        skipped++;
        continue;
      }

      const key = doc.name.trim().toLowerCase();
      if (bucket.has(key)) continue; // a higher-priority pack already claimed this name
      bucket.set(key, doc);
    }
  }

  onProgress?.({ stage: "writing" });
  const itemsPack = await getOrCreateMergedPack("Merged Items");
  const spellsPack = await getOrCreateMergedPack("Merged Spells");

  await rebuildPack(itemsPack, [...itemsByKey.values()], itemCategoryFor, ITEM_CATEGORY_ORDER);
  await rebuildPack(spellsPack, [...spellsByKey.values()], spellCategoryFor, SPELL_CATEGORY_ORDER);

  onProgress?.({ stage: "done" });

  return {
    scanned,
    items: itemsByKey.size,
    spells: spellsByKey.size,
    skipped,
    packsRead
  };
}
