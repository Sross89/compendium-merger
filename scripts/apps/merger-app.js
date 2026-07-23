import { MODULE_ID, SETTINGS } from "../constants.js";
import { getPacksFor, runMerge } from "../merge.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** The four independently-ordered source categories. */
const CATEGORIES = {
  items: { settingsKey: SETTINGS.ITEM_SOURCE_ORDER, documentName: "Item" },
  spells: { settingsKey: SETTINGS.SPELL_SOURCE_ORDER, documentName: "Item" },
  monsters: { settingsKey: SETTINGS.MONSTER_SOURCE_ORDER, documentName: "Actor" },
  vehicles: { settingsKey: SETTINGS.VEHICLE_SOURCE_ORDER, documentName: "Actor" }
};

export class MergerApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "compendium-merger-app",
    tag: "div",
    window: {
      title: "COMPENDIUM-MERGER.App.Title",
      icon: "fa-solid fa-code-merge",
      contentClasses: ["compendium-merger"]
    },
    position: { width: 480, height: "auto" }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/merger.hbs` }
  };

  /** true while a merge is in progress, to disable the button and avoid double-runs. */
  #running = false;

  /** Result of the last completed merge this session, or null. */
  #lastResult = null;

  /** Build the current ordered source list for one category, merging saved order/checked state with whatever compendiums actually exist right now. */
  #buildOrder(categoryId) {
    const { settingsKey, documentName } = CATEGORIES[categoryId];
    const available = getPacksFor(documentName);
    const saved = game.settings.get(MODULE_ID, settingsKey) ?? [];
    const savedById = new Map(saved.map(entry => [entry.id, entry]));

    const ordered = [];
    for (const entry of saved) {
      const pack = available.find(p => p.id === entry.id);
      if (pack) ordered.push({ id: pack.id, label: pack.label, checked: !!entry.checked });
    }
    for (const pack of available) {
      if (!savedById.has(pack.id)) ordered.push({ id: pack.id, label: pack.label, checked: false });
    }
    return ordered;
  }

  async #persistOrder(categoryId, order) {
    const { settingsKey } = CATEGORIES[categoryId];
    await game.settings.set(MODULE_ID, settingsKey, order.map(({ id, checked }) => ({ id, checked })));
  }

  async _prepareContext() {
    const buildSection = (categoryId) => {
      const order = this.#buildOrder(categoryId);
      return { hasSources: !!order.length, order: order.map((entry, index) => ({ ...entry, index })) };
    };

    return {
      items: buildSection("items"),
      spells: buildSection("spells"),
      monsters: buildSection("monsters"),
      vehicles: buildSection("vehicles"),
      monsterSortMode: game.settings.get(MODULE_ID, SETTINGS.MONSTER_SORT_MODE) ?? "cr",
      running: this.#running,
      result: this.#lastResult
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const el = this.element;

    const monsterSortSelect = el.querySelector('select[name="monsterSortMode"]');
    if (monsterSortSelect) monsterSortSelect.value = game.settings.get(MODULE_ID, SETTINGS.MONSTER_SORT_MODE) ?? "cr";

    el.querySelectorAll("[data-toggle-index]").forEach(checkbox => {
      checkbox.addEventListener("change", async () => {
        const categoryId = checkbox.dataset.category;
        const order = this.#buildOrder(categoryId);
        const index = Number(checkbox.dataset.toggleIndex);
        order[index].checked = checkbox.checked;
        await this.#persistOrder(categoryId, order);
      });
    });

    el.querySelectorAll("[data-move-up]").forEach(button => {
      button.addEventListener("click", async () => {
        const categoryId = button.dataset.category;
        const index = Number(button.dataset.moveUp);
        if (index <= 0) return;
        const order = this.#buildOrder(categoryId);
        [order[index - 1], order[index]] = [order[index], order[index - 1]];
        await this.#persistOrder(categoryId, order);
        this.render();
      });
    });

    el.querySelectorAll("[data-move-down]").forEach(button => {
      button.addEventListener("click", async () => {
        const categoryId = button.dataset.category;
        const index = Number(button.dataset.moveDown);
        const order = this.#buildOrder(categoryId);
        if (index >= order.length - 1) return;
        [order[index], order[index + 1]] = [order[index + 1], order[index]];
        await this.#persistOrder(categoryId, order);
        this.render();
      });
    });

    monsterSortSelect?.addEventListener("change", () => {
      game.settings.set(MODULE_ID, SETTINGS.MONSTER_SORT_MODE, monsterSortSelect.value);
    });

    el.querySelector('[data-action="run-merge"]')?.addEventListener("click", () => this.#onRunMerge());
  }

  async #onRunMerge() {
    if (this.#running) return;

    const checkedIds = (categoryId) => this.#buildOrder(categoryId).filter(entry => entry.checked).map(entry => entry.id);
    const itemPackIds = checkedIds("items");
    const spellPackIds = checkedIds("spells");
    const monsterPackIds = checkedIds("monsters");
    const vehiclePackIds = checkedIds("vehicles");

    if (!itemPackIds.length && !spellPackIds.length && !monsterPackIds.length && !vehiclePackIds.length) {
      ui.notifications.warn(game.i18n.localize("COMPENDIUM-MERGER.Warnings.NoSourcesChecked"));
      return;
    }

    const monsterSortMode = game.settings.get(MODULE_ID, SETTINGS.MONSTER_SORT_MODE) ?? "cr";

    this.#running = true;
    this.#lastResult = null;
    this.render();

    try {
      const result = await runMerge({ itemPackIds, spellPackIds, monsterPackIds, vehiclePackIds, monsterSortMode });
      this.#lastResult = result;
      ui.notifications.info(game.i18n.format("COMPENDIUM-MERGER.App.MergeComplete", {
        items: result.items,
        spells: result.spells,
        monsters: result.monsters,
        vehicles: result.vehicles
      }));
    } catch (err) {
      console.error(`${MODULE_ID} | Merge failed`, err);
      ui.notifications.error(game.i18n.localize("COMPENDIUM-MERGER.Warnings.MergeFailed"));
    } finally {
      this.#running = false;
      this.render();
    }
  }
}
