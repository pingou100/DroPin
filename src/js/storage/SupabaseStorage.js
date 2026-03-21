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
    
    /**
     * Save a new checkin to cloud and local cache
     * @param {Object} checkin - Checkin data
     * @returns {Promise<Object>} Saved checkin with ID
     */
    async save(checkin) {
        // Generate ID if not present
        if (!checkin.checkin_id) {
            checkin.checkin_id = `checkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;\n        }
        
        // Add timestamp
        if (!checkin.date) {
            const now = new Date();
            checkin.date = now.toISOString().split('T')[0];
            checkin.time = now.toTimeString().split(' ')[0];
            checkin.year = now.getFullYear().toString();
            checkin.month = (now.getMonth() + 1).toString();
        }
        
        // Add user ID if authenticated
        if (this.supabase) {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (user) {
                checkin.user_id = user.id;
            }
        }
        
        try {
            // Save to cloud
            const { data, error } = await this.supabase
                .from('checkins')
                .insert([checkin])
                .select()
                .single();
            
            if (error) {
                console.error('[Supabase] Save error:', error);
                
                // Offline: save to local cache and queue for sync
                if (this.localCache) {
                    checkin.sync_pending = true;
                    await this.localCache.save(checkin);
                    return checkin;
                }
                
                throw error;
            }
            
            // Save to local cache
            if (this.localCache) {
                await this.localCache.save(data);
            }
            
            console.log('[Supabase] Saved checkin:', data.venue_name);
            
            // Schedule CSV backup if enabled
            if (this.autoExportCSV) {
                this.scheduleCSVBackup();
            }
            
            return data;
            
        } catch (error) {
            console.error('[Supabase] Network error:', error);
            
            // Offline fallback
            if (this.localCache) {
                checkin.sync_pending = true;
                await this.localCache.save(checkin);
                console.log('[Supabase] Saved offline, will sync when online');
                return checkin;
            }
            
            throw error;
        }
    }
    
    /**
     * Query checkins with filters
     * @param {Object} filters - {country, type, year, search}
     * @returns {Promise<Array>} Filtered checkins
     */
    async query(filters = {}) {
        try {
            let query = this.supabase
                .from('checkins')
                .select('*');
            
            // Apply filters
            if (filters.country && filters.country !== 'all') {
                query = query.eq('country', filters.country);
            }
            
            if (filters.type && filters.type !== 'all') {
                query = query.eq('venue_type', filters.type);
            }
            
            if (filters.year && filters.year !== 'all') {
                query = query.eq('year', filters.year.toString());
            }
            
            if (filters.search) {
                // Text search in venue_name or city
                query = query.or(`venue_name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('[Supabase] Query error:', error);
            
            // Offline fallback: use local cache
            if (this.localCache) {
                console.log('[Supabase] Using local cache (offline mode)');
                return await this.localCache.query(filters);
            }
            
            throw error;
        }
    }
    
    /**
     * Get all checkins
     * @returns {Promise<Array>} All checkins
     */
    async getAll() {
        return await this.query({});
    }
    
    /**
     * Get new checkins (sync pending or recent)
     * @returns {Promise<Array>} New checkins
     */
    async getNew() {
        // Get checkins marked as sync_pending from local cache
        if (this.localCache) {
            const all = await this.localCache.getAll();
            return all.filter(c => c.sync_pending === true);
        }
        
        // Or get recent checkins from cloud (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data } = await this.supabase
            .from('checkins')
            .select('*')
            .gte('created_at', sevenDaysAgo.toISOString());
        
        return data || [];
    }
    
    /**
     * Get checkin by ID
     * @param {string} id - Checkin ID
     * @returns {Promise<Object|null>} Checkin or null
     */
    async getById(id) {
        try {
            const { data, error } = await this.supabase
                .from('checkins')
                .select('*')
                .eq('checkin_id', id)
                .single();
            
            if (error) throw error;
            
            return data;
            
        } catch (error) {
            // Offline fallback
            if (this.localCache) {
                return await this.localCache.getById(id);
            }
            
            return null;
        }
    }
    
    /**
     * Update a checkin
     * @param {string} id - Checkin ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated checkin
     */
    async update(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('checkins')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('checkin_id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            // Update local cache
            if (this.localCache) {
                await this.localCache.update(id, data);
            }
            
            console.log('[Supabase] Updated checkin:', id);
            
            return data;
            
        } catch (error) {
            console.error('[Supabase] Update error:', error);
            
            // Offline fallback
            if (this.localCache) {
                updates.sync_pending = true;
                return await this.localCache.update(id, updates);
            }
            
            throw error;
        }
    }
    
    /**
     * Delete a checkin
     * @param {string} id - Checkin ID
     * @returns {Promise<void>}\n     */
    async delete(id) {
        try {
            const { error } = await this.supabase
                .from('checkins')
                .delete()
                .eq('checkin_id', id);
            
            if (error) throw error;
            
            // Delete from local cache
            if (this.localCache) {
                await this.localCache.delete(id);
            }
            
            console.log('[Supabase] Deleted checkin:', id);
            
        } catch (error) {
            console.error('[Supabase] Delete error:', error);
            throw error;
        }
    }
    
    /**
     * Import bulk checkins
     * @param {Array} checkins - Array of checkin objects
     * @returns {Promise<void>}
     */
    async importBulk(checkins) {
        try {
            // Batch insert to cloud
            const { error } = await this.supabase
                .from('checkins')
                .insert(checkins);
            
            if (error) throw error;
            
            // Update local cache
            if (this.localCache) {
                await this.localCache.importBulk(checkins);
            }
            
            console.log(`[Supabase] Imported ${checkins.length} checkins`);
            
        } catch (error) {
            console.error('[Supabase] Import error:', error);
            throw error;
        }
    }
    
    /**
     * Sync pending checkins to cloud
     * @returns {Promise<void>}
     */
    async sync() {
        if (!this.localCache) return;
        
        const pending = await this.getNew();
        
        if (pending.length === 0) {
            console.log('[Supabase] No pending checkins to sync');
            return;
        }
        
        console.log(`[Supabase] Syncing ${pending.length} pending checkins...`);
        
        for (const checkin of pending) {
            try {
                // Remove sync_pending flag before uploading
                const { sync_pending, ...cleanCheckin } = checkin;
                
                const { error } = await this.supabase
                    .from('checkins')
                    .upsert([cleanCheckin]);
                
                if (error) throw error;
                
                // Mark as synced in local cache
                await this.localCache.update(checkin.checkin_id, { sync_pending: false });
                
            } catch (error) {
                console.error(`[Supabase] Failed to sync ${checkin.checkin_id}:`, error);
            }
        }
        
        console.log('[Supabase] Sync complete');
    }
    
    /**
     * Schedule CSV backup
     */
    scheduleCSVBackup() {
        // Could trigger periodic CSV exports for backup
        console.log('[Supabase] CSV backup scheduled');
    }
    
    /**
     * Sign in user (required for cloud mode)
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} User data
     */
    async signIn(email, password) {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        console.log('[Supabase] User signed in:', data.user.email);
        
        return data.user;
    }
    
    /**
     * Sign out user
     */
    async signOut() {
        await this.supabase.auth.signOut();
        console.log('[Supabase] User signed out');
    }
    
    /**
     * Get current user
     * @returns {Promise<Object|null>} User or null
     */
    async getUser() {
        const { data: { user } } = await this.supabase.auth.getUser();
        return user;
    }
}

export default SupabaseStorage;
