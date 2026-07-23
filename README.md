# Compendium Merger

A Foundry VTT module that merges multiple Item and Actor compendiums — say, your PHB 2024, Tasha's Cauldron, and a homebrew pack — into unified, priority-ordered "Merged Items," "Merged Spells," "Merged Monsters," and "Merged Vehicles" compendiums, so you don't have to search five separate spell lists to find Fireball or five separate monster manuals to find a Goblin.

## Features

- **Independent priority per category** — Items, Spells, Monsters, and Vehicles each get their own list of source compendiums and their own priority order, picked directly (not via folders). A source that's your best pick for spells isn't necessarily the one you want winning for monsters, so each category is ordered separately. If the same name (e.g. "Fireball," "Goblin") shows up in more than one checked compendium within a category, the copy from whichever is closer to the top wins; the rest are skipped.
- **Four output compendiums for now** — "Merged Items" (weapons, equipment, consumables, tools, loot, containers), "Merged Spells", "Merged Monsters" (Actor type "npc"), and "Merged Vehicles" (Actor type "vehicle"), all created automatically inside a "Compendium Merger" compendium folder the first time you run a merge. Feats, classes, subclasses, backgrounds, species, player characters, and encounter groups aren't touched yet — they're left in place for a future version.
- **Organized inside the merged compendiums** — "Merged Items" is sorted into in-compendium folders (Weapons, Armor, Equipment, Consumables, Tools, Loot, Containers — "Armor" is split out of general dnd5e "Equipment" items automatically), "Merged Spells" into a folder per spell level (Cantrips, 1st Level, ... 9th Level), and "Merged Monsters" into a folder per Challenge Rating **or** creature type (Aberration, Beast, Humanoid, ...) — your choice, via a toggle in the Monsters section. "Merged Vehicles" isn't sorted into folders yet — it's a flat, alphabetical list.
- **Full rebuild, every time** — running the merge wipes and fully repopulates all four output compendiums from your current checked sources and priority order. This keeps the mental model simple (no hidden incremental-sync state to reason about), but it also means: don't hand-edit documents inside the merged compendiums directly, since the next merge will overwrite them. Edit the source compendiums instead, then re-run.
- **Non-destructive to sources** — the merge only ever reads from your source compendiums and writes into the merged ones. Nothing in your original PHB/Tasha's/homebrew packs is modified.

## Installation

1. In Foundry's **Add-on Modules** tab, click **Install Module**.
2. Paste this manifest URL:
   `https://raw.githubusercontent.com/Sross89/compendium-merger/master/module.json`
3. Enable **Compendium Merger** in your world's Module Management.

## Usage

As GM, open the **Compendium Packs** sidebar tab and click **Merge Compendiums** at the bottom.

For each of the four category sections (Items, Spells, Monsters, Vehicles), check the source compendiums you want included and use the up/down arrows to set priority order (top = highest priority) — Items and Spells both list every Item compendium, Monsters and Vehicles both list every Actor compendium, since a single source pack sometimes mixes content types (e.g. an "Items & Spells" pack). In the Monsters section, also choose whether to sort by Challenge Rating or creature type. Then click **Run Merge**. The result summary shows how many compendiums were read, how many documents were scanned, how many ended up in each merged compendium, and how many were skipped because they weren't a handled type.

Your choices (which compendiums are checked per category, their order, and the monster sort mode) are remembered between sessions, so you can just reopen and click Run Merge again after adding a new source pack.

## Compatibility

- Foundry VTT v13+ (verified against v14)
- Built and tuned against dnd5e Item type names (`weapon`, `equipment`, `consumable`, `tool`, `loot`, `container`, `spell`) and Actor type names (`npc`, `vehicle`); other game systems aren't specifically supported yet.

## Development

Plain ESM, no build step required. Clone/symlink this folder directly into your Foundry `Data/modules/` directory as `compendium-merger`.

This module hasn't been tested against a live Foundry instance yet — if the merge fails, check the browser console (F12) for the error and report it.
