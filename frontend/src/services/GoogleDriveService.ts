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
  apiKey: string;
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
  private folderId: string | null = null;

  constructor(config: GoogleDriveConfig) {
    this.config = config;
  }

  /**
   * Initialize Google API client
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    return new Promise((resolve, reject) => {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            apiKey: this.config.apiKey,
            clientId: this.config.clientId,
            discoveryDocs: GoogleDriveService.DISCOVERY_DOCS,
            scope: GoogleDriveService.SCOPES,
          });

          this.initialized = true;
          resolve();
        } catch (error) {
          reject(new Error(`Failed to initialize Google API: ${error}`));
        }
      });
    });
  }

  /**
   * Check if user is signed in
   */
  isSignedIn(): boolean {
    if (!this.initialized) {
      return false;
    }
    return gapi.auth2.getAuthInstance().isSignedIn.get();
  }

  /**
   * Sign in with Google
   */
  async signIn(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await gapi.auth2.getAuthInstance().signIn();
    } catch (error) {
      throw new Error(`Failed to sign in: ${error}`);
    }
  }

  /**
   * Sign out from Google
   */
  async signOut(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await gapi.auth2.getAuthInstance().signOut();
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
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`);
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
    } catch (error) {
      throw new Error(`Failed to load file: ${error}`);
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
    } catch (error) {
      throw new Error(`Failed to update file: ${error}`);
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
