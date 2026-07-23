import {
  MODULE_ID, SETTINGS,
  ITEM_TYPES, SPELL_TYPES, MONSTER_TYPES, VEHICLE_TYPES,
  isSpeciesDoc, isBackgroundDoc, isClassDoc, isFeatDoc, isMonsterFeatureDoc
} from "../constants.js";
import { getPacksFor, getPacksWithType, runMerge } from "../merge.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** The nine independently-ordered source categories, each with a label (for the tab nav) and a `matches` predicate used by the optional content filter. */
const CATEGORIES = {
  items: { settingsKey: SETTINGS.ITEM_SOURCE_ORDER, documentName: "Item", label: "COMPENDIUM-MERGER.App.ItemsLegend", matches: doc => ITEM_TYPES.includes(doc.type) },
  spells: { settingsKey: SETTINGS.SPELL_SOURCE_ORDER, documentName: "Item", label: "COMPENDIUM-MERGER.App.SpellsLegend", matches: doc => SPELL_TYPES.includes(doc.type) },
  monsters: { settingsKey: SETTINGS.MONSTER_SOURCE_ORDER, documentName: "Actor", label: "COMPENDIUM-MERGER.App.MonstersLegend", matches: doc => MONSTER_TYPES.includes(doc.type) },
  vehicles: { settingsKey: SETTINGS.VEHICLE_SOURCE_ORDER, documentName: "Actor", label: "COMPENDIUM-MERGER.App.VehiclesLegend", matches: doc => VEHICLE_TYPES.includes(doc.type) },
  species: { settingsKey: SETTINGS.SPECIES_SOURCE_ORDER, documentName: "Item", label: "COMPENDIUM-MERGER.App.SpeciesLegend", matches: isSpeciesDoc },
  backgrounds: { settingsKey: SETTINGS.BACKGROUND_SOURCE_ORDER, documentName: "Item", label: "COMPENDIUM-MERGER.App.BackgroundsLegend", matches: isBackgroundDoc },
  classes: { settingsKey: SETTINGS.CLASS_SOURCE_ORDER, documentName: "Item", label: "COMPENDIUM-MERGER.App.ClassesLegend", matches: isClassDoc },
  feats: { settingsKey: SETTINGS.FEAT_SOURCE_ORDER, documentName: "Item", label: "COMPENDIUM-MERGER.App.FeatsLegend", matches: isFeatDoc },
  monsterFeatures: { settingsKey: SETTINGS.MONSTER_FEATURE_SOURCE_ORDER, documentName: "Item", label: "COMPENDIUM-MERGER.App.MonsterFeaturesLegend", matches: isMonsterFeatureDoc }
};

const CATEGORY_IDS = Object.keys(CATEGORIES);

export class MergerApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "compendium-merger-app",
    tag: "div",
    window: {
      title: "COMPENDIUM-MERGER.App.Title",
      icon: "fa-solid fa-code-merge",
      contentClasses: ["compendium-merger"],
      resizable: true
    },
    position: { width: 520, height: 680 }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/merger.hbs`, scrollable: [""] }
  };

  /** true while a merge is in progress, to disable the button and avoid double-runs. */
  #running = false;

  /** Result of the last completed merge this session, or null. */
  #lastResult = null;

  /** Which category tab is currently showing, kept across re-renders. */
  #activeTab = CATEGORY_IDS[0];

  /**
   * Build the current ordered source list for one category, merging saved order/checked
   * state with whatever compendiums actually exist right now. When the "only show
   * compendiums with matching content" setting is on, the available list is filtered down
   * to compendiums that actually contain at least one document of this category's type.
   */
  async #buildOrder(categoryId) {
    const { settingsKey, documentName, matches } = CATEGORIES[categoryId];
    const filterEmpty = game.settings.get(MODULE_ID, SETTINGS.FILTER_EMPTY_SOURCES);
    const available = filterEmpty ? await getPacksWithType(documentName, matches) : getPacksFor(documentName);
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
    const buildSection = async (categoryId) => {
      const order = await this.#buildOrder(categoryId);
      return {
        hasSources: !!order.length,
        order: order.map((entry, index) => ({ ...entry, index })),
        checkedCount: order.filter(entry => entry.checked).length
      };
    };

    const sections = await Promise.all(CATEGORY_IDS.map(buildSection));
    const bySection = Object.fromEntries(CATEGORY_IDS.map((id, index) => [id, { ...sections[index], active: id === this.#activeTab }]));

    const tabs = CATEGORY_IDS.map(id => ({
      id,
      label: CATEGORIES[id].label,
      checkedCount: bySection[id].checkedCount,
      active: id === this.#activeTab
    }));

    return {
      ...bySection,
      tabs,
      monsterSortMode: game.settings.get(MODULE_ID, SETTINGS.MONSTER_SORT_MODE) ?? "cr",
      filterEmptySources: game.settings.get(MODULE_ID, SETTINGS.FILTER_EMPTY_SOURCES) ?? false,
      running: this.#running,
      result: this.#lastResult
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const el = this.element;

    const monsterSortSelect = el.querySelector('select[name="monsterSortMode"]');
    if (monsterSortSelect) monsterSortSelect.value = game.settings.get(MODULE_ID, SETTINGS.MONSTER_SORT_MODE) ?? "cr";

    el.querySelectorAll(".cm-tab-link").forEach(link => {
      link.addEventListener("click", () => {
        this.#activeTab = link.dataset.tab;
        this.render();
      });
    });

    el.querySelectorAll("[data-toggle-index]").forEach(checkbox => {
      checkbox.addEventListener("change", async () => {
        const categoryId = checkbox.dataset.category;
        const order = await this.#buildOrder(categoryId);
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
        const order = await this.#buildOrder(categoryId);
        [order[index - 1], order[index]] = [order[index], order[index - 1]];
        await this.#persistOrder(categoryId, order);
        this.render();
      });
    });

    el.querySelectorAll("[data-move-down]").forEach(button => {
      button.addEventListener("click", async () => {
        const categoryId = button.dataset.category;
        const index = Number(button.dataset.moveDown);
        const order = await this.#buildOrder(categoryId);
        if (index >= order.length - 1) return;
        [order[index], order[index + 1]] = [order[index + 1], order[index]];
        await this.#persistOrder(categoryId, order);
        this.render();
      });
    });

    monsterSortSelect?.addEventListener("change", () => {
      game.settings.set(MODULE_ID, SETTINGS.MONSTER_SORT_MODE, monsterSortSelect.value);
    });

    el.querySelector('[name="filterEmptySources"]')?.addEventListener("change", async (event) => {
      await game.settings.set(MODULE_ID, SETTINGS.FILTER_EMPTY_SOURCES, event.target.checked);
      this.render();
    });

    el.querySelector('[data-action="run-merge"]')?.addEventListener("click", () => this.#onRunMerge());
  }

  async #onRunMerge() {
    if (this.#running) return;

    const checkedIds = async (categoryId) => (await this.#buildOrder(categoryId)).filter(entry => entry.checked).map(entry => entry.id);
    const checkedLists = await Promise.all(CATEGORY_IDS.map(checkedIds));
    const [itemPackIds, spellPackIds, monsterPackIds, vehiclePackIds, speciesPackIds, backgroundPackIds, classPackIds, featPackIds, monsterFeaturePackIds] = checkedLists;

    if (!checkedLists.some(list => list.length)) {
      ui.notifications.warn(game.i18n.localize("COMPENDIUM-MERGER.Warnings.NoSourcesChecked"));
      return;
    }

    const monsterSortMode = game.settings.get(MODULE_ID, SETTINGS.MONSTER_SORT_MODE) ?? "cr";

    this.#running = true;
    this.#lastResult = null;
    this.render();

    try {
      const result = await runMerge({
        itemPackIds, spellPackIds, monsterPackIds, vehiclePackIds,
        speciesPackIds, backgroundPackIds, classPackIds, featPackIds, monsterFeaturePackIds,
        monsterSortMode
      });
      this.#lastResult = result;
      ui.notifications.info(game.i18n.format("COMPENDIUM-MERGER.App.MergeComplete", {
        items: result.items,
        spells: result.spells,
        monsters: result.monsters,
        vehicles: result.vehicles,
        species: result.species,
        backgrounds: result.backgrounds,
        classes: result.classes,
        feats: result.feats,
        monsterFeatures: result.monsterFeatures
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
