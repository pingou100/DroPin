/**
 * CSV Storage Backend (Legacy Mode)
 * 
 * Maintains current DroPin behavior:
 * - Checkins stored in localStorage until manual export
 * - CSV file loaded on page load
 * - No automatic sync
 * 
 * This is the "simplest" mode for beginners.
 */

class CSVStorage {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.checkins = [];
        this.loaded = false;
    }
    
    /**
     * Save a new checkin to localStorage
     * @param {Object} checkin - Checkin data
     * @returns {Promise<Object>} Saved checkin
     */
    async save(checkin) {
        // Generate ID if not present
        if (!checkin.checkin_id) {
            checkin.checkin_id = `checkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Add timestamp
        if (!checkin.date) {
            const now = new Date();
            checkin.date = now.toISOString().split('T')[0];
            checkin.time = now.toTimeString().split(' ')[0];
            checkin.year = now.getFullYear().toString();
            checkin.month = (now.getMonth() + 1).toString();
        }
        
        // Get existing new checkins from localStorage
        const newCheckins = JSON.parse(localStorage.getItem('newCheckins') || '[]');
        newCheckins.push(checkin);
        localStorage.setItem('newCheckins', JSON.stringify(newCheckins));
        
        console.log('[CSVStorage] Saved new checkin to localStorage:', checkin.venue_name);
        
        // 🔥 FIX: Emit the event so map updates instantly!
        this.eventBus.emit('checkin:added', checkin);
        console.log('[CSVStorage] Emitted checkin:added event');
        
        return checkin;
    }
    
    /**
     * Query checkins with filters
     * @param {Object} filters - {country, type, year, search}
     * @returns {Promise<Array>} Filtered checkins
     */
    async query(filters = {}) {
        if (!this.loaded) {
            await this.loadFromCSV();
        }
        
        let results = [...this.checkins];
        
        // Apply filters
        if (filters.country && filters.country !== 'all') {
            results = results.filter(c => c.country === filters.country);
        }
        
        if (filters.type && filters.type !== 'all') {
            results = results.filter(c => c.venue_type === filters.type);
        }
        
        if (filters.year && filters.year !== 'all') {
            results = results.filter(c => c.year === filters.year.toString());
        }
        
        if (filters.search) {
            const query = filters.search.toLowerCase();
            results = results.filter(c => {
                const venueName = (c.venue_name || '').toLowerCase();
                const city = (c.city || '').toLowerCase();
                return venueName.includes(query) || city.includes(query);
            });
        }
        
        return results;
    }
    
    /**
     * Get all checkins (merged from CSV + new)
     * @returns {Promise<Array>} All checkins
     */
    async getAll() {
        if (!this.loaded) {
            await this.loadFromCSV();
        }
        
        // Merge CSV checkins with new ones from localStorage
        const newCheckins = JSON.parse(localStorage.getItem('newCheckins') || '[]');
        return [...this.checkins, ...newCheckins];
    }
    
    /**
     * Get new checkins only (not yet exported)
     * @returns {Promise<Array>} New checkins
     */
    async getNew() {
        return JSON.parse(localStorage.getItem('newCheckins') || '[]');
    }
    
    /**
     * Import bulk checkins (from CSV)
     * @param {Array} checkins - Array of checkin objects
     * @returns {Promise<void>}
     */
    async importBulk(checkins) {
        this.checkins = checkins;
        this.loaded = true;
        console.log(`[CSVStorage] Imported ${checkins.length} checkins`);
    }
    
    /**
     * Load checkins from CSV file
     * @returns {Promise<void>}
     */
    async loadFromCSV() {
        try {
            const response = await fetch('checkins_with_addresses.csv');
            const csvText = await response.text();
            
            // Parse CSV (using the same logic from index.html)
            const lines = csvText.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const data = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = [];
                let current = '';
                let inQuotes = false;
                
                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        values.push(current.trim().replace(/^"|"$/g, ''));
                        current = '';
                    } else {
                        current += char;
                    }
                }
                values.push(current.trim().replace(/^"|"$/g, ''));
                
                if (values.length === headers.length) {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = values[index];
                    });
                    data.push(obj);
                }
            }
            
            this.checkins = data;
            this.loaded = true;
            
            console.log(`[CSVStorage] Loaded ${data.length} checkins from CSV`);
            
        } catch (error) {
            console.error('[CSVStorage] Failed to load CSV:', error);
            this.checkins = [];
            this.loaded = true;
        }
    }
    
    /**
     * Clear new checkins (after export)
     * @returns {Promise<void>}
     */
    async clearNew() {
        localStorage.removeItem('newCheckins');
        console.log('[CSVStorage] Cleared new checkins from localStorage');
    }
}

export default CSVStorage;
