/**
 * WorldMapViz - Leaflet choropleth map for country statistics
 */

export class WorldMapViz {
    constructor(mapId) {
        this.mapId = mapId;
        this.map = null;
        this.geoJsonLayer = null;
        
        // Country name normalization for GeoJSON matching
        this.aliasToCanonical = new Map();
        const aliases = {
            'United States of America': ['USA', 'United States', 'US', 'U.S.', 'U.S.A.'],
            'United Kingdom': ['UK', 'United Kingdom', 'Britain', 'Great Britain', 'England', 'Scotland', 'Wales'],
            'France': ['France'], 'Germany': ['Germany', 'Deutschland'],
            'Spain': ['Spain', 'España'], 'Italy': ['Italy', 'Italia'],
            'Netherlands': ['Netherlands', 'Holland'], 'Belgium': ['Belgium', 'Belgique', 'België'],
            'Switzerland': ['Switzerland', 'Suisse', 'Schweiz'], 'Czechia': ['Czech Republic', 'Czechia'],
            'South Korea': ['South Korea', 'Korea', 'Republic of Korea'],
            'China': ['China', "People's Republic of China"],
            'Turkey': ['Turkey', 'Türkiye'], 'Australia': ['Australia'],
            'New Zealand': ['New Zealand', 'Aotearoa']
        };
        for (const canonical in aliases) {
            this.aliasToCanonical.set(canonical.toLowerCase(), canonical);
            aliases[canonical].forEach(a => this.aliasToCanonical.set(a.toLowerCase(), canonical));
        }
    }
    
    async initialize() {
        this.map = L.map(this.mapId, { center: [50.0, 10.0], zoom: 4, zoomControl: true, preferCanvas: true });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO', maxZoom: 19
        }).addTo(this.map);
    }
    
    normalizeToGeoJSON(name) {
        if (!name) return null;
        return this.aliasToCanonical.get(name.toLowerCase()) || name;
    }
    
    async render(countryStats, onCountryClick) {
        const response = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson');
        const geojson = await response.json();
        
        const statsMap = new Map();
        countryStats.forEach(c => statsMap.set(this.normalizeToGeoJSON(c.name).toLowerCase(), c));
        const maxCount = Math.max(...countryStats.map(c => c.count));
        
        if (this.geoJsonLayer) this.map.removeLayer(this.geoJsonLayer);
        
        this.geoJsonLayer = L.geoJSON(geojson, {
            style: (feature) => {
                const name = (feature.properties.NAME || feature.properties.ADMIN || '');
                const stats = statsMap.get(name.toLowerCase());
                if (!stats) return { fillColor: '#f5f5f7', fillOpacity: 0.3, color: '#e5e5e7', weight: 0.5 };
                return { fillColor: this.getColor(stats.count / maxCount), fillOpacity: 0.7, color: '#007aff', weight: 1.5 };
            },
            onEachFeature: (feature, layer) => {
                const name = (feature.properties.NAME || feature.properties.ADMIN || '');
                const stats = statsMap.get(name.toLowerCase());
                if (!stats) return;
                layer.bindPopup(`<div style="font-size:14px"><b>${stats.name}</b><br><span style="color:#86868b;font-size:13px">${stats.count} check-ins · ${stats.cities} cities</span></div>`);
                layer.on('mouseover', function() { this.setStyle({ weight: 3, color: '#0051d5' }); });
                layer.on('mouseout', function() { this.setStyle({ weight: 1.5, color: '#007aff' }); });
                layer.on('click', () => onCountryClick && onCountryClick(stats));
            }
        }).addTo(this.map);
    }
    
    getColor(intensity) {
        const colors = ['#E3F2FD', '#90CAF9', '#42A5F5', '#1E88E5', '#1565C0'];
        return colors[Math.min(Math.floor(intensity * 5), 4)];
    }
    
    zoomToCountry(countryName) {
        if (!this.geoJsonLayer) return;
        const normalized = this.normalizeToGeoJSON(countryName);
        this.geoJsonLayer.eachLayer(layer => {
            const name = layer.feature.properties.NAME || layer.feature.properties.ADMIN || '';
            if (name.toLowerCase() === normalized.toLowerCase()) {
                this.map.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 6 });
            }
        });
    }
    
    resetZoom() { this.map.setView([50.0, 10.0], 4); }
    centerOn(lat, lng, zoom = 10) { this.map.setView([lat, lng], zoom); }
}
