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
 */

/// <reference types="gapi" />
/// <reference types="gapi.client.drive-v3" />

import type { GoogleDriveConfig, GoogleDriveFile, GoogleUserProfile } from '@/application/appShell/DrivePortTypes';

interface TokenResponse { access_token?: unknown; expires_in?: unknown; error?: unknown }
interface TokenClient { requestAccessToken(config: { prompt: string }): void }
interface GoogleIdentityServices {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string; scope: string;
        callback: (response: TokenResponse) => void;
        error_callback: (error: { type?: string }) => void;
      }): TokenClient;
      revoke(accessToken: string, callback: (response: { successful?: boolean }) => void): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

interface ProjectNamePayload {
  name?: unknown;
}

function googleIdentityServices(): GoogleIdentityServices {
  const google = window.google;
  if (!google?.accounts?.oauth2) {
    throw new Error('Google Identity Services is not available');
  }
  return google;
}

function projectNameFromData(data: object): string | undefined {
  const name = (data as ProjectNamePayload).name;
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}

/**
 * Service for Google Drive operations
 */
export class GoogleDriveService {
  private static readonly DISCOVERY_DOCS = [
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  ];
  
  // T400: Add profile and email scopes for user profile information
  private static readonly SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
  
  private static readonly FOLDER_NAME = 'diedrico';
  private static readonly FILE_EXTENSION = '.diedrico';
  
  private config: GoogleDriveConfig;
  private initialized = false;
  private initialization: Promise<void> | null = null;
  private folderId: string | null = null;
  private folderCreation: Promise<string> | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private session = 0;
  private disconnected = false;
  private pendingSignIn: { resolve: () => void; reject: (error: Error) => void } | null = null;

  constructor(config: GoogleDriveConfig) { this.config = config; }

  initialize(): Promise<void> {
    if (this.initialized) return Promise.resolve();
    if (this.initialization) return this.initialization;
    this.initialization = this.initializeClient().finally(() => { this.initialization = null; });
    return this.initialization;
  }

  private async initializeClient(): Promise<void> {
    if (!this.config.clientId.trim()) throw new Error('Google Drive is not configured. Continue in local mode.');
    try {
      await new Promise<void>((resolve, reject) => {
        const deadline = Date.now() + 10000;
        const check = () => {
          if (typeof gapi !== 'undefined' && window.google?.accounts?.oauth2) resolve();
          else if (Date.now() >= deadline) reject(new Error('Google scripts unavailable'));
          else setTimeout(check, 50);
        };
        check();
      });
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Google client load timed out')), 10000);
        const finish = (error?: Error) => { clearTimeout(timer); if (error) reject(error); else resolve(); };
        gapi.load('client', { callback: () => finish(), onerror: () => finish(new Error('Google client failed to load')),
          timeout: 10000, ontimeout: () => finish(new Error('Google client load timed out')) });
      });
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Google client initialization timed out')), 10000);
        Promise.resolve(gapi.client.init({ discoveryDocs: GoogleDriveService.DISCOVERY_DOCS,
          ...(this.config.apiKey ? { apiKey: this.config.apiKey } : {}) }))
          .then(() => resolve(), reject).finally(() => clearTimeout(timer));
      });
      this.initialized = true;
      // Never request consent on startup: prompt:'' is not a no-popup guarantee.
    } catch {
      throw new Error('Google Drive unavailable: check network or blocked Google scripts, then retry Sign in.');
    }
  }

  private clearExpiredAuthentication(): void {
    this.session++;
    this.disconnected = true;
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.folderId = null;
    this.folderCreation = null;
    if (typeof gapi !== 'undefined' && gapi.client) gapi.client.setToken(null);
    // Restoration marker is legacy optional metadata, never an authentication owner.
    try { localStorage.removeItem('diedrico_was_signed_in'); } catch { /* storage may be disabled */ }
  }

  isSignedIn(): boolean {
    if (this.tokenExpiresAt !== null && Date.now() >= this.tokenExpiresAt) this.clearExpiredAuthentication();
    if (this.disconnected) return false;
    const token = typeof gapi !== 'undefined' && gapi.client ? gapi.client.getToken() : null;
    return Boolean(this.accessToken || (typeof token?.access_token === 'string' && token.access_token.length > 0));
  }

  async signIn(): Promise<void> {
    const session = this.session;
    await this.initialize();
    if (session !== this.session) throw new Error('Sign-in cancelled');
    if (this.pendingSignIn) throw new Error('Sign-in already in progress');
    return new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        this.pendingSignIn = null;
        if (error) { this.session++; reject(error); } else resolve();
      };
      const timeout = setTimeout(() => finish(new Error('Sign-in timed out. Retry from the Sign in button.')), 60000);
      this.pendingSignIn = { resolve, reject: error => finish(error) };
      try {
        const client = googleIdentityServices().accounts.oauth2.initTokenClient({
          client_id: this.config.clientId, scope: GoogleDriveService.SCOPES,
          callback: response => {
            if (!this.pendingSignIn || session !== this.session) return;
            try {
              if (response?.error) {
                finish(new Error(response.error === 'access_denied' ? 'Access denied. Please grant permission to access Google Drive.' : 'Google authorization failed.'));
                return;
              }
              const token = this.requireAccessToken(response);
              this.clearExpiredAuthentication();
              gapi.client.setToken({ access_token: token });
              this.accessToken = token;
              this.disconnected = false;
              this.tokenExpiresAt = typeof response.expires_in === 'number' && Number.isFinite(response.expires_in)
                ? Date.now() + Math.max(0, response.expires_in) * 1000 : null;
              finish();
            } catch { finish(new Error('Google authorization failed or returned an invalid response. Please sign in again.')); }
          },
          error_callback: error => {
            if (!this.pendingSignIn || session !== this.session) return;
            finish(new Error(error.type === 'popup_closed' ? 'Sign-in cancelled by user' :
              error.type === 'popup_failed_to_open' ? 'Sign-in popup blocked. Allow popups and retry.' : 'Sign-in popup failed. Please retry.'));
          },
        });
        client.requestAccessToken({ prompt: '' });
      } catch { finish(new Error('Sign-in could not start. Please retry.')); }
    });
  }

  private requireAccessToken(response: TokenResponse): string {
    if (!response || typeof response.access_token !== 'string' || !response.access_token.trim()) throw new Error('Invalid token response');
    return response.access_token;
  }

  /** Local disconnect only. No claim of server-side grant revocation. */
  async signOut(): Promise<void> {
    this.pendingSignIn?.reject(new Error('Sign-in cancelled by sign-out'));
    this.clearExpiredAuthentication();
  }

  /**
   * T401: Fetch user profile information from Google
   * Uses the OAuth2 userinfo endpoint to get profile data
   */
  async fetchUserProfile(): Promise<GoogleUserProfile> {
    if (!this.isSignedIn()) {
      throw new Error('User not signed in');
    }

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) this.clearExpiredAuthentication();
        throw { status: response.status };
      }

      const data = await response.json();
      
      return {
        name: data.name || data.email, // Fallback to email if name not available
        email: data.email,
        picture: data.picture,
        sub: data.id,
      };
    } catch (error: unknown) { throw this.driveError(error, 'fetch user profile'); }
  }

  /**
   * Get or create the "diedrico" folder in user's Drive
   */
  private assertSession(session: number): void {
    if (session !== this.session || !this.isSignedIn()) throw new Error('Authentication changed. Please sign in again.');
  }

  private async findFolder(session: number): Promise<string | null> {
    if (this.folderId) return this.folderId;
    let pageToken: string | undefined;
    do {
      const response = await gapi.client.drive.files.list({
        q: `name='${GoogleDriveService.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'nextPageToken,files(id,name)', spaces: 'drive', pageToken,
      });
      this.assertSession(session);
      const id = response.result.files?.[0]?.id;
      if (id) return (this.folderId = id);
      pageToken = response.result.nextPageToken;
    } while (pageToken);
    return null;
  }

  private async getDiedricoFolderId(): Promise<string> {
    if (this.folderCreation) return this.folderCreation;
    const session = this.session;
    const pending = (async () => {
      const found = await this.findFolder(session);
      if (found) return found;
      this.assertSession(session);
      const response = await gapi.client.drive.files.create({
        resource: { name: GoogleDriveService.FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }, fields: 'id',
      });
      this.assertSession(session);
      if (!response.result.id) throw new Error('Drive did not return a folder ID');
      return (this.folderId = response.result.id);
    })();
    this.folderCreation = pending;
    try { return await pending; }
    finally { if (this.folderCreation === pending) this.folderCreation = null; }
  }

  /** Listing is read-only, including when no app folder exists yet. */
  async listFiles(): Promise<GoogleDriveFile[]> {
    if (!this.isSignedIn()) throw new Error('User not signed in');
    const session = this.session;
    try {
      const folderId = await this.findFolder(session);
      if (!folderId) return [];
      const files: GoogleDriveFile[] = [];
      let pageToken: string | undefined;
      do {
        const response = await gapi.client.drive.files.list({
          q: `'${folderId}' in parents and name contains '${GoogleDriveService.FILE_EXTENSION}' and trashed=false`,
          fields: 'nextPageToken,files(id,name,modifiedTime)', orderBy: 'modifiedTime desc', spaces: 'drive', pageToken,
        });
        this.assertSession(session);
        for (const file of response.result.files || []) {
          if (file.id && file.name?.endsWith(GoogleDriveService.FILE_EXTENSION)) files.push({
            id: file.id, name: file.name, modifiedTime: file.modifiedTime || '',
          });
        }
        pageToken = response.result.nextPageToken;
      } while (pageToken);
      return files;
    } catch (error: unknown) { throw this.driveError(error, 'list files'); }
  }

  private driveError(error: unknown, operation: string): Error {
    const status = (error as { status?: number; result?: { error?: { code?: number } } } | null)?.status
      ?? (error as { result?: { error?: { code?: number } } } | null)?.result?.error?.code;
    if (status === 401) { this.clearExpiredAuthentication(); return new Error('Authentication expired. Please sign in again.'); }
    if (status === 403) return new Error('Permission denied or storage quota exceeded.');
    if (status === 404) return new Error('File not found. It may have been deleted.');
    if (!navigator.onLine) return new Error('No internet connection. Work remains local; retry when connected.');
    return new Error(`Failed to ${operation}. Check the connection and retry. Remote effects may be unknown.`);
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

    const session = this.session;
    try {
      const folderId = await this.getDiedricoFolderId();
      this.assertSession(session);

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
    } catch (error: unknown) { throw this.driveError(error, 'create file'); }
  }

  /**
   * Load a .diedrico file by ID
   */
  async loadFile(fileId: string): Promise<object> {
    if (!this.isSignedIn()) {
      throw new Error('User not signed in');
    }

    try {
      // Check metadata first to verify file exists and is not trashed
      // T409: Fix "Ghost files" loading from trash
      const metaResponse = await gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'trashed, explicitlyTrashed'
      });

      if (metaResponse.result.trashed) {
        const error: any = new Error('File not found. It may have been deleted (in trash).');
        error.status = 404; // Mimic 404 behavior for App.vue handling
        throw error;
      }

      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });

      // The response.body contains the JSON string
      return JSON.parse(response.body);
    } catch (error: unknown) { throw this.driveError(error, 'load file'); }
  }

  /**
   * Update an existing .diedrico file
   */
  async updateFile(fileId: string, data: object): Promise<void> {
    if (!this.isSignedIn()) {
      throw new Error('User not signed in');
    }

    try {
      // First, check if file exists and is not trashed
      const fileCheckRequest = gapi.client.request({
        path: `/drive/v3/files/${fileId}`,
        method: 'GET',
        params: { fields: 'id,name,trashed' }
      });
      
      const fileCheckResponse = await fileCheckRequest;
      if (fileCheckResponse.result.trashed) {
        console.warn('[GoogleDrive] File is in trash, throwing error');
        throw { status: 404 };
      }

      const fileContent = JSON.stringify(data, null, 2);

      // Create multipart request body
      const boundary = '-------314159265358979323846';
      const delimiter = '\r\n--' + boundary + '\r\n';
      const closeDelimiter = '\r\n--' + boundary + '--';

      // Create metadata part
      const rawName = projectNameFromData(data);
      const fullFileName = rawName && !rawName.endsWith(GoogleDriveService.FILE_EXTENSION) 
        ? `${rawName}${GoogleDriveService.FILE_EXTENSION}` 
        : rawName;

      const metadata = {
        name: fullFileName
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) + '\r\n' +
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
    } catch (error: unknown) { throw this.driveError(error, 'save file'); }
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
      // Extract numbers from "untitled N" pattern (remove .diedrico extension first)
      const untitledPattern = /^untitled (\d+)\.diedrico$/i;
      const numbers: number[] = [];
      
      for (const file of files) {
        const match = file.name.match(untitledPattern);
        if (match) {
          const num = parseInt(match[1], 10);
          numbers.push(num);
        }
      }
      
      // Find first available number (fill gaps before incrementing)
      if (numbers.length === 0) {
        return 'untitled 1';
      }
      
      // Sort numbers to find gaps
      numbers.sort((a, b) => a - b);
      
      // Check for gaps in sequence
      for (let i = 1; i <= numbers.length; i++) {
        if (!numbers.includes(i)) {
          return `untitled ${i}`;
        }
      }
      
      // No gaps found, use next sequential number
      const nextNum = numbers.length + 1;
      return `untitled ${nextNum}`;
    } catch (error) {
      throw this.driveError(error, 'generate project name');
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
      
    } catch (error: unknown) { throw this.driveError(error, 'rename file'); }
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
    } catch (error: unknown) { throw this.driveError(error, 'delete file'); }
  }
}
