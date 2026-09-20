/* /local/ha-domain-query-table-card/ha-domain-query-table-card.js
 *
 * Version: 2026.09.20.01
 *
 * Combined build: card + GUI config editor in a single file.
 *
 * - In TABLE mode, "Domain: <domain> (<count>)" lives on header row 2.
 * - Swap button stays on row 1 (right aligned).
 * - Row 2 stays right-aligned filters, plus domain text on the left.
 */

import { LitElement, html, css, nothing } from "https://unpkg.com/lit@2.8.0/index.js?module";

const MODE_TABLE = "table";
const MODE_INDEX = "index";

const SORT_KEYS = {
  name: "name",
  entity_id: "entity_id",
  state: "state",
};

function fireEvent(node, type, detail = {}, options = {}) {
  const event = new CustomEvent(type, {
    detail,
    bubbles: options.bubbles ?? true,
    composed: options.composed ?? true,
    cancelable: options.cancelable ?? false,
  });
  node.dispatchEvent(event);
  return event;
}

function safeLower(s) {
  return (s ?? "").toString().toLowerCase();
}

function getDomainFromEntityId(entityId) {
  const idx = (entityId ?? "").indexOf(".");
  return idx > 0 ? entityId.slice(0, idx) : "";
}

function getQueryDomain() {
  try {
    const url = new URL(window.location.href);
    const d = url.searchParams.get("domain");
    return (d ?? "").trim();
  } catch (e) {
    return "";
  }
}

function setQueryDomain(domain) {
  try {
    const url = new URL(window.location.href);
    if (!domain) url.searchParams.delete("domain");
    else url.searchParams.set("domain", domain);
    window.history.pushState({}, "", url.toString());
    return true;
  } catch (e) {
    return false;
  }
}

/* =========================================================================
 * GUI config editor
 * Only option: mode toggle (table <-> index)
 * UI: "MODE: table [toggle] index"
 * ========================================================================= */

class HaDomainQueryTableCardEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  setConfig(config) {
    this._config = { ...config };
  }

  get _mode() {
    const m = (this._config?.mode ?? MODE_TABLE).toString().toLowerCase();
    return m === MODE_INDEX ? MODE_INDEX : MODE_TABLE;
  }

  _valueChanged(ev) {
    if (!this._config) return;

    const checked = ev?.target?.checked ?? false;
    const mode = checked ? MODE_INDEX : MODE_TABLE;

    const newConfig = { ...this._config, mode };
    if ((this._config?.mode ?? MODE_TABLE) === newConfig.mode) return;

    this._config = newConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: newConfig },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.hass) return html``;

    const isIndex = this._mode === MODE_INDEX;

    return html`
      <div class="wrap">
        <div class="row">
          <span class="mode">MODE:</span>
          <span class="label ${!isIndex ? "active" : ""}">table</span>

          <ha-switch
            .checked=${isIndex}
            @change=${(ev) => this._valueChanged(ev)}
            aria-label="Mode"
          ></ha-switch>

          <span class="label ${isIndex ? "active" : ""}">index</span>
        </div>
      </div>
    `;
  }

  static styles = css`
    .wrap {
      padding: 12px 4px;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .mode {
      font-size: 13px;
      font-weight: 700;
      opacity: 0.9;
      user-select: none;
    }

    .label {
      font-size: 13px;
      text-transform: lowercase;
      opacity: 0.65;
      user-select: none;
    }

    .label.active {
      opacity: 1;
      font-weight: 700;
    }

    ha-switch {
      --mdc-theme-secondary: var(--primary-color);
    }
  `;
}

customElements.define(
  "ha-domain-query-table-card-editor",
  HaDomainQueryTableCardEditor
);

/* =========================================================================
 * Card
 * ========================================================================= */

class HaDomainQueryTableCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },

    _sortKey: { state: true },
    _sortDir: { state: true }, // "asc" | "desc"

    _viewMode: { state: true }, // only used when YAML mode is table
    _hideUnknown: { state: true },
    _hideUnavailable: { state: true },

    _colW: { state: true }, // { icon, name, entity_id, state }

    _boundPopState: { state: false },
    _drag: { state: false },
  };

  constructor() {
    super();
    this._config = { mode: MODE_TABLE };

    this._sortKey = SORT_KEYS.name;
    this._sortDir = "asc";

    this._viewMode = null;
    this._hideUnknown = false;
    this._hideUnavailable = false;

    this._colW = {
      icon: 44,
      name: 240,
      entity_id: 260,
      state: 140,
    };

    this._boundPopState = null;
    this._drag = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._boundPopState = () => this.requestUpdate();
    window.addEventListener("popstate", this._boundPopState);
  }

  disconnectedCallback() {
    window.removeEventListener("popstate", this._boundPopState);
    this._boundPopState = null;
    this._removeDragListeners();
    super.disconnectedCallback();
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = { mode: MODE_TABLE, ...config };
    this._viewMode = null;
  }

  static getConfigElement() {
    return document.createElement("ha-domain-query-table-card-editor");
  }

  static getStubConfig() {
    return { mode: MODE_TABLE };
  }

  getCardSize() {
    return 3;
  }

  get _configMode() {
    const m = safeLower(this._config?.mode);
    return m === MODE_INDEX ? MODE_INDEX : MODE_TABLE;
  }

  get _mode() {
    if (this._configMode === MODE_INDEX) return MODE_INDEX;
    return this._viewMode ?? MODE_TABLE;
  }

  get _queryDomain() {
    return getQueryDomain();
  }

  _allEntities() {
    const states = this.hass?.states;
    if (!states) return [];
    return Object.keys(states);
  }

  _entitiesForDomain(domain) {
    const d = (domain ?? "").trim();
    if (!d || !this.hass?.states) return [];
    const prefix = `${d}.`;
    const ids = Object.keys(this.hass.states).filter((eid) => eid.startsWith(prefix));
    return ids.map((entity_id) => {
      const st = this.hass.states[entity_id];
      const name = st?.attributes?.friendly_name ?? entity_id;
      const state = st?.state ?? "";
      return { entity_id, name, state };
    });
  }

  _domainsIndex() {
    const ids = this._allEntities();
    const counts = new Map();
    for (const eid of ids) {
      const d = getDomainFromEntityId(eid);
      if (!d) continue;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    const list = Array.from(counts.entries()).map(([domain, count]) => ({ domain, count }));
    list.sort((a, b) => a.domain.localeCompare(b.domain));
    return list;
  }

  _sortedRows(rows) {
    const key = this._sortKey;
    const dir = this._sortDir;
    const mult = dir === "desc" ? -1 : 1;

    return [...rows].sort((a, b) => {
      let av = "";
      let bv = "";

      if (key === SORT_KEYS.entity_id) {
        av = a.entity_id;
        bv = b.entity_id;
      } else if (key === SORT_KEYS.state) {
        av = a.state;
        bv = b.state;
      } else {
        av = a.name;
        bv = b.name;
      }

      const cmp = safeLower(av).localeCompare(safeLower(bv));
      if (cmp !== 0) return cmp * mult;
      return a.entity_id.localeCompare(b.entity_id) * mult;
    });
  }

  _toggleSort(key) {
    if (this._sortKey === key) {
      this._sortDir = this._sortDir === "asc" ? "desc" : "asc";
    } else {
      this._sortKey = key;
      this._sortDir = "asc";
    }
  }

  _openMoreInfo(entityId) {
    fireEvent(this, "hass-more-info", { entityId });
  }

  _toggleViewMode() {
    if (this._configMode !== MODE_TABLE) return;
    this._viewMode = this._mode === MODE_INDEX ? MODE_TABLE : MODE_INDEX;
  }

  _renderSwapButton() {
    if (this._configMode !== MODE_TABLE) return nothing;

    const goingTo = this._mode === MODE_INDEX ? MODE_TABLE : MODE_INDEX;
    const icon = goingTo === MODE_INDEX ? "mdi:view-list" : "mdi:table";
    const label = goingTo === MODE_INDEX ? "Index" : "Table";
    const title = goingTo === MODE_INDEX ? "Switch to index" : "Switch to table";

    return html`
      <button class="swap-btn" type="button" title=${title} @click=${() => this._toggleViewMode()}>
        <ha-icon class="swap-ico" icon=${icon}></ha-icon>
        <span class="swap-text">${label}</span>
      </button>
    `;
  }

  _onHideUnknownChanged(ev) {
    this._hideUnknown = ev?.target?.checked ?? false;
  }

  _onHideUnavailableChanged(ev) {
    this._hideUnavailable = ev?.target?.checked ?? false;
  }

  _renderTableHeaderRow2(domain, totalCount) {
    return html`
      <div class="header-row2">
        <div class="row2-left">
          <span class="domain-label">Domain:</span>
          <code class="domain-code">${domain}</code>
          <span class="count">(${totalCount})</span>
        </div>

        <div class="row2-right">
          <ha-formfield label="Hide unknown">
            <ha-checkbox .checked=${this._hideUnknown} @change=${(ev) => this._onHideUnknownChanged(ev)}></ha-checkbox>
          </ha-formfield>

          <ha-formfield label="Hide unavailable">
            <ha-checkbox
              .checked=${this._hideUnavailable}
              @change=${(ev) => this._onHideUnavailableChanged(ev)}
            ></ha-checkbox>
          </ha-formfield>
        </div>
      </div>
    `;
  }

  // ===== Column resizing =====

  _minColWidth(key) {
    if (key === "icon") return 36;
    if (key === "state") return 90;
    if (key === "entity_id") return 160;
    return 140; // name
  }

  _startResize(key, ev) {
    ev.preventDefault();
    ev.stopPropagation();

    const startX = ev.clientX ?? (ev.touches && ev.touches[0]?.clientX) ?? 0;
    const startW = this._colW?.[key] ?? 120;

    this._drag = { key, startX, startW };
    this._addDragListeners();
  }

  _addDragListeners() {
    if (this._onDragMove || this._onDragEnd) return;

    this._onDragMove = (e) => this._resizeMove(e);
    this._onDragEnd = () => this._resizeEnd();

    window.addEventListener("mousemove", this._onDragMove);
    window.addEventListener("mouseup", this._onDragEnd);

    window.addEventListener("touchmove", this._onDragMove, { passive: false });
    window.addEventListener("touchend", this._onDragEnd);
    window.addEventListener("touchcancel", this._onDragEnd);
  }

  _removeDragListeners() {
    if (!this._onDragMove || !this._onDragEnd) return;

    window.removeEventListener("mousemove", this._onDragMove);
    window.removeEventListener("mouseup", this._onDragEnd);

    window.removeEventListener("touchmove", this._onDragMove);
    window.removeEventListener("touchend", this._onDragEnd);
    window.removeEventListener("touchcancel", this._onDragEnd);

    this._onDragMove = null;
    this._onDragEnd = null;
  }

  _resizeMove(ev) {
    if (!this._drag) return;

    const clientX = ev.clientX ?? (ev.touches && ev.touches[0]?.clientX) ?? null;
    if (clientX == null) return;

    if (ev.type === "touchmove") ev.preventDefault();

    const dx = clientX - this._drag.startX;
    const key = this._drag.key;

    const minW = this._minColWidth(key);
    const nextW = Math.max(minW, Math.round(this._drag.startW + dx));

    this._colW = { ...this._colW, [key]: nextW };
  }

  _resizeEnd() {
    this._drag = null;
    this._removeDragListeners();
  }

  // ===== Render helpers =====

  _renderNoQueryHelp() {
    return html`
      <div class="help">
        <div class="help-title">How to use</div>
        <div class="help-text">
          Add <code>?domain=&lt;domain&gt;</code> to your dashboard URL to filter entities by domain.
        </div>
        <div class="help-text">
          Example:
          <div class="codeblock"><code>/lovelace/0?domain=switch</code></div>
        </div>
      </div>
    `;
  }

  _th(label, sortKey, colKey) {
    const sortIndicator = () => {
      if (this._sortKey !== sortKey) return "";
      return this._sortDir === "asc" ? " ▲" : " ▼";
    };

    const clickable = sortKey ? "sortable" : "";
    const onClick = sortKey ? () => this._toggleSort(sortKey) : null;

    return html`
      <th class=${clickable} @click=${onClick}>
        <div class="th-inner">
          <span class="th-text">${label}${sortIndicator()}</span>
          <span
            class="col-resizer"
            @mousedown=${(e) => this._startResize(colKey, e)}
            @touchstart=${(e) => this._startResize(colKey, e)}
          ></span>
        </div>
      </th>
    `;
  }

  _renderTable(domain) {
    const allRows = this._entitiesForDomain(domain);

    const filtered = allRows.filter((r) => {
      const st = safeLower(r.state);
      if (this._hideUnknown && st === "unknown") return false;
      if (this._hideUnavailable && st === "unavailable") return false;
      return true;
    });

    const sorted = this._sortedRows(filtered);

    return html`
      <div class="header header-table">
        <!-- Row 1: right aligned swap button -->
        <div class="header-row1">
          <div class="row1-left"></div>
          <div class="header-right">${this._renderSwapButton()}</div>
        </div>

        <!-- Row 2: Domain + filters -->
        ${this._renderTableHeaderRow2(domain, allRows.length)}
      </div>

      <div class="table-wrap">
        <table class="entities">
          <colgroup>
            <col style="width:${this._colW.icon}px" />
            <col style="width:${this._colW.name}px" />
            <col style="width:${this._colW.entity_id}px" />
            <col style="width:${this._colW.state}px" />
          </colgroup>

          <thead>
            <tr>
              ${this._th("Icon", null, "icon")}
              ${this._th("Friendly Name", SORT_KEYS.name, "name")}
              ${this._th("Entity ID", SORT_KEYS.entity_id, "entity_id")}
              ${this._th("State", SORT_KEYS.state, "state")}
            </tr>
          </thead>

          <tbody>
            ${sorted.map(
              (r) => html`
                <tr class="row" @click=${() => this._openMoreInfo(r.entity_id)} title="Open more-info">
                  <td class="col-icon">
                    <ha-state-icon .hass=${this.hass} .stateObj=${this.hass.states[r.entity_id]}></ha-state-icon>
                  </td>
                  <td class="truncate">${r.name}</td>
                  <td class="mono"><code>${r.entity_id}</code></td>
                  <td class="mono"><code>${r.state}</code></td>
                </tr>
              `
            )}

            ${sorted.length === 0
              ? html`
                  <tr>
                    <td colspan="4" class="empty">
                      No entities found (after filters) for <code>${domain}</code>.
                    </td>
                  </tr>
                `
              : nothing}
          </tbody>
        </table>
      </div>
    `;
  }

  _selectDomainFromIndex(domain) {
    setQueryDomain(domain);
    if (this._configMode === MODE_TABLE) {
      this._viewMode = MODE_TABLE;
    }
    this.requestUpdate();
  }

  _renderIndex() {
    const domains = this._domainsIndex();

    return html`
      <div class="header header-index">
        <div class="header-row1">
          <div class="title">Domain index</div>
          <div class="header-right">
            ${this._configMode === MODE_TABLE ? this._renderSwapButton() : nothing}
          </div>
        </div>
      </div>

      <div class="index-list">
        ${domains.map(
          (d) => html`
            <button
              class="index-row"
              type="button"
              title="Set ?domain=${d.domain}"
              @click=${() => this._selectDomainFromIndex(d.domain)}
            >
              <div class="index-domain">${d.domain}</div>
              <div class="index-count">${d.count}</div>
            </button>
          `
        )}
      </div>
    `;
  }

  render() {
    if (!this.hass) return html``;

    if (this._mode === MODE_INDEX) {
      return html`
        <ha-card>
          <div class="pad">${this._renderIndex()}</div>
        </ha-card>
      `;
    }

    const domain = this._queryDomain;

    if (!domain) {
      return html`
        <ha-card>
          <div class="pad">
            <div class="header header-table">
              <div class="header-row1">
                <div class="row1-left"></div>
                <div class="header-right">${this._renderSwapButton()}</div>
              </div>
              <div class="header-row2">
                <div class="row2-left">
                  <span class="domain-label">Domain:</span>
                  <code class="domain-code">(missing)</code>
                  <span class="count">(0)</span>
                </div>
                <div class="row2-right"></div>
              </div>
            </div>

            ${this._renderNoQueryHelp()}
          </div>
        </ha-card>
      `;
    }

    return html`
      <ha-card>
        <div class="pad">${this._renderTable(domain)}</div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .pad {
      padding: 12px;
    }

    /* ===== Header layout ===== */
    .header {
      margin-bottom: 10px;
    }

    .header-row1 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 32px;
    }

    .row1-left {
      flex: 1 1 auto;
      min-width: 0;
    }

    .header-right {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      flex: 0 0 auto;
    }

    /* Swap button with label */
    .swap-btn {
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      border-radius: 10px;
      padding: 6px 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
    }

    .swap-btn:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .swap-ico {
      --mdc-icon-size: 18px;
    }

    /* Row 2: domain left, filters right */
    .header-row2 {
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
    }

    .row2-left {
      display: inline-flex;
      align-items: baseline;
      gap: 8px;
      min-width: 0;
      flex: 1 1 auto;
      font-weight: 700;
      font-size: 14px;
    }

    .domain-label {
      opacity: 0.9;
    }

    .domain-code {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .count {
      opacity: 0.8;
      font-weight: 700;
      font-size: 13px;
      white-space: nowrap;
    }

    .row2-right {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 18px;
      flex-wrap: wrap;
      flex: 0 0 auto;
    }

    ha-formfield {
      --mdc-theme-text-primary-on-background: var(--primary-text-color);
    }

    /* ===== Table ===== */
    .table-wrap {
      overflow: auto;
      border-radius: 12px;
      border: 1px solid var(--divider-color);
    }

    table.entities {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      table-layout: fixed;
      min-width: 560px;
    }

    thead th {
      text-align: left;
      padding: 0;
      background: var(--secondary-background-color);
      border-bottom: 1px solid var(--divider-color);
      position: sticky;
      top: 0;
      z-index: 1;
      white-space: nowrap;
      user-select: none;
    }

    thead th.sortable {
      cursor: pointer;
    }

    .th-inner {
      position: relative;
      padding: 10px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .th-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .col-resizer {
      position: absolute;
      right: 0;
      top: 0;
      height: 100%;
      width: 10px;
      cursor: col-resize;
      touch-action: none;
    }

    .col-resizer::after {
      content: "";
      position: absolute;
      right: 4px;
      top: 20%;
      height: 60%;
      width: 1px;
      background: var(--divider-color);
      opacity: 0.9;
    }

    tbody td {
      padding: 10px 10px;
      border-bottom: 1px solid var(--divider-color);
      vertical-align: middle;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    tbody tr.row {
      cursor: pointer;
    }

    tbody tr.row:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .col-icon {
      width: 44px;
    }

    ha-state-icon,
    ha-icon {
      display: inline-flex;
    }

    .truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mono {
      font-family: var(--code-font-family, monospace);
      font-size: 12px;
    }

    .empty {
      padding: 14px 10px;
      opacity: 0.75;
    }

    /* ===== Index list ===== */
    .index-list {
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      overflow: hidden;
    }

    .index-row {
      width: 100%;
      appearance: none;
      border: none;
      background: transparent;
      color: var(--primary-text-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--divider-color);
      font-size: 13px;
      cursor: pointer;
      text-align: left;
    }

    .index-row:last-child {
      border-bottom: none;
    }

    .index-row:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .index-domain {
      text-align: left;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
      flex: 1 1 auto;
    }

    .index-count {
      text-align: right;
      opacity: 0.8;
      font-variant-numeric: tabular-nums;
      flex: 0 0 auto;
      min-width: 40px;
    }

    /* ===== Help ===== */
    .help {
      padding: 0;
      margin-top: 10px;
    }

    .help-title {
      font-weight: 800;
      margin-bottom: 8px;
    }

    .help-text {
      opacity: 0.9;
      margin: 8px 0;
      font-size: 13px;
      line-height: 1.35;
    }

    .codeblock {
      margin-top: 6px;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid var(--divider-color);
      background: var(--secondary-background-color);
      overflow: auto;
    }
  `;
}

customElements.define("ha-domain-query-table-card", HaDomainQueryTableCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-domain-query-table-card",
  name: "Domain Query Table Card",
  description: "Uses ?domain= in the URL to show a sortable entity table, or an index of domains.",
});
