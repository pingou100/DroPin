/**
 * Google Drive Backup Manager (Using Google Identity Services)
 * 
 * Handles automatic CSV backups to Google Drive:
 * - OAuth2 authentication with Google Identity Services
 * - Create/find backup folder in Drive
 * - Upload CSV files with multipart upload
 * - Token refresh and error handling
 * 
 * Part of DroPin PWA Triple Redundancy System
 */

class GoogleDriveBackup {
    constructor(clientId) {
        this.clientId = clientId;
        this.accessToken = null;
        this.tokenExpiry = null;
        this.backupFolderId = null;
        this.isInitialized = false;
        this.tokenClient = null;
    }
    
    /**
     * Initialize Google Drive API with Google Identity Services
     */
    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            // Load Google Identity Services library
            await this.loadGoogleIdentityServices();
            
            // Check for saved token
            const savedToken = localStorage.getItem('gdrive_access_token');
            const savedExpiry = localStorage.getItem('gdrive_token_expiry');
            
            if (savedToken && savedExpiry && Date.now() < parseInt(savedExpiry)) {
                this.accessToken = savedToken;
                this.tokenExpiry = parseInt(savedExpiry);
                this.isInitialized = true;
                console.log('[GoogleDrive] ✓ Restored saved token');
                return true;
            }
            
            // Need fresh authentication
            return await this.authenticate();
            
        } catch (error) {
            console.error('[GoogleDrive] Initialization failed:', error);
            return false;
        }
    }
    
    /**
     * Load Google Identity Services library
     */
    async loadGoogleIdentityServices() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.google?.accounts?.oauth2) {
                resolve();
                return;
            }
            
            // Load script
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                console.log('[GoogleDrive] Google Identity Services loaded');
                
                // Initialize token client
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.clientId,
                    scope: 'https://www.googleapis.com/auth/drive.file',
                    callback: '', // Will be set in authenticate()
                });
                
                resolve();
            };
            
            script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Authenticate user with Google Identity Services
     */
    async authenticate() {
        return new Promise((resolve) => {
            try {
                console.log('[GoogleDrive] Prompting for sign-in...');
                
                // Set callback for token response
                this.tokenClient.callback = async (response) => {
                    if (response.error) {
                        console.error('[GoogleDrive] Authentication failed:', response);
                        resolve(false);
                        return;
                    }
                    
                    // Store token
                    this.accessToken = response.access_token;
                    this.tokenExpiry = Date.now() + (response.expires_in * 1000);
                    
                    // Save to localStorage
                    localStorage.setItem('gdrive_access_token', this.accessToken);
                    localStorage.setItem('gdrive_token_expiry', this.tokenExpiry.toString());
                    
                    this.isInitialized = true;
                    
                    console.log('[GoogleDrive] ✓ Authentication successful');
                    resolve(true);
                };
                
                // Trigger OAuth flow
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
                
            } catch (error) {
                console.error('[GoogleDrive] Authentication error:', error);
                resolve(false);
            }
        });
    }
    
    /**
     * Check if token is expired and refresh if needed
     */
    async ensureValidToken() {
        if (!this.accessToken || Date.now() >= this.tokenExpiry - 60000) {
            console.log('[GoogleDrive] Token expired, re-authenticating...');
            return await this.authenticate();
        }
        return true;
    }
    
    /**
     * Find or create backup folder in Drive
     */
    async ensureBackupFolder(folderName = 'DroPin Backups') {
        if (this.backupFolderId) {
            return this.backupFolderId;
        }
        
        await this.ensureValidToken();
        
        try {
            // Search for existing folder
            const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
                {
                    headers: { 'Authorization': `Bearer ${this.accessToken}` }
                }
            );
            
            if (!response.ok) {
                throw new Error(`Drive API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.files && data.files.length > 0) {
                this.backupFolderId = data.files[0].id;
                console.log('[GoogleDrive] ✓ Found existing backup folder:', this.backupFolderId);
            } else {
                // Create new folder
                this.backupFolderId = await this.createFolder(folderName);
                console.log('[GoogleDrive] ✓ Created backup folder:', this.backupFolderId);
            }
            
            return this.backupFolderId;
            
        } catch (error) {
            console.error('[GoogleDrive] Failed to ensure backup folder:', error);
            throw error;
        }
    }
    
    /**
     * Create a folder in Google Drive
     */
    async createFolder(name) {
        await this.ensureValidToken();
        
        const metadata = {
            name: name,
            mimeType: 'application/vnd.google-apps.folder'
        };
        
        const response = await fetch(
            'https://www.googleapis.com/drive/v3/files?fields=id',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metadata)
            }
        );
        
        if (!response.ok) {
            throw new Error(`Failed to create folder: ${response.status}`);
        }
        
        const data = await response.json();
        return data.id;
    }
    
    /**
     * Upload CSV backup to Google Drive
     * @param {string} csvContent - CSV file content
     * @param {string} filename - Optional custom filename
     */
    async uploadBackup(csvContent, filename = null) {
        if (!this.isInitialized) {
            const success = await this.initialize();
            if (!success) {
                throw new Error('Google Drive authentication required');
            }
        }
        
        await this.ensureValidToken();
        await this.ensureBackupFolder();
        
        // Generate filename if not provided
        if (!filename) {
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            filename = `DroPin-Backup-${date}-${time}.csv`;
        }
        
        try {
            // Create multipart upload request
            const boundary = '-------dropin_backup_boundary_' + Date.now();
            const delimiter = "\r\n--" + boundary + "\r\n";
            const closeDelimiter = "\r\n--" + boundary + "--";
            
            const metadata = {
                name: filename,
                mimeType: 'text/csv',
                parents: [this.backupFolderId]
            };
            
            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: text/csv\r\n\r\n' +
                csvContent +
                closeDelimiter;
            
            const response = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body: multipartRequestBody
                }
            );
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Upload failed: ${error.error?.message || response.status}`);
            }
            
            const result = await response.json();
            
            console.log('[GoogleDrive] ✓ Backup uploaded:', result.name, `(${result.size} bytes)`);
            
            // Update last backup time
            localStorage.setItem('last_gdrive_backup', new Date().toISOString());
            localStorage.setItem('last_gdrive_backup_filename', result.name);
            
            return result;
            
        } catch (error) {
            console.error('[GoogleDrive] Upload failed:', error);
            throw error;
        }
    }
    
    /**
     * Get backup status info
     */
    getBackupStatus() {
        const lastBackup = localStorage.getItem('last_gdrive_backup');
        const lastFilename = localStorage.getItem('last_gdrive_backup_filename');
        
        return {
            isConnected: this.isInitialized,
            lastBackup: lastBackup ? new Date(lastBackup) : null,
            lastFilename: lastFilename || null,
            tokenExpiry: this.tokenExpiry ? new Date(this.tokenExpiry) : null
        };
    }
    
    /**
     * Sign out and clear credentials
     */
    async signOut() {
        try {
            // Revoke token
            if (this.accessToken) {
                await fetch(`https://oauth2.googleapis.com/revoke?token=${this.accessToken}`, {
                    method: 'POST'
                });
            }
            
            localStorage.removeItem('gdrive_access_token');
            localStorage.removeItem('gdrive_token_expiry');
            localStorage.removeItem('gdrive_setup_complete');
            
            this.accessToken = null;
            this.tokenExpiry = null;
            this.backupFolderId = null;
            this.isInitialized = false;
            
            console.log('[GoogleDrive] ✓ Signed out');
            
        } catch (error) {
            console.error('[GoogleDrive] Sign out error:', error);
        }
    }
}

export default GoogleDriveBackup;
