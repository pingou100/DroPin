// DroPin Configuration
// Copy this file to config.js and fill in your API keys

const CONFIG = {
    // Google Places API (New) - Get from: https://console.cloud.google.com/
    // Enable: Places API (New)
    GOOGLE_PLACES_API_KEY: 'YOUR_GOOGLE_PLACES_API_KEY_HERE',
    
    // Geoapify API - Get from: https://www.geoapify.com/
    // Free tier: 3,000 requests/day
    GEOAPIFY_API_KEY: 'YOUR_GEOAPIFY_API_KEY_HERE',
    
    // Optional: Supabase (for cloud mode - future feature)
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    
    // Storage mode: 'csv' (default), 'pwa', or 'cloud'
    STORAGE_MODE: 'csv'
};
