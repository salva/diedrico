/**
 * GoogleDriveService
 * 
 * Service for interacting with Google Drive API to store and retrieve project files.
 * Projects are stored in a "diedrico" folder in the user's Google Drive as .diedrico files.
 * 
 * Architecture:
 * - Direct browser-to-Drive communication using gapi.client
 * - OAuth2 authentication with scope: drive.file (app-created files only)
 * - No backend server required
 * 
 * @see specs/001-dihedral-learning-mvp/ui-spec.md - Startup Flow and Google Drive Authentication
 * @see specs/001-dihedral-learning-mvp/data-model.md - Persistence Strategy
 */

/// <reference types="gapi" />
/// <reference types="gapi.client.drive-v3" />

export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export interface GoogleDriveConfig {
  clientId: string;
  apiKey?: string;  // Optional: recommended for quota tracking but not required for OAuth
  appId: string;
}

/**
 * Service for Google Drive operations
 */
export class GoogleDriveService {
  private static readonly DISCOVERY_DOCS = [
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  ];
  
  private static readonly SCOPES = 'https://www.googleapis.com/auth/drive.file';
  
  private static readonly FOLDER_NAME = 'diedrico';
  private static readonly FILE_EXTENSION = '.diedrico';
  
  private config: GoogleDriveConfig;
  private initialized = false;
  private initializing = false; // Prevent multiple simultaneous initializations
  private folderId: string | null = null;
  private tokenClient: any = null;
  private accessToken: string | null = null;

  constructor(config: GoogleDriveConfig) {
    this.config = config;
  }

  /**
   * Initialize Google API client with new Google Identity Services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Prevent multiple simultaneous initializations
    if (this.initializing) {
      return;
    }
    
    this.initializing = true;

    return new Promise((resolve, reject) => {
      // Load gapi client
      gapi.load('client', async () => {
        try {
          console.log('[GoogleDrive] Initializing with config:', {
            clientId: this.config.clientId?.substring(0, 20) + '...',
            hasApiKey: !!this.config.apiKey,
            scope: GoogleDriveService.SCOPES,
          });
          
          // Initialize gapi client (for Drive API calls)
          const initConfig: any = {
            discoveryDocs: GoogleDriveService.DISCOVERY_DOCS,
          };
          
          if (this.config.apiKey) {
            initConfig.apiKey = this.config.apiKey;
          }
          
          await gapi.client.init(initConfig);
          
          // Initialize Token Client (new GIS auth)
          this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: this.config.clientId,
            scope: GoogleDriveService.SCOPES,
            callback: '', // Will be set during signIn
          });
          
          this.initialized = true;
          this.initializing = false;
          console.log('[GoogleDrive] Initialization successful');
          
          // Try to restore previous session AFTER initialization is complete
          await this.tryRestoreSession();
          resolve();
        } catch (error: any) {
          console.error('[GoogleDrive] Initialization failed:', error);
          console.error('[GoogleDrive] Error details:', JSON.stringify(error, null, 2));
          reject(new Error(`Failed to initialize Google API: ${error.error || error.message || JSON.stringify(error)}`));
        }
      });
    });
  }

  /**
   * Try to restore previous session (silent sign-in)
   */
  private async tryRestoreSession(): Promise<void> {
    const wasSignedIn = localStorage.getItem('diedrico_was_signed_in');
    if (wasSignedIn === 'true') {
      try {
        // Try silent sign-in (no popup if user is still signed in to Google)
        await this.signInSilently();
        console.log('[GoogleDrive] Session restored automatically');
      } catch (error) {
        console.log('[GoogleDrive] Could not restore session:', error);
        localStorage.removeItem('diedrico_was_signed_in');
      }
    }
  }

  /**
   * Check if user is signed in (has valid access token)
   */
  isSignedIn(): boolean {
    // Check if we have an access token, or if gapi client has a token
    const token = gapi.client.getToken();
    return this.accessToken !== null || (token !== null && token.access_token !== undefined);
  }

  /**
   * Sign in silently (no popup) if user is already signed in to Google
   */
  private async signInSilently(): Promise<void> {
    // Don't call initialize again - we should already be initialized
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient.callback = (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          
          this.accessToken = response.access_token;
          gapi.client.setToken({ access_token: this.accessToken });
          localStorage.setItem('diedrico_was_signed_in', 'true');
          resolve();
        };
        
        // Request access token silently (no popup if already signed in)
        this.tokenClient.requestAccessToken({ prompt: '' });
      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * Sign in with Google using new GIS library (shows popup)
   */
  async signIn(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient.callback = (response: any) => {
          if (response.error) {
            if (response.error === 'popup_closed_by_user') {
              reject(new Error('Sign-in cancelled by user'));
            } else if (response.error === 'access_denied') {
              reject(new Error('Access denied. Please grant permission to access Google Drive.'));
            } else {
              reject(new Error(`Sign-in failed: ${response.error}`));
            }
            return;
          }
          
          this.accessToken = response.access_token;
          gapi.client.setToken({ access_token: this.accessToken });
          localStorage.setItem('diedrico_was_signed_in', 'true');
          console.log('[GoogleDrive] Sign-in successful');
          resolve();
        };
        
        // Request access token (will show popup)
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (error: any) {
        reject(new Error(`Sign-in failed: ${error.message}`));
      }
    });
  }

  /**
   * Sign out from Google (revoke access token)
   */
  async signOut(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      if (this.accessToken) {
        await (window as any).google.accounts.oauth2.revoke(this.accessToken);
        this.accessToken = null;
        gapi.client.setToken(null);
      }
      localStorage.removeItem('diedrico_was_signed_in');
      this.folderId = null;
    } catch (error) {
      throw new Error(`Failed to sign out: ${error}`);
    }
  }

  /**
   * Get or create the "diedrico" folder in user's Drive
   */
  private async getDiedricoFolderId(): Promise<string> {
    if (this.folderId) {
      return this.folderId;
    }

    try {
      // Search for existing folder
      const response = await gapi.client.drive.files.list({
        q: `name='${GoogleDriveService.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (response.result.files && response.result.files.length > 0) {
        this.folderId = response.result.files[0].id!;
        return this.folderId;
      }

      // Create folder if it doesn't exist
      const createResponse = await gapi.client.drive.files.create({
        resource: {
          name: GoogleDriveService.FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });

      this.folderId = createResponse.result.id!;
      return this.folderId;
    } catch (error) {
      throw new Error(`Failed to get or create diedrico folder: ${error}`);
    }
  }

  /**
   * List all .diedrico files from the diedrico folder
   */
  async listFiles(): Promise<GoogleDriveFile[]> {
    if (!this.isSignedIn()) {
      throw new Error('User not signed in');
    }

    try {
      const folderId = await this.getDiedricoFolderId();

      const response = await gapi.client.drive.files.list({
        q: `'${folderId}' in parents and name contains '${GoogleDriveService.FILE_EXTENSION}' and trashed=false`,
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc',
        spaces: 'drive',
      });

      return (response.result.files || []).map((file) => ({
        id: file.id!,
        name: file.name!,
        modifiedTime: file.modifiedTime!,
      }));
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('Authentication expired. Please sign in again.');
      } else if (error.status === 403) {
        throw new Error('Permission denied. Please grant access to Google Drive.');
      } else if (error.status === 404) {
        throw new Error('Diedrico folder not found.');
      }
      throw new Error(`Failed to list files: ${error.message || error}`);
    }
  }

  /**
   * Get recent files (T301)
   * Returns the most recently modified files, with optional caching
   */
  async getRecentFiles(limit: number = 5): Promise<GoogleDriveFile[]> {
    if (!this.isSignedIn()) {
      throw new Error('User not signed in');
    }

    try {
      // Get all files (already sorted by modifiedTime desc)
      const files = await this.listFiles();
      
      // Return top N files
      return files.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get recent files: ${error}`);
    }
  }

  /**
   * Create a new .diedrico file in the diedrico folder
   */
  async createFile(fileName: string, data: object): Promise<string> {
    if (!this.isSignedIn()) {
      throw new Error('User not signed in');
    }

    try {
      const folderId = await this.getDiedricoFolderId();

      // Ensure .diedrico extension
      const fullFileName = fileName.endsWith(GoogleDriveService.FILE_EXTENSION)
        ? fileName
        : `${fileName}${GoogleDriveService.FILE_EXTENSION}`;

      const fileMetadata = {
        name: fullFileName,
        parents: [folderId],
        mimeType: 'application/json',
      };

      const fileContent = JSON.stringify(data, null, 2);

      // Create multipart request body
      const boundary = '-------314159265358979323846';
      const delimiter = '\r\n--' + boundary + '\r\n';
      const closeDelimiter = '\r\n--' + boundary + '--';

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(fileMetadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelimiter;

      const request = gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        headers: {
          'Content-Type': 'multipart/related; boundary=' + boundary,
        },
        body: multipartRequestBody,
      });

      const response = await request;
      return response.result.id;
    } catch (error) {
      throw new Error(`Failed to create file: ${error}`);
    }
  }

  /**
   * Load a .diedrico file by ID
   */
  async loadFile(fileId: string): Promise<object> {
    if (!this.isSignedIn()) {
      throw new Error('User not signed in');
    }

    try {
      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });

      // The response.body contains the JSON string
      return JSON.parse(response.body);
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('Authentication expired. Please sign in again.');
      } else if (error.status === 404) {
        throw new Error('File not found. It may have been deleted.');
      } else if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network.');
      }
      throw new Error(`Failed to load file: ${error.message || error}`);
    }
  }

  /**
   * Update an existing .diedrico file
   */
  async updateFile(fileId: string, data: object): Promise<void> {
    if (!this.isSignedIn()) {
      throw new Error('User not signed in');
    }

    try {
      const fileContent = JSON.stringify(data, null, 2);

      // Create multipart request body
      const boundary = '-------314159265358979323846';
      const delimiter = '\r\n--' + boundary + '\r\n';
      const closeDelimiter = '\r\n--' + boundary + '--';

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelimiter;

      const request = gapi.client.request({
        path: `/upload/drive/v3/files/${fileId}`,
        method: 'PATCH',
        params: { uploadType: 'multipart' },
        headers: {
          'Content-Type': 'multipart/related; boundary=' + boundary,
        },
        body: multipartRequestBody,
      });

      await request;
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('Authentication expired. Please sign in again.');
      } else if (error.status === 403) {
        throw new Error('Insufficient permissions or storage quota exceeded.');
      } else if (error.status === 404) {
        throw new Error('File not found. It may have been deleted.');
      } else if (!navigator.onLine) {
        throw new Error('No internet connection. Changes will be saved when you\'re back online.');
      }
      throw new Error(`Failed to save file: ${error.message || error}`);
    }
  }

  /**
   * Generate default project name with sequential numbering (T299)
   * Scans existing files to find next available "untitled N" number
   */
  async generateDefaultProjectName(): Promise<string> {
    if (!this.isSignedIn()) {
      return 'untitled 1';
    }

    try {
      // List all .diedrico files in the diedrico folder
      const files = await this.listFiles();
      console.log('[GoogleDrive] generateDefaultProjectName - files found:', files.length);
      
      // Extract numbers from "untitled N" pattern (remove .diedrico extension first)
      const untitledPattern = /^untitled (\d+)\.diedrico$/i;
      const numbers: number[] = [];
      
      for (const file of files) {
        const match = file.name.match(untitledPattern);
        if (match) {
          const num = parseInt(match[1], 10);
          console.log(`[GoogleDrive] Found untitled file: ${file.name} -> number ${num}`);
          numbers.push(num);
        }
      }
      
      console.log('[GoogleDrive] Extracted numbers:', numbers);
      
      // Find first available number (fill gaps before incrementing)
      if (numbers.length === 0) {
        console.log('[GoogleDrive] No untitled files found, returning "untitled 1"');
        return 'untitled 1';
      }
      
      // Sort numbers to find gaps
      numbers.sort((a, b) => a - b);
      
      // Check for gaps in sequence
      for (let i = 1; i <= numbers.length; i++) {
        if (!numbers.includes(i)) {
          console.log(`[GoogleDrive] Found gap at ${i}, returning "untitled ${i}"`);
          return `untitled ${i}`;
        }
      }
      
      // No gaps found, use next sequential number
      const nextNum = numbers.length + 1;
      console.log(`[GoogleDrive] No gaps, returning "untitled ${nextNum}"`);
      return `untitled ${nextNum}`;
    } catch (error) {
      console.error('Failed to generate default name, using "untitled 1":', error);
      return 'untitled 1';
    }
  }

  /**
   * Rename a .diedrico file (T300)
   */
  async renameFile(fileId: string, newName: string): Promise<void> {
    if (!this.isSignedIn()) {
      throw new Error('User not signed in');
    }

    // Validate new name
    if (!newName || !newName.trim()) {
      throw new Error('File name cannot be empty');
    }

    // File system reserved characters: / \ : * ? " < > |
    const invalidChars = /[\/\\:*?"<>|]/;
    if (invalidChars.test(newName)) {
      throw new Error('File name contains invalid characters');
    }

    const fileName = newName.endsWith('.diedrico')
      ? newName
      : `${newName}.diedrico`;

    try {
      await gapi.client.drive.files.update({
        fileId: fileId,
        resource: {
          name: fileName,
        },
      });
      
      console.log(`[GoogleDriveService] File renamed to: ${fileName}`);
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('Authentication expired. Please sign in again.');
      } else if (error.status === 404) {
        throw new Error('File not found. It may have been deleted.');
      }
      throw new Error(`Failed to rename file: ${error.message || error}`);
    }
  }

  /**
   * Delete a .diedrico file
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.isSignedIn()) {
      throw new Error('User not signed in');
    }

    try {
      await gapi.client.drive.files.delete({
        fileId: fileId,
      });
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }
}
