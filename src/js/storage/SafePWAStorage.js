/**
 * Safe PWA Storage - Triple Redundancy System
 * 
 * Three-layer backup strategy to protect against data loss:
 * 
 * LAYER 1: IndexedDB (Primary Storage)
 * - Fast, offline-capable
 * - 50MB+ storage capacity
 * - Survives browser restarts
 * - ⚠️ Risk: Cleared when user clears site data
 * 
 * LAYER 2: localStorage (Redundant Backup)
 * - Keeps last 200 check-ins (rolling window)
 * - Survives most cache clears
 * - Used for recovery if IndexedDB wiped
 * - ⚠️ Risk: Cleared if user clears "site data"
 * 
 * LAYER 3: Google Drive (Permanent Cloud Backup)
 * - Auto-uploads CSV every 5 check-ins
 * - Survives everything (browser wipe, device loss)
 * - User controls their own data
 * - ✅ No risk: Stored in user's Google Drive
 * 
 * Part of DroPin PWA Implementation
 */

import IndexedDBStorage from './IndexedDBStorage.js';
import GoogleDriveBackup from '../backup/GoogleDriveBackup.js';

class SafePWAStorage {
    constructor(eventBus, config) {
        this.eventBus = eventBus;
        this.config = config;
        
        // Layer 1: IndexedDB (primary)
        this.indexedDB = new IndexedDBStorage(eventBus);
        
        // Layer 2: localStorage backup settings
        this.localStorageKey = 'pwa_backup';
        this.localStorageMaxSize = 200; // Keep last 200 check-ins
        
        // Layer 3: Google Drive backup
        this.googleDrive = new GoogleDriveBackup(config.GOOGLE_DRIVE_CLIENT_ID);
        this.autoBackupInterval = config.AUTO_BACKUP_INTERVAL || 5;
        this.backupFolderName = config.BACKUP_FOLDER_NAME || 'DroPin Backups';
        
        // Counter for auto-backup (now persisted in localStorage)
        this.backupCounterKey = 'gdrive_backup_counter';
        this.checkinsCounter = this.loadBackupCounter();
        this.initPromise = null;
        
        console.log(`[SafePWA] Initialized with auto-backup every ${this.autoBackupInterval} check-ins (current: ${this.checkinsCounter})`);
    }
    
    /**
     * Load backup counter from localStorage (persists across page reloads)
     */
    loadBackupCounter() {
        try {
            const saved = localStorage.getItem(this.backupCounterKey);
            return saved ? parseInt(saved, 10) : 0;
        } catch (error) {
            console.error('[SafePWA] Failed to load backup counter:', error);
            return 0;
        }
    }
    
    /**
     * Save backup counter to localStorage
     */
    saveBackupCounter() {
        try {
            localStorage.setItem(this.backupCounterKey, this.checkinsCounter.toString());
        } catch (error) {
            console.error('[SafePWA] Failed to save backup counter:', error);
        }
    }
    
    /**
     * Reset backup counter (after successful backup)
     */
    resetBackupCounter() {
        this.checkinsCounter = 0;
        this.saveBackupCounter();
    }
    
    async initialize() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = (async () => {
            try {
                await this.indexedDB.openDB();
                console.log('[SafePWA] ✓ Layer 1: IndexedDB initialized');
                await this.promptGoogleDriveSetup();
                await this.checkRecovery();
                return true;
            } catch (error) {
                console.error('[SafePWA] Initialization failed:', error);
                return false;
            }
        })();
        
        return this.initPromise;
    }
    
    async promptGoogleDriveSetup() {
        const hasSetup = localStorage.getItem('gdrive_setup_complete');
        
        if (!hasSetup) {
            const enable = confirm(
                '🔐 Enable automatic Google Drive backups?\n\n' +
                'Your check-ins will be automatically backed up to Google Drive ' +
                `every ${this.autoBackupInterval} check-ins.\n\n` +
                '✅ Protects your data if you clear browser cache\n' +
                '✅ You control your own data (stored in YOUR Google Drive)\n' +
                '✅ Free - no additional costs\n\n' +
                'Click OK to connect Google Drive (recommended)\n' +
                'Click Cancel to skip (you can enable this later in settings)'
            );
            
            if (enable) {
                try {
                    const success = await this.googleDrive.initialize();
                    if (success) {
                        localStorage.setItem('gdrive_setup_complete', 'true');
                        alert('✅ Google Drive connected! Your check-ins will be auto-backed up.');
                        console.log('[SafePWA] ✓ Layer 3: Google Drive connected');
                    } else {
                        localStorage.setItem('gdrive_setup_complete', 'declined');
                    }
                } catch (error) {
                    console.error('[SafePWA] Google Drive setup failed:', error);
                    localStorage.setItem('gdrive_setup_complete', 'declined');
                }
            } else {
                localStorage.setItem('gdrive_setup_complete', 'declined');
                console.log('[SafePWA] User declined Google Drive backup');
            }
        } else if (hasSetup === 'true') {
            try {
                await this.googleDrive.initialize();
                console.log('[SafePWA] ✓ Layer 3: Google Drive reconnected');
            } catch (error) {
                console.log('[SafePWA] Google Drive reconnection failed');
            }
        }
    }
    
    async save(checkin) {
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
        
        checkin.gdrive_backed_up = false;
        
        try {
            await this.indexedDB.save(checkin);
            console.log('[SafePWA] ✓ Layer 1: IndexedDB saved');
            
            this.addToLocalStorageBackup(checkin);
            console.log('[SafePWA] ✓ Layer 2: localStorage backed up');
            
            this.checkinsCounter++;
            this.saveBackupCounter(); // Persist counter immediately
            
            console.log(`[SafePWA] Backup counter: ${this.checkinsCounter}/${this.autoBackupInterval}`);
            
            if (this.checkinsCounter >= this.autoBackupInterval) {
                this.autoBackupToGoogleDrive().catch(err => {
                    console.warn('[SafePWA] Background backup failed:', err);
                });
            }
            
            return checkin;
        } catch (error) {
            console.error('[SafePWA] Save error:', error);
            this.addToLocalStorageBackup(checkin);
            throw error;
        }
    }
    
    addToLocalStorageBackup(checkin) {
        try {
            const backup = JSON.parse(localStorage.getItem(this.localStorageKey) || '[]');
            backup.push(checkin);
            const trimmed = backup.slice(-this.localStorageMaxSize);
            localStorage.setItem(this.localStorageKey, JSON.stringify(trimmed));
        } catch (error) {
            console.error('[SafePWA] localStorage backup failed:', error);
        }
    }
    
    async autoBackupToGoogleDrive() {
        const setupStatus = localStorage.getItem('gdrive_setup_complete');
        
        if (setupStatus === 'declined') {
            console.log('[SafePWA] Google Drive backup skipped (user declined)');
            // Reset counter even if declined, to avoid accumulation
            this.resetBackupCounter();
            return;
        }
        
        try {
            console.log('[SafePWA] Starting Google Drive backup...');
            const allCheckins = await this.getAll();
            const csv = this.generateCSV(allCheckins);
            await this.googleDrive.uploadBackup(csv);
            await this.markAsBackedUp();
            
            // Reset counter after successful backup
            this.resetBackupCounter();
            
            console.log(`[SafePWA] ✓ Layer 3: Google Drive backup complete (${allCheckins.length} check-ins)`);
            this.showToast(`☁️ Backed up to Google Drive (${allCheckins.length} check-ins)`);
        } catch (error) {
            console.error('[SafePWA] Google Drive backup failed:', error);
            // Don't reset counter on failure - will retry on next check-in
        }
    }
    
    async markAsBackedUp() {
        const all = await this.indexedDB.getAll();
        const db = await this.indexedDB.openDB();
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['checkins'], 'readwrite');
            const store = tx.objectStore('checkins');
            
            all.forEach(checkin => {
                checkin.gdrive_backed_up = true;
                checkin.last_backup = new Date().toISOString();
                store.put(checkin);
            });
            
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    
    async checkRecovery() {
        const indexedDBCount = (await this.indexedDB.getAll()).length;
        const backup = JSON.parse(localStorage.getItem(this.localStorageKey) || '[]');
        
        if (indexedDBCount === 0 && backup.length > 0) {
            console.log(`[SafePWA] 🔧 Recovery mode: ${backup.length} check-ins found in backup`);
            
            const recover = confirm(
                `🔧 Data Recovery Available\n\n` +
                `Found ${backup.length} check-ins in backup storage.\n` +
                `Your main database appears empty.\n\n` +
                `Restore from backup?`
            );
            
            if (recover) {
                await this.indexedDB.importBulk(backup);
                alert(`✅ Recovered ${backup.length} check-ins!`);
                console.log(`[SafePWA] ✓ Recovery complete`);
            }
        }
    }
    
    generateCSV(checkins) {
        if (!checkins || checkins.length === 0) return '';
        
        const headers = [
            'checkin_id', 'venue_name', 'venue_type', 'date', 'time', 'year', 'month',
            'latitude', 'longitude', 'street_address', 'city', 'state',
            'postal_code', 'country', 'country_code', 'full_address',
            'foursquare_url', 'venue_id', 'notes', 'is_private'
        ];
        
        let csv = headers.join(',') + '\n';
        
        checkins.forEach(checkin => {
            const row = headers.map(header => {
                let value = checkin[header] || '';
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            });
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (toast.parentNode) document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    async manualBackup() {
        try {
            await this.autoBackupToGoogleDrive();
            return true;
        } catch (error) {
            console.error('[SafePWA] Manual backup failed:', error);
            return false;
        }
    }
    
    async query(filters) { return await this.indexedDB.query(filters); }
    async getAll() { return await this.indexedDB.getAll(); }
    async getNew() { return await this.indexedDB.getNew(); }
    async getById(id) { return await this.indexedDB.getById(id); }
    async update(id, updates) { return await this.indexedDB.update(id, updates); }
    async delete(id) { return await this.indexedDB.delete(id); }
    async importBulk(checkins) { return await this.indexedDB.importBulk(checkins); }
}

export default SafePWAStorage;
