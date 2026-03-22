/**
 * Storage Adapter - Unified API for all storage modes
 * 
 * Supports three modes:
 * - 'csv': Legacy CSV-only mode (current behavior)
 * - 'pwa': Progressive Web App with IndexedDB and offline support
 * - 'cloud': Supabase cloud sync with multi-user support
 * 
 * All modes support CSV export for data portability.
 */

import CSVStorage from './CSVStorage.js';
import IndexedDBStorage from './IndexedDBStorage.js';
import SupabaseStorage from './SupabaseStorage.js';
import EventBus from '../events/EventBus.js';

class StorageAdapter {
    constructor(mode = null) {
        // Auto-detect mode from localStorage or default to CSV
        this.mode = mode || localStorage.getItem('storage_mode') || 'csv';
        this.eventBus = new EventBus();
        
        // Initialize appropriate backend
        this.backend = this.createBackend(this.mode);
        
        console.log(`[StorageAdapter] Initialized in ${this.mode} mode`);
    }
    
    createBackend(mode) {
        switch(mode) {
            case 'csv':
                return new CSVStorage(this.eventBus);
            case 'pwa':
                return new IndexedDBStorage(this.eventBus);
            case 'cloud':
                return new SupabaseStorage(this.eventBus);
            default:
                console.warn(`Unknown storage mode: ${mode}, defaulting to CSV`);
                return new CSVStorage(this.eventBus);
        }
    }
    
    /**
     * Switch storage mode (with optional data migration)
     * @param {string} newMode - 'csv', 'pwa', or 'cloud'
     * @param {boolean} migrateData - Whether to migrate existing data
     */
    async switchMode(newMode, migrateData = true) {
        if (newMode === this.mode) {
            console.log('[StorageAdapter] Already in ' + newMode + ' mode');
            return;
        }
        
        console.log(`[StorageAdapter] Switching from ${this.mode} to ${newMode}`);
        
        let existingData = null;
        
        // Export data from current backend if migration requested
        if (migrateData) {
            try {
                existingData = await this.backend.getAll();
                console.log(`[StorageAdapter] Exported ${existingData.length} checkins for migration`);
            } catch (error) {
                console.error('[StorageAdapter] Failed to export data for migration:', error);
                throw new Error('Migration failed: Could not export existing data');
            }
        }
        
        // Create new backend
        const newBackend = this.createBackend(newMode);
        
        // Import data to new backend if we have it
        if (existingData && existingData.length > 0) {
            try {
                await newBackend.importBulk(existingData);
                console.log(`[StorageAdapter] Migrated ${existingData.length} checkins to ${newMode} mode`);
            } catch (error) {
                console.error('[StorageAdapter] Failed to import data:', error);
                throw new Error('Migration failed: Could not import to new storage');
            }
        }
        
        // Switch to new backend
        this.backend = newBackend;
        this.mode = newMode;
        
        // Persist mode choice
        localStorage.setItem('storage_mode', newMode);
        
        // Notify listeners that mode changed
        this.eventBus.emit('storage:mode-changed', { newMode, oldMode: this.mode });
        
        console.log(`[StorageAdapter] Successfully switched to ${newMode} mode`);
    }
    
    /**
     * Add a new checkin
     * @param {Object} checkin - Checkin data
     * @returns {Promise<Object>} Saved checkin with ID
     */
    async addCheckin(checkin) {
        const saved = await this.backend.save(checkin);
        
        // Emit event for real-time map update
        this.eventBus.emit('checkin:added', saved);
        
        return saved;
    }
    
    /**
     * Get all checkins (optionally filtered)
     * @param {Object} filters - Optional filters {country, type, year, search}
     * @returns {Promise<Array>} Array of checkins
     */
    async getCheckins(filters = {}) {
        return await this.backend.query(filters);
    }
    
    /**
     * Get a single checkin by ID
     * @param {string} id - Checkin ID
     * @returns {Promise<Object|null>} Checkin or null
     */
    async getCheckin(id) {
        if (this.backend.getById) {
            return await this.backend.getById(id);
        }
        
        // Fallback: query all and find
        const all = await this.backend.query({});
        return all.find(c => c.checkin_id === id) || null;
    }
    
    /**
     * Update an existing checkin
     * @param {string} id - Checkin ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated checkin
     */
    async updateCheckin(id, updates) {
        if (!this.backend.update) {
            throw new Error(`Update not supported in ${this.mode} mode`);
        }
        
        const updated = await this.backend.update(id, updates);
        this.eventBus.emit('checkin:updated', updated);
        return updated;
    }
    
    /**
     * Delete a checkin
     * @param {string} id - Checkin ID
     * @returns {Promise<boolean>} Success
     */
    async deleteCheckin(id) {
        if (!this.backend.delete) {
            throw new Error(`Delete not supported in ${this.mode} mode`);
        }
        
        await this.backend.delete(id);
        this.eventBus.emit('checkin:deleted', { id });
        return true;
    }
    
    /**
     * Export all data to CSV (including new checkins!)
     * @returns {Promise<string>} CSV content
     */
    async exportCSV() {
        // Get ALL checkins (merged CSV + localStorage)
        const allData = await this.backend.getAll();
        return this.generateCSV(allData);
    }
    
    /**
     * Export new checkins only (since last export)
     * @returns {Promise<string|null>} CSV content or null if no new checkins
     */
    async exportNewCSV() {
        let newData = [];
        
        if (this.backend.getNew) {
            newData = await this.backend.getNew();
        } else {
            // Fallback: use localStorage for CSV mode compatibility
            newData = JSON.parse(localStorage.getItem('newCheckins') || '[]');
        }
        
        // Return null if no new checkins (so caller can handle it)
        if (!newData || newData.length === 0) {
            return null;
        }
        
        return this.generateCSV(newData);
    }
    
    /**
     * Import CSV data
     * @param {string|File} csvData - CSV content or File object
     * @returns {Promise<number>} Number of imported checkins
     */
    async importCSV(csvData) {
        // Read file if File object
        if (csvData instanceof File) {
            csvData = await csvData.text();
        }
        
        const checkins = this.parseCSV(csvData);
        await this.backend.importBulk(checkins);
        
        this.eventBus.emit('data:imported', { count: checkins.length });
        return checkins.length;
    }
    
    /**
     * Sync data (cloud mode only)
     * @returns {Promise<void>}
     */
    async sync() {
        if (this.backend.sync) {
            await this.backend.sync();
        }
    }
    
    /**
     * Subscribe to storage events
     * @param {string} event - Event name (checkin:added, checkin:updated, etc.)
     * @param {Function} callback - Event handler
     */
    on(event, callback) {
        this.eventBus.on(event, callback);
    }
    
    /**
     * Unsubscribe from storage events
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    off(event, callback) {
        this.eventBus.off(event, callback);
    }
    
    /**
     * Get storage statistics
     * @returns {Promise<Object>} Stats {total, new, lastSync, mode}
     */
    async getStats() {
        const all = await this.backend.getAll();
        const newCheckins = this.backend.getNew ? await this.backend.getNew() : [];
        
        return {
            total: all.length,
            new: newCheckins.length,
            lastSync: localStorage.getItem('lastSyncDate') || null,
            lastExport: localStorage.getItem('lastExportDate') || null,
            mode: this.mode
        };
    }
    
    // --- Helper Methods ---
    
    generateCSV(data) {
        if (!data || data.length === 0) {
            return '';
        }
        
        const headers = [
            'checkin_id', 'venue_name', 'venue_type', 'date', 'time', 'year', 'month',
            'latitude', 'longitude', 'street_address', 'city', 'state',
            'postal_code', 'country', 'country_code', 'full_address',
            'foursquare_url', 'venue_id', 'notes', 'is_private'
        ];
        
        let csv = headers.join(',') + '\n';
        
        data.forEach(checkin => {
            const row = headers.map(header => {
                let value = checkin[header] || '';
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            });
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }
    
    parseCSV(text) {
        const lines = text.split('\n');
        if (lines.length === 0) return [];
        
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
        
        return data;
    }
}

export default StorageAdapter;
