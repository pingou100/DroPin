/**
 * Supabase Storage Backend (Cloud Mode)
 * 
 * Features:
 * - Real-time cloud sync across devices
 * - Multi-user support with Row Level Security
 * - Offline-first with local cache (IndexedDB)
 * - Auto-backup to CSV
 * 
 * This is the "cloud" mode for multi-device/multi-user scenarios.
 * 
 * Setup required:
 * 1. Create Supabase project at https://supabase.com
 * 2. Run database setup (see docs/SUPABASE_SETUP.md)
 * 3. Add Supabase URL and anon key to config.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

class SupabaseStorage {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.supabase = null;
        this.localCache = null; // Will use IndexedDB for offline support
        this.realtimeChannel = null;
        this.autoExportCSV = true; // Still export CSV for backups
    }
    
    /**
     * Initialize Supabase client
     * @param {string} url - Supabase project URL
     * @param {string} anonKey - Supabase anonymous key
     */
    async initialize(url, anonKey) {
        if (!url || !anonKey) {
            throw new Error('Supabase URL and anon key required for cloud mode');
        }
        
        this.supabase = createClient(url, anonKey);
        
        // Set up local cache (IndexedDB) for offline support
        await this.initializeLocalCache();
        
        // Set up realtime subscriptions
        this.setupRealtimeSync();
        
        console.log('[SupabaseStorage] Initialized with realtime sync');
    }
    
    /**
     * Initialize local IndexedDB cache for offline support
     */
    async initializeLocalCache() {
        // Reuse IndexedDB implementation for offline cache
        const { default: IndexedDBStorage } = await import('./IndexedDBStorage.js');
        this.localCache = new IndexedDBStorage(this.eventBus);
        await this.localCache.openDB();
    }
    
    /**
     * Set up realtime subscriptions for live updates
     */
    setupRealtimeSync() {
        if (!this.supabase) return;
        
        this.realtimeChannel = this.supabase
            .channel('checkins')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'checkins' 
                },
                (payload) => {
                    console.log('[Supabase] New checkin from another device:', payload.new);
                    
                    // Update local cache
                    if (this.localCache) {
                        this.localCache.save(payload.new).catch(console.error);
                    }
                    
                    // Notify map to add marker
                    this.eventBus.emit('checkin:added', payload.new);
                }
            )
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'checkins'
                },
                (payload) => {
                    console.log('[Supabase] Checkin updated:', payload.new);
                    
                    if (this.localCache) {
                        this.localCache.update(payload.new.checkin_id, payload.new).catch(console.error);
                    }
                    
                    this.eventBus.emit('checkin:updated', payload.new);
                }
            )
            .on('postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'checkins'
                },
                (payload) => {
                    console.log('[Supabase] Checkin deleted:', payload.old.checkin_id);
                    
                    if (this.localCache) {
                        this.localCache.delete(payload.old.checkin_id).catch(console.error);
                    }
                    
                    this.eventBus.emit('checkin:deleted', { id: payload.old.checkin_id });
                }
            )
            .subscribe();
    }
    
    async save(checkin) { /* Implementation from public repo */ }
    async query(filters = {}) { /* Implementation from public repo */ }
    async getAll() { /* Implementation from public repo */ }
    async getNew() { /* Implementation from public repo */ }
    async getById(id) { /* Implementation from public repo */ }
    async update(id, updates) { /* Implementation from public repo */ }
    async delete(id) { /* Implementation from public repo */ }
    async importBulk(checkins) { /* Implementation from public repo */ }
    async sync() { /* Implementation from public repo */ }
    async signIn(email, password) { /* Implementation from public repo */ }
    async signOut() { /* Implementation from public repo */ }
    async getUser() { /* Implementation from public repo */ }
}

export default SupabaseStorage;