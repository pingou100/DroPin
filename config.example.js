// DroPin Configuration
// Copy this file to config.js and add your API keys

const CONFIG = {
    // Get your Geoapify API key at: https://www.geoapify.com/
    // Free tier: 3,000 requests/day
    // Used for: Reverse geocoding (converting GPS to addresses)
    GEOAPIFY_API_KEY: 'YOUR_GEOAPIFY_KEY_HERE',
    
    // Get your Google Maps API key at: https://console.cloud.google.com/
    // Enable: Maps JavaScript API + Places API (New)
    // Free tier: $200/month credit (~28,000 map loads)
    // Used for: Map display, venue search, place details
    GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_KEY_HERE'
};

// Optional: Default map center (if location access denied)
// Change to your preferred city coordinates
const DEFAULT_LOCATION = {
    lat: 50.8503,  // Brussels, Belgium
    lng: 4.3517
};
