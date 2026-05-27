/**
 * DroPin Configuration Template
 * 
 * Copy this file to config.js and fill in your API keys
 * DO NOT commit config.js with real keys to public repositories!
 */

window.CONFIG = {
    // Geoapify API Key (for reverse geocoding — converts GPS coords to addresses)
    // Get yours free at: https://www.geoapify.com/  (3,000 requests/day free)
    GEOAPIFY_API_KEY: 'YOUR_GEOAPIFY_API_KEY',
    
    // Google Maps API Key (for Places API — venue search near you)
    // Get yours at: https://console.cloud.google.com/
    // Enable: Maps JavaScript API + Places API (New)
    GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY',
    
    // Google Drive OAuth Client ID (required for PWA mode sync)
    // Get yours at: https://console.cloud.google.com/apis/credentials
    // Application type: Web application
    // Authorized JavaScript origins: https://your-netlify-domain.netlify.app
    // Scope required: https://www.googleapis.com/auth/drive
    GOOGLE_DRIVE_CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    
    // Storage Mode: 'csv' or 'pwa'
    // - 'csv': Reads from static checkins_with_addresses.csv (simple, no auth needed)
    // - 'pwa': Full PWA with IndexedDB + Google Drive sync across devices
    STORAGE_MODE: 'pwa',
    
    // Auto-backup settings (PWA mode only)
    AUTO_BACKUP_INTERVAL: 5,            // Trigger auto-backup every N check-ins
    BACKUP_FOLDER_NAME: 'DroPin Backups' // Google Drive folder name for sync files
};

// Default map center (used when geolocation is unavailable)
// Change this to your home city coordinates
window.DEFAULT_LOCATION = {
    lat: 50.8503,  // Brussels, Belgium — change to your city
    lng: 4.3517
};
