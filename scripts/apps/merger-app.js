import { MODULE_ID, SETTINGS } from "../constants.js";
import { getSourceCompendiums, runMerge } from "../merge.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

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

  /** Build the current ordered source list, merging saved order/checked state with whatever compendiums actually exist right now. */
  #buildOrder() {
    const available = getSourceCompendiums();
    const saved = game.settings.get(MODULE_ID, SETTINGS.SOURCE_ORDER) ?? [];
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

  #persistOrder(order) {
    game.settings.set(MODULE_ID, SETTINGS.SOURCE_ORDER, order.map(({ id, checked }) => ({ id, checked })));
  }

  async _prepareContext() {
    const order = this.#buildOrder();
    return {
      order: order.map((entry, index) => ({ ...entry, index })),
      hasSources: !!order.length,
      running: this.#running,
      result: this.#lastResult
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const el = this.element;

    el.querySelectorAll("[data-toggle-index]").forEach(checkbox => {
      checkbox.addEventListener("change", () => {
        const order = this.#buildOrder();
        const index = Number(checkbox.dataset.toggleIndex);
        order[index].checked = checkbox.checked;
        this.#persistOrder(order);
      });
    });

    el.querySelectorAll("[data-move-up]").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.moveUp);
        if (index <= 0) return;
        const order = this.#buildOrder();
        [order[index - 1], order[index]] = [order[index], order[index - 1]];
        this.#persistOrder(order);
        this.render();
      });
    });

    el.querySelectorAll("[data-move-down]").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.moveDown);
        const order = this.#buildOrder();
        if (index >= order.length - 1) return;
        [order[index], order[index + 1]] = [order[index + 1], order[index]];
        this.#persistOrder(order);
        this.render();
      });
    });

    el.querySelector('[data-action="run-merge"]')?.addEventListener("click", () => this.#onRunMerge());
  }

  async #onRunMerge() {
    if (this.#running) return;

    const order = this.#buildOrder();
    const checkedIds = order.filter(entry => entry.checked).map(entry => entry.id);
    if (!checkedIds.length) {
      ui.notifications.warn(game.i18n.localize("COMPENDIUM-MERGER.Warnings.NoSourcesChecked"));
      return;
    }

    this.#running = true;
    this.#lastResult = null;
    this.render();

    try {
      const result = await runMerge(checkedIds);
      this.#lastResult = result;
      ui.notifications.info(game.i18n.format("COMPENDIUM-MERGER.App.MergeComplete", {
        items: result.items,
        spells: result.spells
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
