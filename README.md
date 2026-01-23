# HA Domain Query Table Card

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A Home Assistant Lovelace custom card that uses `?domain=` in the dashboard URL to display:

- A **sortable, resizable entity table** for a domain
- Or a **domain index** with entity counts

---

## Screenshots

### Add card to dashboard
![Add card](images/add-to-dashboard.png)

### Config – Index mode
![Index mode](images/config-index-mode.png)

### Config – Table mode
![Table mode](images/config-table-mode.png)

---

## Installation

### HACS (Recommended)
1. Open **HACS → Frontend**
2. Click **⋮ → Custom repositories**
3. Add this repository:
   - **Repository**: *(this GitHub repo URL)*
   - **Category**: `Lovelace`
4. Download **HA Domain Query Table Card**
5. Restart Home Assistant (or reload resources if prompted)

#### Add the Resource (Required)
Go to **Settings → Dashboards → Resources** and add:

- **URL**:  
  ```
  /hacsfiles/ha-domain-query-table-card/ha-domain-query-table-card.js
  ```
- **Type**: `JavaScript Module`

---

### Manual Installation
1. Copy these files into your Home Assistant config:
   - `ha-domain-query-table-card.js`
   - `ha-domain-query-table-card-editor.js`

   Recommended location:
   ```
   /config/www/ha-domain-query-table-card/
   ```

2. Add the Lovelace resource:

   - **URL**:
     ```
     /local/ha-domain-query-table-card/ha-domain-query-table-card.js
     ```
   - **Type**: `JavaScript Module`

3. Refresh your browser.

---

## Usage

### Table Mode
```yaml
type: custom:ha-domain-query-table-card
mode: table
```

Open your dashboard with:
```
?domain=switch
```

### Index Mode
```yaml
type: custom:ha-domain-query-table-card
mode: index
```

Clicking a domain updates the URL query string.

---

## Features
- URL-driven (`?domain=`)
- Sortable columns
- Drag-to-resize columns
- Hide `unknown` / `unavailable` states
- Click entity rows for **more-info**
- UI editor support

---

## License
MIT — see [LICENSE](LICENSE)
