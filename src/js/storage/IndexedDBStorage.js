/**
 * IndexedDB Storage Backend (PWA Mode)
 * 
 * Features:
 * - Offline-first with IndexedDB
 * - Fast local queries with indexes
 * - Instant map updates (no CSV reimport needed)
 * - Auto-export to CSV for backup
 * 
 * This is Layer 1 of the PWA Triple Redundancy System.
 */

class IndexedDBStorage {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.dbName = 'DroPin';
        this.version = 1;
        this.db = null;
        this.autoExportThreshold = 100;
    }
    
    async openDB() {
        if (this.db) return this.db;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('checkins')) {
                    const store = db.createObjectStore('checkins', { keyPath: 'checkin_id' });
                    store.createIndex('country', 'country', { unique: false });
                    store.createIndex('venue_type', 'venue_type', { unique: false });
                    store.createIndex('year', 'year', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('venue_name', 'venue_name', { unique: false });
                    store.createIndex('city', 'city', { unique: false });
                }
                
                console.log('[IndexedDB] Database initialized');
            };
        });
    }
    
    async save(checkin) {
        const db = await this.openDB();
        
        if (!checkin.checkin_id) {
            checkin.checkin_id = `checkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        if (!checkin.date) {
            const now = new Date();
            checkin.date = now.toISOString().split('T')[0];
            checkin.time = now.toTimeString().split(' ')[0];
            checkin.year = now.getFullYear().toString();
            checkin.month = (now.getMonth() + 1).toString();
        }
        
        checkin.is_new = true;
        checkin.created_at = new Date().toISOString();
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['checkins'], 'readwrite');
            const store = tx.objectStore('checkins');
            const request = store.add(checkin);
            
            request.onsuccess = () => {
                console.log('[IndexedDB] Saved checkin:', checkin.venue_name);
                resolve(checkin);
                this.scheduleCSVExport();
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async query(filters = {}) {
        const db = await this.openDB();
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['checkins'], 'readonly');
            const store = tx.objectStore('checkins');
            const request = store.getAll();
            
            request.onsuccess = () => {
                let results = request.result;
                
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
                
                resolve(results);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAll() {
        const db = await this.openDB();
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['checkins'], 'readonly');
            const store = tx.objectStore('checkins');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getNew() {
        const all = await this.getAll();
        return all.filter(c => c.is_new === true);
    }
    
    async getById(id) {
        const db = await this.openDB();
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['checkins'], 'readonly');
            const store = tx.objectStore('checkins');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }
    
    async update(id, updates) {
        const db = await this.openDB();
        const existing = await this.getById(id);
        
        if (!existing) {
            throw new Error(`Checkin ${id} not found`);
        }
        
        const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['checkins'], 'readwrite');
            const store = tx.objectStore('checkins');
            const request = store.put(updated);
            
            request.onsuccess = () => {
                console.log('[IndexedDB] Updated checkin:', id);
                resolve(updated);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async delete(id) {
        const db = await this.openDB();
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['checkins'], 'readwrite');
            const store = tx.objectStore('checkins');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('[IndexedDB] Deleted checkin:', id);
                resolve();
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async importBulk(checkins) {
        const db = await this.openDB();
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['checkins'], 'readwrite');
            const store = tx.objectStore('checkins');
            
            let count = 0;
            checkins.forEach(checkin => {
                checkin.is_new = false;
                store.put(checkin);
                count++;
            });
            
            tx.oncomplete = () => {
                console.log(`[IndexedDB] Imported ${count} checkins`);
                resolve();
            };
            
            tx.onerror = () => reject(tx.error);
        });
    }
    
    async markAsExported() {
        const newCheckins = await this.getNew();
        const db = await this.openDB();
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['checkins'], 'readwrite');
            const store = tx.objectStore('checkins');
            
            newCheckins.forEach(checkin => {
                checkin.is_new = false;
                checkin.exported_at = new Date().toISOString();
                store.put(checkin);
            });
            
            tx.oncomplete = () => {
                console.log(`[IndexedDB] Marked ${newCheckins.length} checkins as exported`);
                resolve();
            };
            
            tx.onerror = () => reject(tx.error);
        });
    }
    
    async scheduleCSVExport() {
        const newCount = (await this.getNew()).length;
        
        if (newCount >= this.autoExportThreshold) {
            console.log(`[IndexedDB] Auto-export threshold reached (${newCount}/${this.autoExportThreshold})`);
            
            if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.sync.register('export-csv');
                    console.log('[IndexedDB] Background sync registered');
                } catch (error) {
                    console.error('[IndexedDB] Background sync failed:', error);
                }
            }
        }
    }
}

export default IndexedDBStorage;
