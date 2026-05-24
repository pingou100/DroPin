/**
 * Storage Adapter - Unified API for all storage modes
 * 
 * Supports three modes:
 * - 'csv': Legacy CSV-only mode (current behavior)
 * - 'pwa': Progressive Web App with triple redundancy (IndexedDB + localStorage + Google Drive)
 * - 'cloud': Supabase cloud sync with multi-user support
 * 
 * All modes support CSV export for data portability.
 */

import CSVStorage from './CSVStorage.js';
import IndexedDBStorage from './IndexedDBStorage.js';
import SafePWAStorage from './SafePWAStorage.js';
import SupabaseStorage from './SupabaseStorage.js';
import EventBus from '../events/EventBus.js';

class StorageAdapter {
    constructor(mode = null, config = null) {
        this.config = config || window.CONFIG || {};
        this.eventBus = new EventBus();
        
        // PRIORITY ORDER: explicit param > CONFIG > localStorage > default 'csv'
        this.mode = mode || this.config.STORAGE_MODE || localStorage.getItem('storage_mode') || 'csv';
        
        // Sync localStorage with the chosen mode
        if (localStorage.getItem('storage_mode') !== this.mode) {
            console.log(`[StorageAdapter] Syncing localStorage to match CONFIG: ${this.mode}`);
            localStorage.setItem('storage_mode', this.mode);
        }
        
        this.backend = this.createBackend(this.mode);
        console.log(`[StorageAdapter] Initialized in ${this.mode} mode`);
    }
    
    createBackend(mode) {
        switch(mode) {
            case 'csv': return new CSVStorage(this.eventBus);
            case 'pwa': return new SafePWAStorage(this.eventBus, this.config);
            case 'cloud': return new SupabaseStorage(this.eventBus);
            default: console.warn(`Unknown storage mode: ${mode}, defaulting to CSV`); return new CSVStorage(this.eventBus);
        }
    }
    
    async initialize() {
        if (this.backend.initialize) {
            await this.backend.initialize();
            console.log(`[StorageAdapter] Backend initialized for ${this.mode} mode`);
        }
    }
    
    async switchMode(newMode, migrateData = true) {
        if (newMode === this.mode) { console.log('[StorageAdapter] Already in ' + newMode + ' mode'); return; }
        console.log(`[StorageAdapter] Switching from ${this.mode} to ${newMode}`);
        let existingData = null;
        if (migrateData) {
            try { existingData = await this.backend.getAll(); console.log(`[StorageAdapter] Exported ${existingData.length} checkins for migration`); }
            catch (error) { console.error('[StorageAdapter] Failed to export data for migration:', error); throw new Error('Migration failed: Could not export existing data'); }
        }
        const newBackend = this.createBackend(newMode);
        if (newBackend.initialize) await newBackend.initialize();
        if (existingData && existingData.length > 0) {
            try { await newBackend.importBulk(existingData); console.log(`[StorageAdapter] Migrated ${existingData.length} checkins to ${newMode} mode`); }
            catch (error) { console.error('[StorageAdapter] Failed to import data:', error); throw new Error('Migration failed: Could not import to new storage'); }
        }
        this.backend = newBackend;
        this.mode = newMode;
        localStorage.setItem('storage_mode', newMode);
        this.eventBus.emit('storage:mode-changed', { newMode, oldMode: this.mode });
        console.log(`[StorageAdapter] Successfully switched to ${newMode} mode`);
    }
    
    async addCheckin(checkin) {
        const saved = await this.backend.save(checkin);
        this.eventBus.emit('checkin:added', saved);
        return saved;
    }
    
    async getCheckins(filters = {}) { return await this.backend.query(filters); }
    
    async getCheckin(id) {
        if (this.backend.getById) return await this.backend.getById(id);
        const all = await this.backend.query({});
        return all.find(c => c.checkin_id === id) || null;
    }
    
    async updateCheckin(id, updates) {
        if (!this.backend.update) throw new Error(`Update not supported in ${this.mode} mode`);
        const updated = await this.backend.update(id, updates);
        this.eventBus.emit('checkin:updated', updated);
        return updated;
    }
    
    async deleteCheckin(id) {
        if (!this.backend.delete) throw new Error(`Delete not supported in ${this.mode} mode`);
        await this.backend.delete(id);
        this.eventBus.emit('checkin:deleted', { id });
        return true;
    }
    
    async exportCSV() { const allData = await this.backend.getAll(); return this.generateCSV(allData); }
    
    async exportNewCSV() {
        let newData = this.backend.getNew ? await this.backend.getNew() : JSON.parse(localStorage.getItem('newCheckins') || '[]');
        if (!newData || newData.length === 0) return null;
        return this.generateCSV(newData);
    }
    
    async importCSV(csvData) {
        if (csvData instanceof File) csvData = await csvData.text();
        const checkins = this.parseCSV(csvData);
        await this.backend.importBulk(checkins);
        this.eventBus.emit('data:imported', { count: checkins.length });
        return checkins.length;
    }
    
    async sync() { if (this.backend.sync) await this.backend.sync(); }
    
    async getBackupStats() { return this.backend.getBackupStats ? await this.backend.getBackupStats() : null; }
    
    async manualBackup() {
        if (this.backend.manualBackup) return await this.backend.manualBackup();
        throw new Error('Manual backup not supported in ' + this.mode + ' mode');
    }
    
    on(event, callback) { this.eventBus.on(event, callback); }
    off(event, callback) { this.eventBus.off(event, callback); }
    
    async getStats() {
        const all = await this.backend.getAll();
        const newCheckins = this.backend.getNew ? await this.backend.getNew() : [];
        const stats = { total: all.length, new: newCheckins.length, lastSync: localStorage.getItem('lastSyncDate') || null, lastExport: localStorage.getItem('lastExportDate') || null, mode: this.mode };
        if (this.mode === 'pwa' && this.backend.getBackupStats) stats.backup = await this.backend.getBackupStats();
        return stats;
    }
    
    generateCSV(data) {
        if (!data || data.length === 0) return '';
        const headers = ['checkin_id','venue_name','venue_type','date','time','year','month','latitude','longitude','street_address','city','state','postal_code','country','country_code','full_address','foursquare_url','venue_id','notes','is_private'];
        let csv = headers.join(',') + '\n';
        data.forEach(checkin => {
            const row = headers.map(header => {
                let value = checkin[header] || '';
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) value = '"' + value.replace(/"/g, '""') + '"';
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
            const values = []; let current = ''; let inQuotes = false;
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
                else current += char;
            }
            values.push(current.trim().replace(/^"|"$/g, ''));
            if (values.length === headers.length) {
                const obj = {};
                headers.forEach((header, index) => { obj[header] = values[index]; });
                data.push(obj);
            }
        }
        return data;
    }
}

export default StorageAdapter;