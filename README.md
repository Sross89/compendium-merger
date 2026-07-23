# Compendium Merger

A Foundry VTT module that merges multiple Item compendiums — say, your PHB 2024, Tasha's Cauldron, and a homebrew pack — into unified, priority-ordered "Merged Items" and "Merged Spells" compendiums, so you don't have to search five separate spell lists to find Fireball.

## Features

- **Priority-ordered merge** — pick which Item compendiums to merge and arrange them in priority order. If the same name (e.g. "Fireball") shows up in more than one checked compendium, the copy from whichever is closer to the top wins; the rest are skipped.
- **Two output compendiums for now** — "Merged Items" (weapons, equipment, consumables, tools, loot, containers) and "Merged Spells", both created automatically inside a "Compendium Merger" compendium folder the first time you run a merge. Feats, classes, subclasses, backgrounds, and species aren't touched yet — they're left in place for a future version.
- **Full rebuild, every time** — running the merge wipes and fully repopulates the two output compendiums from your current checked sources and priority order. This keeps the mental model simple (no hidden incremental-sync state to reason about), but it also means: don't hand-edit documents inside "Merged Items"/"Merged Spells" directly, since the next merge will overwrite them. Edit the source compendiums instead, then re-run.
- **Non-destructive to sources** — the merge only ever reads from your source compendiums and writes into the two merged ones. Nothing in your original PHB/Tasha's/homebrew packs is modified.

## Installation

1. In Foundry's **Add-on Modules** tab, click **Install Module**.
2. Paste this manifest URL:
   `https://raw.githubusercontent.com/Sross89/compendium-merger/master/module.json`
3. Enable **Compendium Merger** in your world's Module Management.

## Usage

As GM, open the **Compendium Packs** sidebar tab and click **Merge Compendiums** at the bottom.

Check the source compendiums you want included, use the up/down arrows to set priority order (top = highest priority), then click **Run Merge**. The result summary shows how many compendiums were read, how many documents were scanned, how many ended up in each merged compendium, and how many were skipped because they weren't an Item or Spell type.

Your choices (which compendiums are checked, and their order) are remembered between sessions, so you can just reopen and click Run Merge again after adding a new source pack.

## Compatibility

- Foundry VTT v13+ (verified against v14)
- Built and tuned against dnd5e Item type names (`weapon`, `equipment`, `consumable`, `tool`, `loot`, `container`, `spell`); other game systems aren't specifically supported yet.

## Development

Plain ESM, no build step required. Clone/symlink this folder directly into your Foundry `Data/modules/` directory as `compendium-merger`.

This module hasn't been tested against a live Foundry instance yet — if the merge fails, check the browser console (F12) for the error and report it.
