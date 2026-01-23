/* /local/ha-domain-query-table-card/ha-domain-query-table-card-editor.js
 *
 * UI editor for ha-domain-query-table-card
 * Only option: mode toggle (table <-> index)
 * UI: "MODE: table [toggle] index"
 */

import { LitElement, html, css } from "https://unpkg.com/lit@2.8.0/index.js?module";

const MODE_TABLE = "table";
const MODE_INDEX = "index";

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
            @change=${this._valueChanged}
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
