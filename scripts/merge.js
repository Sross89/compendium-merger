import { ITEM_TYPES, SPELL_TYPES, MERGE_FOLDER_NAME } from "./constants.js";

/** All compendiums that hold Item documents, visible to the current user. */
export function getSourceCompendiums() {
  return game.packs
    .filter(pack => pack.documentName === "Item")
    .map(pack => ({
      id: pack.metadata.id,
      label: `${pack.title} (${pack.metadata.packageName})`
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
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

/** Wipe every document out of a compendium pack, then insert fresh copies of the given documents. */
async function rebuildPack(pack, documents) {
  if (pack.locked) await pack.configure({ locked: false });

  const existingIds = pack.index.map(entry => entry._id);
  if (existingIds.length) {
    await pack.documentClass.deleteDocuments(existingIds, { pack: pack.collection });
  }

  const data = documents.map(doc => {
    const obj = doc.toObject();
    delete obj._id;
    delete obj.folder;
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

  await rebuildPack(itemsPack, [...itemsByKey.values()]);
  await rebuildPack(spellsPack, [...spellsByKey.values()]);

  onProgress?.({ stage: "done" });

  return {
    scanned,
    items: itemsByKey.size,
    spells: spellsByKey.size,
    skipped,
    packsRead
  };
}
