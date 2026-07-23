# Compendium Merger

A Foundry VTT module that merges multiple Item and Actor compendiums — say, your PHB 2024, Tasha's Cauldron, and a homebrew pack — into unified, priority-ordered "Merged X" compendiums, so you don't have to search five separate spell lists to find Fireball or five separate monster manuals to find a Goblin.

## Features

- **Independent priority per category** — Items, Spells, Monsters, Vehicles, Species, Backgrounds, Classes, Feats, and Monster Features each get their own list of source compendiums and their own priority order, picked directly (not via folders). A source that's your best pick for spells isn't necessarily the one you want winning for monsters, so each category is ordered separately. If the same name (e.g. "Fireball," "Goblin") shows up in more than one checked compendium within a category, the copy from whichever is closer to the top wins; the rest are skipped.
- **Nine output compendiums** — "Merged Items" (weapons, equipment, consumables, tools, trade goods, treasure, loot, containers), "Merged Spells", "Merged Monsters" (Actor type "npc"), "Merged Vehicles" (Actor type "vehicle"), "Merged Species", "Merged Backgrounds", "Merged Classes" (subclasses bundled in alongside classes), "Merged Feats", and "Merged Monster Features" — all created automatically inside a "Compendium Merger" compendium folder the first time you run a merge. Player characters and encounter groups aren't touched — they're left in place.
- **Organized inside the merged compendiums** — "Merged Items" is sorted into in-compendium folders (Weapons, Armor, Equipment, Consumables, Tools, Trade Goods, Treasure, Loot, Containers — "Armor" is split out of general dnd5e "Equipment" items automatically; "Treasure" — art objects and gemstones — and "Trade Goods" — raw tradeable commodities — are both split out of general "Loot"), each of which (except Trade Goods, Treasure, and Loot) also gets a rarity sub-folder (Mundane, Common, Uncommon, Rare, Very Rare, Legendary, Artifact). "Merged Spells" is sorted into a folder per spell level (Cantrips, 1st Level, ... 9th Level), "Merged Monsters" into a folder per Challenge Rating **or** creature type (Aberration, Beast, Humanoid, ...) — your choice, via a toggle in the Monsters section — "Merged Feats" into Feats, Supernatural Gifts (Epic Boons), and Enchantments (Artificer Infusions) folders, and "Merged Classes" into Classes, Subclasses, and Class Features folders (the last holding every mechanical passive/feature a class or subclass grants, kept separate from the two container items). "Merged Vehicles", "Merged Species", and "Merged Backgrounds" aren't sorted into sub-folders yet — they're flat, alphabetical lists.
- **Full rebuild, every time** — running the merge wipes and fully repopulates all nine output compendiums from your current checked sources and priority order. This keeps the mental model simple (no hidden incremental-sync state to reason about), but it also means: don't hand-edit documents inside the merged compendiums directly, since the next merge will overwrite them. Edit the source compendiums instead, then re-run.
- **Non-destructive to sources** — the merge only ever reads from your source compendiums and writes into the merged ones. Nothing in your original PHB/Tasha's/homebrew packs is modified.
- **Optional content filter** — a checkbox above the category sections hides compendiums that don't contain at least one document of that category's type (e.g. a pack with no spells in it disappears from the Spells list), so you're not scrolling past irrelevant packs in every category. This deliberately isn't a majority requirement: dnd5e's 2024 "Origins" packs (Character Origins, the PHB's own Origins pack) bundle Species and Backgrounds together with Backgrounds as a small minority by document count, and a stricter filter would hide them from the Backgrounds tab entirely despite them containing perfectly good background content. Off by default since it costs a full document fetch per compendium the first time it's checked (needed so subtype-aware matching, like telling a background feature apart from a species trait, works reliably).
- **Feature-aware Species/Background/Class/Monster Feature matching** — dnd5e's modern rules store class features, subclass features, species traits, background features, and monster features/creature traits all as Item type "feat" (distinguished by a subtype field), with only the container document itself (one "Fighter" class item, one "Elf" species item) using its own dedicated type. The Species/Background/Class/Feat/Monster Features categories account for this, so a feature-heavy compendium like "Character Origins" gets correctly read as mostly Backgrounds rather than dumped into Feats, and monster stat-block features/traits land in their own "Merged Monster Features" instead of polluting Feats.
- **Tabbed category sections** — with nine categories, one long scrolling page got unwieldy fast, so each category lives in its own tab (with a small badge showing how many sources are checked). The window is resizable and scrolls if needed.

## Installation

1. In Foundry's **Add-on Modules** tab, click **Install Module**.
2. Paste this manifest URL:
   `https://raw.githubusercontent.com/Sross89/compendium-merger/master/module.json`
3. Enable **Compendium Merger** in your world's Module Management.

## Usage

As GM, open the **Compendium Packs** sidebar tab and click **Merge Compendiums** at the bottom.

For each of the nine category tabs (Items, Spells, Monsters, Vehicles, Species, Backgrounds, Classes, Feats, Monster Features), check the source compendiums you want included and use the up/down arrows to set priority order (top = highest priority) — Items, Spells, Species, Backgrounds, Classes, Feats, and Monster Features all list every Item compendium, and Monsters and Vehicles both list every Actor compendium, since a single source pack sometimes mixes content types (e.g. an "Items & Spells" pack). In the Monsters tab, also choose whether to sort by Challenge Rating or creature type. Then click **Run Merge**. The result summary shows how many compendiums were read, how many documents were scanned, how many ended up in each merged compendium, and how many were skipped because they weren't a handled type.

Your choices (which compendiums are checked per category, their order, and the monster sort mode) are remembered between sessions, so you can just reopen and click Run Merge again after adding a new source pack.

## Compatibility

- Foundry VTT v13+ (verified against v14)
- Built and tuned against dnd5e Item type names (`weapon`, `equipment`, `consumable`, `tool`, `loot`, `container`, `spell`, `race`/`species`, `background`, `class`, `subclass`, `feat`) and Actor type names (`npc`, `vehicle`); other game systems aren't specifically supported yet.

## Development

Plain ESM, no build step required. Clone/symlink this folder directly into your Foundry `Data/modules/` directory as `compendium-merger`.

Every Item type/subtype string this module matches on has been verified against the actual on-disk compendium data from the dnd5e system and the official PHB/DMG/MM/Tasha's/Phandelver content modules — not just guessed at. The module itself still hasn't been exercised inside a running Foundry client, though; if the merge or the content filter behaves unexpectedly, check the browser console (F12) for the error and report it.
