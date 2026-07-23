# Compendium Merger

A Foundry VTT module that merges multiple Item and Actor compendiums — say, your PHB 2024, Tasha's Cauldron, and a homebrew pack — into unified, priority-ordered "Merged X" compendiums, so you don't have to search five separate spell lists to find Fireball or five separate monster manuals to find a Goblin.

## Features

- **Independent priority per category** — Items, Spells, Monsters, Vehicles, Species, Backgrounds, Classes, and Feats each get their own list of source compendiums and their own priority order, picked directly (not via folders). A source that's your best pick for spells isn't necessarily the one you want winning for monsters, so each category is ordered separately. If the same name (e.g. "Fireball," "Goblin") shows up in more than one checked compendium within a category, the copy from whichever is closer to the top wins; the rest are skipped.
- **Eight output compendiums** — "Merged Items" (weapons, equipment, consumables, tools, trade goods, loot, containers), "Merged Spells", "Merged Monsters" (Actor type "npc"), "Merged Vehicles" (Actor type "vehicle"), "Merged Species", "Merged Backgrounds", "Merged Classes" (subclasses bundled in alongside classes), and "Merged Feats" — all created automatically inside a "Compendium Merger" compendium folder the first time you run a merge. Player characters and encounter groups aren't touched — they're left in place.
- **Organized inside the merged compendiums** — "Merged Items" is sorted into in-compendium folders (Weapons, Armor, Equipment, Consumables, Tools, Trade Goods, Loot, Containers — "Armor" is split out of general dnd5e "Equipment" items automatically, and "Trade Goods" — art objects, gems, and other commodities — is split out of general "Loot"), each of which (except Trade Goods and Loot) also gets a rarity sub-folder (Mundane, Common, Uncommon, Rare, Very Rare, Legendary, Artifact). "Merged Spells" is sorted into a folder per spell level (Cantrips, 1st Level, ... 9th Level), and "Merged Monsters" into a folder per Challenge Rating **or** creature type (Aberration, Beast, Humanoid, ...) — your choice, via a toggle in the Monsters section. "Merged Vehicles", "Merged Species", "Merged Backgrounds", "Merged Classes", and "Merged Feats" aren't sorted into sub-folders yet — they're flat, alphabetical lists.
- **Full rebuild, every time** — running the merge wipes and fully repopulates all eight output compendiums from your current checked sources and priority order. This keeps the mental model simple (no hidden incremental-sync state to reason about), but it also means: don't hand-edit documents inside the merged compendiums directly, since the next merge will overwrite them. Edit the source compendiums instead, then re-run.
- **Non-destructive to sources** — the merge only ever reads from your source compendiums and writes into the merged ones. Nothing in your original PHB/Tasha's/homebrew packs is modified.
- **Optional content filter** — a checkbox above the category sections hides compendiums that don't actually contain any matching content (e.g. a pack with no spells in it disappears from the Spells list), so you're not scrolling past irrelevant packs in every category. Off by default since it costs an index fetch per compendium the first time it's checked.

## Installation

1. In Foundry's **Add-on Modules** tab, click **Install Module**.
2. Paste this manifest URL:
   `https://raw.githubusercontent.com/Sross89/compendium-merger/master/module.json`
3. Enable **Compendium Merger** in your world's Module Management.

## Usage

As GM, open the **Compendium Packs** sidebar tab and click **Merge Compendiums** at the bottom.

For each of the eight category sections (Items, Spells, Monsters, Vehicles, Species, Backgrounds, Classes, Feats), check the source compendiums you want included and use the up/down arrows to set priority order (top = highest priority) — Items, Spells, Species, Backgrounds, Classes, and Feats all list every Item compendium, and Monsters and Vehicles both list every Actor compendium, since a single source pack sometimes mixes content types (e.g. an "Items & Spells" pack). In the Monsters section, also choose whether to sort by Challenge Rating or creature type. Then click **Run Merge**. The result summary shows how many compendiums were read, how many documents were scanned, how many ended up in each merged compendium, and how many were skipped because they weren't a handled type.

Your choices (which compendiums are checked per category, their order, and the monster sort mode) are remembered between sessions, so you can just reopen and click Run Merge again after adding a new source pack.

## Compatibility

- Foundry VTT v13+ (verified against v14)
- Built and tuned against dnd5e Item type names (`weapon`, `equipment`, `consumable`, `tool`, `loot`, `container`, `spell`, `race`/`species`, `background`, `class`, `subclass`, `feat`) and Actor type names (`npc`, `vehicle`); other game systems aren't specifically supported yet.

## Development

Plain ESM, no build step required. Clone/symlink this folder directly into your Foundry `Data/modules/` directory as `compendium-merger`.

This module hasn't been tested against a live Foundry instance yet — if the merge fails, check the browser console (F12) for the error and report it.
