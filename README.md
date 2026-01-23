# ha-domain-query-table-card

A Home Assistant Lovelace custom card that reads `?domain=<domain>` from the dashboard URL and renders:

- **Table mode**: a sortable, resizable entity table for that domain
- **Index mode**: a one-column domain index with entity counts

## Features
- URL-driven (`?domain=`)
- Sortable columns
- Resizable columns (drag header separators)
- Hide `unknown` / `unavailable` states
- Click an entity row to open **more-info**
- YAML + UI editor support

---

## Installation

### Option A — HACS (Automatic)
1. In Home Assistant, go to **HACS → Frontend**.
2. Click **⋮ → Custom repositories**.
3. Add this repository:
   - **Repository**: *(paste this GitHub repo URL)*
   - **Category**: `Lovelace`
4. Find **ha-domain-query-table-card** in HACS and click **Download**.
5. Restart Home Assistant (or reload resources if prompted).
6. Add the Lovelace resource (**Settings → Dashboards → Resources**):
   - URL: `/hacsfiles/ha-domain-query-table-card/ha-domain-query-table-card.js`
   - Type: `JavaScript Module`

> HACS installs frontend files under `/hacsfiles/`.

### Option B — Manual
1. Copy these files into your HA config:
   - `ha-domain-query-table-card.js`
   - `ha-domain-query-table-card-editor.js`

   Recommended folder:
   ```
   /config/www/ha-domain-query-table-card/
   ```

2. Add the Lovelace resource (**Settings → Dashboards → Resources**):
   - URL: `/local/ha-domain-query-table-card/ha-domain-query-table-card.js`
   - Type: `JavaScript Module`

3. Refresh your browser.

---

## Usage

### Table mode
Add the card:

```yaml
type: custom:ha-domain-query-table-card
mode: table
```

Then open the dashboard with a URL query string like:

```
/lovelace/0?domain=switch
```

The card will show entities matching `switch.*`.

### Index mode
Index mode shows a list of domains and counts. Clicking a domain updates `?domain=` in the URL.

```yaml
type: custom:ha-domain-query-table-card
mode: index
```

---

## License
MIT (see `LICENSE`)
