# DroPin

> **Self-hosted travel check-in tracker with triple redundancy. Beautiful, privacy-first, works on any device. No backend needed.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Netlify](https://img.shields.io/badge/deploy-netlify-00C7B7)](https://www.netlify.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

When Foursquare shut down their Swarm API, millions of check-ins became trapped in a closed ecosystem. DroPin is the open-source alternative: a beautifully designed, privacy-focused check-in tracker you own and control.

Deploy in 5 minutes to Netlify (free), choose between simple CSV mode or bulletproof PWA mode with Google Drive backup. No backend, no database, no tracking—just your travel memories, beautifully visualized and safely stored.

---

## ✨ Features

### Core Features
- 🗺️ **Interactive Global Map** - Visualize all check-ins with clustering and smooth animations
- ⚡ **Quick Check-in** - Location-based check-in finds nearby venues instantly  
- 📍 **Manual Entry** - Drag-to-position pin placement with auto-geocoding
- 🔍 **Smart Search & Filters** - Find venues by name, filter by country/type/year
- 🎨 **Minimalist Design** - Clean, Apple-inspired interface
- 📱 **Mobile-First** - Perfect experience on iOS and Android

### Storage Modes
- 📁 **CSV Mode** - Simple, static files (great for getting started)
- 🛡️ **PWA Mode** - Triple redundancy: IndexedDB + localStorage + Google Drive
- ☁️ **Auto-Backup** - Google Drive uploads every 5 check-ins
- 💾 **Offline-First** - Works without internet (PWA mode)
- 🔄 **Auto-Recovery** - Restores data if browser cache cleared

### Privacy & Control
- 🔒 **Privacy-Focused** - Your data stays yours
- 🚀 **Zero Backend** - Just HTML/CSS/JS—deploy anywhere
- 💰 **Free Hosting** - Works on Netlify free tier
- 🔐 **No Tracking** - Zero analytics, no cookies

---

## 🚀 Quick Start

### Option 1: Simple CSV Mode (5 minutes)

Perfect for getting started quickly:

```bash
# Clone and configure
git clone https://github.com/pingou100/DroPin.git
cd DroPin
cp src/config.example.js src/config.js
# Edit config.js with your API keys

# Deploy to Netlify
# Drag src/ folder to https://app.netlify.com/drop
```

### Option 2: PWA Mode with Triple Redundancy (10 minutes)

For bulletproof data safety with Google Drive backup:

1. **Follow CSV setup above**, then:
2. **Create Google OAuth Client** at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Type: Web application
   - Authorized JavaScript origins: `https://your-domain.com`
   - Authorized redirect URIs: `https://your-domain.com/oauth2callback`
3. **Enable PWA mode in config.js:**
   ```javascript
   window.CONFIG = {
       STORAGE_MODE: 'pwa',  // Enable triple redundancy
       GOOGLE_DRIVE_CLIENT_ID: 'your_client_id.apps.googleusercontent.com',
       AUTO_BACKUP_INTERVAL: 5,  // Backup every 5 check-ins
       // ... other config
   };
   ```
4. **Deploy and connect Google Drive** when prompted on first check-in

---

## 🛡️ PWA Triple Redundancy System

**NEW!** PWA mode protects your data with three independent backup layers:

### Architecture

```
Every check-in is saved to:
┌─────────────────────────────────────┐
│  Layer 1: IndexedDB                 │  ← Primary (50MB+, offline)
│  ✓ Fast, instant access             │
│  ⚠️ Risk: Cleared with browser data │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  Layer 2: localStorage              │  ← Backup (last 200 check-ins)
│  ✓ Survives most cache clears       │
│  ⚠️ Risk: Cleared with browser data │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  Layer 3: Google Drive              │  ← Permanent (unlimited)
│  ✓ Auto-upload every 5 check-ins    │
│  ✓ Survives device loss              │
│  ✓ YOU control your data             │
└─────────────────────────────────────┘
```

### How It Works

```
User adds check-in
    ↓
✅ Saved to IndexedDB (Layer 1)
    ↓
✅ Backed up to localStorage (Layer 2)
    ↓
Counter increments (1, 2, 3, 4, 5...)
    ↓
Every 5th check-in:
✅ Generate CSV from all check-ins
✅ Upload to Google Drive (Layer 3)
✅ Toast: "☁️ Backed up to Google Drive"
```

### Data Safety Comparison

| Scenario | CSV Mode | PWA Mode |
|----------|----------|----------|
| Clear browser cache | ❌ Data lost | ✅ Auto-restored from localStorage |
| Clear all site data | ❌ Everything gone | ✅ Download CSV from Google Drive |
| Switch devices | ⚠️ Manual export/import | ✅ Sync via Google Drive |
| Device lost/stolen | ❌ Data gone forever | ✅ Safe in Google Drive |
| Accidental deletion | ❌ No recovery | ✅ Multiple backups available |

### Google Drive Setup

1. **Enable Google Drive API** in [Google Cloud Console](https://console.cloud.google.com/apis/library/drive.googleapis.com)
2. **Create OAuth 2.0 Client ID:**
   - Application type: Web application
   - Authorized JavaScript origins: Your domain
   - Authorized redirect URIs: `https://yourdomain.com/oauth2callback`
3. **Add test users** (if app in testing mode): Your Google account email
4. **Copy Client ID** to `config.js`

On first check-in, you'll see a prompt to connect Google Drive. After connecting, backups happen automatically every 5 check-ins!

**Check your backups:** [Google Drive → DroPin Backups](https://drive.google.com)

---

## 📖 Storage Modes Explained

### CSV Mode (Default)
**Best for:** Simple deployments, getting started

✅ Pure static files - CSV is your database  
✅ Zero dependencies  
✅ Perfect for Netlify drag-and-drop  
✅ Instant map updates  

⚠️ Manual export workflow  
⚠️ No offline capability  
⚠️ Data lost if cache cleared  

**Use CSV mode if:** You want the simplest setup and don't mind manually exporting check-ins.

### PWA Mode
**Best for:** Power users, mobile-first, data safety

✅ Triple redundancy (3 backup layers!)  
✅ Offline-first with IndexedDB  
✅ Auto-backup to Google Drive  
✅ Auto-recovery if cache cleared  
✅ Works without internet  

⚠️ Requires Google OAuth setup  
⚠️ Slightly more complex config  

**Use PWA mode if:** You want bulletproof data safety and don't want to worry about losing check-ins.

### Comparison Table

| Feature | CSV Mode | PWA Mode |
|---------|----------|----------|
| **Setup time** | 5 min | 10 min |
| **Data safety** | ⚠️ Manual | ✅ Triple redundancy |
| **Offline mode** | ❌ | ✅ |
| **Auto-backup** | ❌ | ✅ Google Drive |
| **Cache clear survival** | ❌ | ✅ Auto-recovery |
| **Multi-device** | ⚠️ Manual CSV | ⚠️ Via Google Drive |
| **Best for** | Simple setups | Data safety |

---

## 🛠️ Technology Stack

- **Frontend:** Vanilla JavaScript (ES6 modules)
- **Maps:** [Leaflet.js](https://leafletjs.com/) with clustering
- **Storage:** CSV files OR IndexedDB + Google Drive (PWA mode)
- **OAuth:** Google Identity Services (modern OAuth2)
- **Geocoding:** [Geoapify](https://www.geoapify.com/) (3,000 free/day)
- **Places:** [Google Places API](https://developers.google.com/maps/documentation/places)
- **Hosting:** Netlify, Vercel, GitHub Pages, any static host

---

## 🎯 Why DroPin?

### The Problem
- **Foursquare/Swarm shut down their API** - millions of check-ins trapped
- **Google owns your location data** - no export, no control
- **Existing solutions are complex** - databases, servers, technical setup
- **Data loss anxiety** - one cache clear and everything's gone

### The Solution
✅ **Simplest possible architecture** - HTML + CSV OR bulletproof PWA  
✅ **No backend required** - deploys anywhere  
✅ **Your data, your control** - CSV files OR your Google Drive  
✅ **Beautiful design** - Apple-inspired UI  
✅ **Data safety options** - Choose your comfort level  
✅ **Free to host** - Netlify/Vercel free tiers  

---

## 💡 Use Cases

- **Former Swarm users** - Export Foursquare data and self-host
- **Privacy-conscious travelers** - Keep location data under your control
- **Digital nomads** - Track your journey across countries
- **Travel bloggers** - Visualize adventures on your own domain
- **Mobile-first users** - PWA mode works offline on phones
- **Data hoarders** - Triple backup means never losing a check-in

---

## 🔐 Privacy & Security

### Data Storage
- **CSV mode:** Files on your static host (Netlify/Vercel)
- **PWA mode:** Your browser + your Google Drive
- **No third-party servers:** Zero external tracking or analytics
- **No cookies:** Not even for analytics
- **Your API keys:** Stay in your config.js (never committed)

### Google Drive Permissions
- **Minimal scope:** Only `drive.file` (files created by this app)
- **Cannot access:** Your other Google Drive files
- **You control:** Delete backups anytime from your Drive
- **Modern OAuth:** Google Identity Services (not deprecated gapi)

### Best Practices
⚠️ Never commit `config.js` with real keys to public repos  
✅ Use domain restrictions for API keys in Google Cloud Console  
✅ Keep private instances in private GitHub repos  
✅ Review Google Cloud OAuth consent screen settings  

---

## 🗺️ Roadmap

**Completed ✅**
- [x] CSV-based storage with instant updates
- [x] Export All / Export New functionality
- [x] Event-driven architecture
- [x] Mobile map auto-refresh
- [x] PWA Triple Redundancy System
- [x] Google Drive auto-backup
- [x] Auto-recovery from localStorage

**Coming Soon 🚀**
- [ ] Settings panel (view backup status, manual backup)
- [ ] Import old CSV into PWA storage
- [ ] Dark mode toggle
- [ ] Service Worker for full PWA installability
- [ ] Travel statistics dashboard
- [ ] Import from Foursquare/Swarm exports
- [ ] Photo attachments
- [ ] Real-time multi-device sync (Firebase/Supabase)

---

## 📱 Browser Compatibility

### CSV Mode
✅ iOS Safari 14+  
✅ Chrome 90+  
✅ Firefox 88+  
✅ Edge 90+  
✅ Mobile browsers  

### PWA Mode (additional requirements)
✅ IndexedDB support (all modern browsers)  
✅ HTTPS required for Google OAuth  
✅ Third-party cookies enabled for Google sign-in  

---

## 🤝 Contributing

Contributions are welcome! Whether you:
- 🐛 Found a bug
- 💡 Have a feature idea
- 📖 Want to improve documentation
- 🎨 Can enhance the design

**Please:**
1. Fork the repository
2. Create feature branch (`git checkout -b feature/Amazing`)
3. Commit changes (`git commit -m 'Add Amazing'`)
4. Push to branch (`git push origin feature/Amazing`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- Inspired by Foursquare/Swarm's check-in experience
- Built with [Leaflet](https://leafletjs.com/) and [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster)
- Map tiles by [CARTO](https://carto.com/) and [OpenStreetMap](https://www.openstreetmap.org/)
- Geocoding by [Geoapify](https://www.geoapify.com/)
- Places data from [Google Places API](https://developers.google.com/maps/documentation/places)
- OAuth via [Google Identity Services](https://developers.google.com/identity/gsi/web)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 💬 Support & Community

- 🐛 **Bug reports:** [GitHub Issues](https://github.com/pingou100/DroPin/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/pingou100/DroPin/discussions)
- ⭐ **Star the repo** if you find it useful!

---

## 🌍 Built for Travelers, by Travelers

DroPin was created because travel memories should belong to you, not be locked in a corporate database. Whether you've checked in to 10 places or 10,000, your data deserves a beautiful home that you control.

Choose CSV mode for simplicity. Choose PWA mode for peace of mind. Either way, your memories are yours forever.

**Start tracking your travels today.** Deploy in 5-10 minutes, own your data forever.

---

<div align="center">

**[Get Started](#-quick-start)** • **[PWA Setup](#️-pwa-triple-redundancy-system)** • **[Report Bug](https://github.com/pingou100/DroPin/issues)**

Made with ❤️ for travelers and explorers worldwide

</div>
