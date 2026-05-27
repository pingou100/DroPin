# DroPin

> **Self-hosted travel check-in tracker. Beautiful, privacy-first, works on any device. No backend needed.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Netlify](https://img.shields.io/badge/deploy-netlify-00C7B7)](https://www.netlify.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

When Foursquare shut down their Swarm API, millions of check-ins became trapped in a closed ecosystem. DroPin is the open-source alternative: a beautifully designed, privacy-focused check-in tracker you own and control.

Deploy in 5 minutes to Netlify (free). No backend, no database, no tracking — just your travel memories, beautifully visualized and safely synced across devices.

---

## ✨ Features

### Core
- 🗺️ **Interactive Global Map** — Visualize all check-ins with clustering and smooth animations
- ⚡ **Quick Check-in** — Location-based check-in finds nearby venues instantly via Google Places API
- 📍 **Manual Entry** — Drag-to-position pin placement with auto-geocoding
- 🔍 **Smart Search** — Search pins by name/city, or fly to any city worldwide via Nominatim geocoding
- 🎨 **Minimalist Design** — Clean, Apple-inspired interface
- 📱 **Mobile-First** — Fully tested on iOS Safari and Android Chrome

### Storage & Sync
- 🛡️ **PWA Mode** — Triple redundancy: IndexedDB + localStorage + Google Drive auto-backup
- ☁️ **Cross-device Sync** — Push/Pull your master CSV via Google Drive, merge without data loss
- 📁 **CSV Mode** — Simple static file mode, great for getting started
- 💾 **Offline-First** — Works without internet in PWA mode
- 🔄 **Auto-Recovery** — Restores data from localStorage if IndexedDB is wiped

### Stats & Sharing
- 📊 **Travel Statistics** — Choropleth world map, top countries chart, city rankings, distance insights
- 👀 **Read-only Sharing** — Share `view.html` with family/friends for a public map (no editing)
- 📤 **Export/Import** — Full CSV export, import from any CSV source including Foursquare exports

### Privacy & Control
- 🔒 **Your data, your storage** — Everything stays in your browser + your Google Drive
- 🚀 **Zero Backend** — Pure HTML/CSS/JS, deploy on any static host
- 💰 **Free Hosting** — Netlify free tier is more than enough
- 🔐 **No Tracking** — Zero analytics, no cookies, no third-party data collection

---

## 🚀 Quick Start

### Option 1: CSV Mode (5 minutes)

The simplest setup — reads check-ins from a static CSV file:

```bash
git clone https://github.com/pingou100/DroPin.git
cd DroPin/src
cp config.example.js config.js
# Edit config.js: set STORAGE_MODE to 'csv' and add your API keys
```

Then drag the `src/` folder to [Netlify Drop](https://app.netlify.com/drop).

### Option 2: PWA Mode with Sync (10 minutes)

Full check-in app with Google Drive sync across all your devices:

1. Clone and configure as above, but set `STORAGE_MODE: 'pwa'` in config.js
2. Create a **Google OAuth 2.0 Client ID** at [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Application type: **Web application**
   - Authorized JavaScript origins: `https://your-netlify-domain.netlify.app`
   - Authorized redirect URIs: (none needed — we use implicit flow)
3. Enable the **Google Drive API** in your project
4. Add your `GOOGLE_DRIVE_CLIENT_ID` to config.js
5. Deploy to Netlify

**Important:** The sync feature requires the `https://www.googleapis.com/auth/drive` scope so that files pushed from one device can be read by another. The old `drive.file` scope will not work for cross-device sync.

---

## 📱 Pages

| Page | URL | Description |
|---|---|---|
| Map | `index.html` | Main map with filters, search, clustering |
| Check In | `checkin-now.html` | GPS-based venue search and quick check-in |
| Add | `add-checkin.html` | Manual check-in with draggable pin |
| Stats | `stats.html` | Travel statistics dashboard |
| Import/Export | `import-export.html` | CSV import and export |
| Sync | `sync.html` | Google Drive Push/Pull sync |
| View | `view.html` | Read-only shareable map (no auth required) |

---

## ☁️ Cross-Device Sync

The sync page (`sync.html`) keeps all your devices in sync via a single master CSV on Google Drive:

```
Device A (mobile)          Google Drive               Device B (laptop)
     │                          │                           │
     ├── Push ──────────────► DroPin-Master.csv             │
     │                          │                           │
     │                          │ ◄────────────── Pull ─────┤
     │                          │                           │
     │              Preview diff (new check-ins only)       │
     │                          │                           │
     │                          │ ──── Merge ──────────────►│
```

- **Push** — uploads your local check-ins as the new master file (`DroPin-Master.csv` in the "DroPin Backups" folder)
- **Pull & Merge** — downloads the master, shows you a diff preview, and merges only new check-ins (nothing deleted)
- **Conflict-free** — deduplication is by `checkin_id`, so merging is always safe

**First time setup:** On each device, go to Sync → Connect → sign in with the same Google account.

---

## 🛡️ PWA Triple Redundancy

In PWA mode, every check-in is saved to three independent layers:

```
Every check-in →
  ✅ Layer 1: IndexedDB     (primary, 50MB+, offline)
  ✅ Layer 2: localStorage  (backup, last 200 check-ins)
  ✅ Layer 3: Google Drive  (permanent, auto-upload every 5 check-ins)
```

If your browser cache is cleared, the app detects the empty IndexedDB and offers to restore from the localStorage backup. For a full restore, use Sync → Pull.

---

## 📊 Travel Statistics

`stats.html` shows:
- **World choropleth map** — countries colored by visit intensity, click to zoom in
- **Top 10 Countries** — horizontal bar chart
- **Top 20 Cities** — click any city to fly the map there
- **Distance insights** — furthest from home, average journey, longest single-day trip

> The "home" location is hardcoded to Brussels in `js/stats/GeoStatsCalculator.js`. Change `homeLocation` to your city coordinates.

---

## 👀 Read-only Sharing (`view.html`)

Share your travels without exposing your check-in interface. `view.html`:
- Reads directly from `checkins_with_addresses.csv`
- No navigation menu, no editing, no authentication
- Full search (pins + worldwide geocoding) and filters
- Shows "👀 View only" banner

Share the direct URL: `https://your-domain.netlify.app/src/view.html`

---

## 🗺️ CSV Format

```csv
checkin_id,venue_name,venue_type,date,time,year,month,
latitude,longitude,street_address,city,state,
postal_code,country,country_code,full_address,
foursquare_url,venue_id,notes,is_private
```

Download a template from the Import/Export page, or use the Foursquare/Swarm CSV export directly (column mapping may need adjustment).

---

## 🛠️ Technology Stack

- **Frontend:** Vanilla JavaScript (ES6 modules), no framework
- **Maps:** [Leaflet.js](https://leafletjs.com/) with MarkerCluster
- **Stats map:** Leaflet + Natural Earth GeoJSON (via GitHub CDN)
- **Charts:** [Chart.js](https://www.chartjs.org/)
- **Storage:** CSV files OR IndexedDB + localStorage (PWA mode)
- **Sync:** Google Drive API v3 (direct REST, no SDK)
- **OAuth:** Google Identity Services (GIS) — implicit token flow
- **Geocoding:** [Geoapify](https://www.geoapify.com/) (addresses) + Nominatim (map search)
- **Places:** Google Places API v1 (New)
- **Hosting:** Netlify, Vercel, GitHub Pages, or any static host

---

## 🔐 Privacy & Security

- **No third-party servers** — API calls go directly to Google/Geoapify from your browser
- **No analytics** — zero tracking, no cookies set by DroPin itself
- **Google Drive scope** — uses `drive` scope (required for cross-device file discovery). Files are stored in a dedicated "DroPin Backups" subfolder
- **Your keys stay local** — `config.js` is in `.gitignore` and never committed

### Best Practices
⚠️ Never commit `config.js` with real API keys to a public repo  
✅ Restrict API keys by domain in Google Cloud Console  
✅ Keep your instance in a private GitHub repo  
✅ Add test users in Google OAuth consent screen if app is in "Testing" mode  

---

## 🗺️ Roadmap

**Completed ✅**
- [x] Interactive map with clustering, filters, year slider
- [x] GPS-based quick check-in via Google Places API v1
- [x] Manual check-in with draggable pin + auto-geocoding
- [x] Smart search: pin search + worldwide Nominatim geocoding
- [x] PWA triple redundancy (IndexedDB + localStorage + Google Drive auto-backup)
- [x] Cross-device sync via Google Drive Push/Pull with merge preview
- [x] Travel statistics dashboard (world map, charts, city rankings, distance stats)
- [x] Read-only shareable map (`view.html`)
- [x] CSV import/export with iOS paste support
- [x] iOS click/touch fixes

**Coming Soon 🚀**
- [ ] Dark mode
- [ ] Service Worker for full PWA installability (home screen icon, offline caching)
- [ ] Photo attachments
- [ ] Import from Foursquare/Swarm CSV export (column auto-mapping)
- [ ] Settings panel (backup status, manual backup trigger)

---

## 📱 Browser Compatibility

✅ iOS Safari 14+  
✅ Chrome 90+  
✅ Firefox 88+  
✅ Edge 90+  
✅ Mobile browsers (tested on iPhone and Android)  

Requires HTTPS for Google OAuth and geolocation. Netlify/Vercel provide this automatically.

---

## 🤝 Contributing

Contributions welcome! Whether you found a bug, have a feature idea, or want to improve the docs:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- Inspired by Foursquare/Swarm's check-in experience
- Maps by [Leaflet](https://leafletjs.com/) + [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster)
- Map tiles by [CARTO](https://carto.com/) / [OpenStreetMap](https://www.openstreetmap.org/)
- World borders GeoJSON by [Natural Earth](https://www.naturalearthdata.com/) via [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector)
- Geocoding by [Geoapify](https://www.geoapify.com/) and [Nominatim](https://nominatim.org/)
- Places data by [Google Places API](https://developers.google.com/maps/documentation/places)
- Auth via [Google Identity Services](https://developers.google.com/identity/gsi/web)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 💬 Support

- 🐛 **Bug reports:** [GitHub Issues](https://github.com/pingou100/DroPin/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/pingou100/DroPin/discussions)
- ⭐ **Star the repo** if you find it useful!

---

<div align="center">

**[Get Started](#-quick-start)** • **[Sync Setup](#️-cross-device-sync)** • **[Report Bug](https://github.com/pingou100/DroPin/issues)**

Made with ❤️ for travelers and explorers worldwide

</div>
