/**
 * DroPin Configuration Template
 * 
 * Copy this file to config.js and fill in your API keys
 * DO NOT commit config.js with real keys to public repositories!
 */

window.CONFIG = {
    // Geoapify API Key (for geocoding and reverse geocoding)
    // Get yours at: https://www.geoapify.com/
    GEOAPIFY_API_KEY: 'YOUR_GEOAPIFY_API_KEY',
    
    // Google Maps API Key (for Places API)
    // Get yours at: https://console.cloud.google.com/
    GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY',
    
    // Google Drive OAuth Client ID (for PWA mode backup)
    // Get yours at: https://console.cloud.google.com/apis/credentials
    GOOGLE_DRIVE_CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    
    // PWA Auto-Backup Settings
    AUTO_BACKUP_INTERVAL: 5,       // Backup to Google Drive every N check-ins
    BACKUP_FOLDER_NAME: 'DroPin Backups',
    
    // Storage Mode: 'csv', 'pwa', or 'cloud'
    // - 'csv': Static CSV file (default, simplest)
    // - 'pwa': Progressive Web App with triple redundancy
    // - 'cloud': (Future) Firebase/Supabase sync
    STORAGE_MODE: 'csv',
    
    // Cloud Storage (optional - for future use)
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: ''
};

// Default location (used when geolocation unavailable)
window.DEFAULT_LOCATION = {
    lat: 50.8503,  // Brussels
    lng: 4.3517
};
