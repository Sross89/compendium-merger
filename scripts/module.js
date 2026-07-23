import { MODULE_ID } from "./constants.js";
import { registerSettings } from "./settings.js";
import { runMerge } from "./merge.js";
import { MergerApp } from "./apps/merger-app.js";

Hooks.once("init", () => {
  registerSettings();

  game.modules.get(MODULE_ID).api = {
    runMerge,
    openMerger: () => new MergerApp().render(true)
  };
});

Hooks.on("renderCompendiumDirectory", (app, html) => {
  if (!game.user.isGM) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("compendium-merger-open");
  button.innerHTML = `<i class="fa-solid fa-code-merge"></i> ${game.i18n.localize("COMPENDIUM-MERGER.App.SidebarButton")}`;
  button.addEventListener("click", () => new MergerApp().render(true));

  const root = html instanceof HTMLElement ? html : html[0];
  const footer = root.querySelector(".directory-footer") ?? root.querySelector(".directory-header");
  (footer ?? root).appendChild(button);
});
