/**
 * Unit tests for GoogleDriveService
 * 
 * Tests Google Drive API integration without making actual API calls.
 * Uses mocks for gapi client library.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleDriveService } from '../../../src/infrastructure/googleDrive/GoogleDriveService';

// Mock token client for Google Identity Services
const mockTokenClient = {
  callback: null as any,
  requestAccessToken: vi.fn(),
};

// Mock gapi global (new GIS API)
const mockGapi = {
  load: vi.fn(),
  client: {
    init: vi.fn(),
    getToken: vi.fn(),
    setToken: vi.fn(),
    drive: {
      files: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
    },
    request: vi.fn(),
  },
};

// Mock Google Identity Services
const mockGoogle = {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn(),
      revoke: vi.fn(),
    },
  },
};

// Setup global mocks
global.gapi = mockGapi as any;
(global as any).google = mockGoogle;

describe('GoogleDriveService', () => {
  let service: GoogleDriveService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Clear localStorage
    localStorage.clear();

    // Setup gapi.load to call callback immediately
    mockGapi.load.mockImplementation((api: string, callback: () => void) => {
      if (typeof callback === 'function') callback(); else (callback as any).callback();
    });
    
    // Setup gapi.client.init to resolve
    mockGapi.client.init.mockResolvedValue(undefined);
    
    // Setup gapi.client.getToken to return null by default
    mockGapi.client.getToken.mockReturnValue(null);
    
    // Setup initTokenClient to return mock token client
    mockGoogle.accounts.oauth2.initTokenClient.mockImplementation(config => {
      mockTokenClient.callback = config.callback;
      (mockTokenClient as any).error_callback = config.error_callback;
      return mockTokenClient;
    });
    
    // Setup revoke to resolve
    mockGoogle.accounts.oauth2.revoke.mockResolvedValue(undefined);
    
    // Reset token client
    mockTokenClient.callback = null;
    mockTokenClient.requestAccessToken.mockClear();

    // Create service instance
    service = new GoogleDriveService({
      clientId: 'test-client-id',
      apiKey: 'test-api-key',
      appId: 'test-app-id',
    });
  });
  
  // Helper function to simulate successful sign-in
  async function signInHelper() {
    const signInPromise = service.signIn();
    await Promise.resolve();
    if (mockTokenClient.callback) {
      mockTokenClient.callback({ access_token: 'test-token' });
    }
    await signInPromise;
    mockGapi.client.getToken.mockReturnValue({ access_token: 'test-token' });
  }

  describe('lifecycle contract', () => {
    it('serializes folder creation and invalidates cached ownership on disconnect', async () => {
      await service.initialize(); await signInHelper();
      let finish!: (value: unknown) => void;
      mockGapi.client.drive.files.list.mockResolvedValue({ result: { files: [] } });
      mockGapi.client.drive.files.create.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
      mockGapi.client.request.mockResolvedValue({ result: { id: 'created' } });
      const first = service.createFile('A', {});
      const second = service.createFile('B', {});
      await Promise.resolve(); await Promise.resolve();
      expect(mockGapi.client.drive.files.create).toHaveBeenCalledTimes(1);
      finish({ result: { id: 'shared-folder' } });
      await Promise.all([first, second]);
      expect(mockGapi.client.request).toHaveBeenCalledTimes(2);
      await service.signOut();
      await signInHelper();
      mockGapi.client.drive.files.list.mockClear();
      expect(await service.listFiles()).toEqual([]);
      expect(mockGapi.client.drive.files.list).toHaveBeenCalledTimes(1);
    });

    it('does not adopt or upload after a folder lookup crosses account ownership', async () => {
      await service.initialize(); await signInHelper();
      let finish!: (value: unknown) => void;
      mockGapi.client.drive.files.list.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
      const pending = service.createFile('A', {});
      await service.signOut();
      finish({ result: { files: [{ id: 'old-folder' }] } });
      await expect(pending).rejects.toThrow('Failed to create');
      expect(mockGapi.client.request).not.toHaveBeenCalled();
      expect(mockGapi.client.drive.files.create).not.toHaveBeenCalled();
    });

    it('settles token-install failure without leaking provider text and permits retry', async () => {
      await service.initialize();
      const pending = service.signIn(); await Promise.resolve();
      mockGapi.client.setToken.mockImplementationOnce(() => { throw new Error('private-token-fixture'); });
      expect(() => mockTokenClient.callback({ access_token: 'private-token-fixture' })).not.toThrow();
      await expect(pending).rejects.toThrow('invalid response');
      const retry = service.signIn(); await Promise.resolve();
      mockTokenClient.callback({ access_token: 'fixture' }); await retry;
    });

    it('shares initialization completion and retries after failure', async () => {
      let finish!: () => void;
      mockGapi.client.init.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
      const first = service.initialize();
      const second = service.initialize();
      expect(first).toBe(second);
      await Promise.resolve(); await Promise.resolve();
      finish(); await Promise.all([first, second]);
      const retry = new GoogleDriveService({ clientId: 'fixture', appId: '' });
      mockGapi.client.init.mockRejectedValueOnce(new Error('private provider payload'));
      await expect(retry.initialize()).rejects.toThrow('unavailable');
      await retry.initialize();
    });

    it.each(['popup_failed_to_open', 'popup_closed', 'unknown'])('settles %s and permits a gesture retry', async type => {
      await service.initialize();
      const pending = service.signIn(); await Promise.resolve();
      (mockTokenClient as any).error_callback({ type });
      await expect(pending).rejects.toThrow(/popup|cancelled/);
      const retry = service.signIn(); await Promise.resolve();
      mockTokenClient.callback({ access_token: 'fixture' }); await retry;
    });

    it.each([{}, null, { access_token: '' }, { error: 'provider-private-detail' }])('contains malformed/denied callback %j', async response => {
      await service.initialize();
      const pending = service.signIn(); await Promise.resolve();
      expect(() => mockTokenClient.callback(response)).not.toThrow();
      await expect(pending).rejects.toThrow(/authorization/);
    });

    it('cancels sign-in on local disconnect and ignores the late callback', async () => {
      await service.initialize();
      const pending = service.signIn(); await Promise.resolve();
      const callback = mockTokenClient.callback;
      await service.signOut();
      await expect(pending).rejects.toThrow('cancelled');
      callback({ access_token: 'late-fixture' });
      expect(service.isSignedIn()).toBe(false);
      expect(mockGoogle.accounts.oauth2.revoke).not.toHaveBeenCalled();
    });

    it('does not create a folder when listing an empty Drive', async () => {
      await service.initialize(); await signInHelper();
      mockGapi.client.drive.files.list.mockResolvedValueOnce({ result: { files: [] } });
      expect(await service.listFiles()).toEqual([]);
      expect(mockGapi.client.drive.files.create).not.toHaveBeenCalled();
    });

    it('reads folder and file pagination without scope expansion', async () => {
      await service.initialize(); await signInHelper();
      mockGapi.client.drive.files.list
        .mockResolvedValueOnce({ result: { files: [], nextPageToken: 'folder-page' } })
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder' }] } })
        .mockResolvedValueOnce({ result: { files: [{ id: 'a', name: 'a.diedrico' }], nextPageToken: 'file-page' } })
        .mockResolvedValueOnce({ result: { files: [{ id: 'b', name: 'b.diedrico' }] } });
      expect((await service.listFiles()).map(file => file.id)).toEqual(['a', 'b']);
      expect(mockGapi.client.drive.files.list).toHaveBeenNthCalledWith(2, expect.objectContaining({ pageToken: 'folder-page' }));
      expect(mockGapi.client.drive.files.list).toHaveBeenNthCalledWith(4, expect.objectContaining({ pageToken: 'file-page' }));
      expect(mockGoogle.accounts.oauth2.initTokenClient).toHaveBeenCalledWith(expect.objectContaining({ callback: expect.any(Function), error_callback: expect.any(Function) }));
    });

    it('waits for delayed GIS and bounds blocked scripts', async () => {
      vi.useFakeTimers();
      const google = (window as any).google;
      try {
        (window as any).google = undefined;
        const pending = service.initialize();
        await vi.advanceTimersByTimeAsync(100);
        expect(mockGapi.client.init).not.toHaveBeenCalled();
        (window as any).google = google;
        await vi.advanceTimersByTimeAsync(50); await pending;
        const blocked = new GoogleDriveService({ clientId: 'fixture', appId: '' });
        (window as any).google = undefined;
        const failure = expect(blocked.initialize()).rejects.toThrow('unavailable');
        await vi.advanceTimersByTimeAsync(10000); await failure;
      } finally { (window as any).google = google; vi.useRealTimers(); }
    });

    it.each(['onerror', 'ontimeout'])('settles gapi.load %s and allows retry', async event => {
      mockGapi.load.mockImplementationOnce((_api, config: any) => config[event]());
      await expect(service.initialize()).rejects.toThrow('unavailable');
      await service.initialize();
    });

    it('sanitizes provider bodies and tolerates unavailable optional marker storage', async () => {
      await service.initialize();
      const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('storage blocked'); });
      try {
        await signInHelper();
        mockGapi.client.drive.files.get.mockRejectedValueOnce({ status: 500, message: 'private-token-fixture' });
        await expect(service.loadFile('fixture')).rejects.not.toThrow('private-token-fixture');
        await service.signOut();
      } finally { remove.mockRestore(); }
    });
  });

  describe('initialize', () => {
    it('should initialize Google API client', async () => {
      await service.initialize();

      expect(mockGapi.load).toHaveBeenCalledWith('client', expect.objectContaining({ callback: expect.any(Function) }));
      expect(mockGapi.client.init).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
      expect(mockGoogle.accounts.oauth2.initTokenClient).not.toHaveBeenCalled();
    });

    it('should only initialize once', async () => {
      await service.initialize();
      await service.initialize();

      expect(mockGapi.load).toHaveBeenCalledTimes(1);
    });

    it('should throw error if initialization fails', async () => {
      mockGapi.client.init.mockRejectedValue(new Error('Init failed'));

      await expect(service.initialize()).rejects.toThrow('Google Drive unavailable');
    });
  });

  describe('isSignedIn', () => {
    it('should return false when not initialized', () => {
      expect(service.isSignedIn()).toBe(false);
    });

    it('clears a restored gapi-only session on sign-out', async () => {
      await service.initialize();
      mockGapi.client.getToken.mockReturnValue({ access_token: 'restored-fixture' });
      mockGapi.client.setToken.mockImplementation(value => mockGapi.client.getToken.mockReturnValue(value));
      await service.signOut();
      expect(service.isSignedIn()).toBe(false);
    });

    it('expires an issued token at its supplied lifetime without refreshing or issuing Drive writes', async () => {
      await service.initialize();
      const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
      const pending = service.signIn();
      await Promise.resolve();
      mockTokenClient.callback({ access_token: 'expiry-fixture', expires_in: 2 });
      await pending;
      expect(service.isSignedIn()).toBe(true);
      now.mockReturnValue(3000);
      expect(service.isSignedIn()).toBe(false);
      expect(mockGapi.client.setToken).toHaveBeenLastCalledWith(null);
      now.mockRestore();
    });

    it('rejects restored empty tokens', async () => {
      await service.initialize();
      mockGapi.client.getToken.mockReturnValue({ access_token: '' });
      expect(service.isSignedIn()).toBe(false);
    });

    it('should return true when user is signed in', async () => {
      await service.initialize();
      
      // Mock that we have a token
      mockGapi.client.getToken.mockReturnValue({ access_token: 'test-token' });

      expect(service.isSignedIn()).toBe(true);
    });

    it('should return false when user is not signed in', async () => {
      await service.initialize();
      
      // Mock that we don't have a token
      mockGapi.client.getToken.mockReturnValue(null);

      expect(service.isSignedIn()).toBe(false);
    });
  });

  describe('authentication lifetime and restoration', () => {
    it('does not request consent automatically even with a previous session marker', async () => {
      localStorage.setItem('diedrico_was_signed_in', 'true');
      await service.initialize();
      expect(mockTokenClient.requestAccessToken).not.toHaveBeenCalled();
    });

    it('clears authentication on a Drive 401 without retrying', async () => {
      await service.initialize();
      await signInHelper();
      mockGapi.client.setToken.mockImplementation(value => mockGapi.client.getToken.mockReturnValue(value));
      mockGapi.client.drive.files.get.mockRejectedValueOnce({ status: 401 });
      await expect(service.loadFile('fixture')).rejects.toThrow('Authentication expired');
      expect(service.isSignedIn()).toBe(false);
      expect(localStorage.getItem('diedrico_was_signed_in')).toBeNull();
      expect(mockGapi.client.drive.files.get).toHaveBeenCalledTimes(1);
    });

    it('clears authentication on a profile 401', async () => {
      await service.initialize();
      await signInHelper();
      mockGapi.client.setToken.mockImplementation(value => mockGapi.client.getToken.mockReturnValue(value));
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' } as Response);
      await expect(service.fetchUserProfile()).rejects.toThrow('Authentication expired');
      expect(service.isSignedIn()).toBe(false);
      fetchMock.mockRestore();
    });
  });

  describe('signIn', () => {
    it('should initialize and sign in user', async () => {
      // Initialize first to avoid race condition
      await service.initialize();
      
      // Start sign-in (will set up callback)
      const signInPromise = service.signIn();
    await Promise.resolve();
      
      // Simulate successful token response
      if (mockTokenClient.callback) {
        mockTokenClient.callback({ access_token: 'test-token' });
      }
      
      await signInPromise;

      expect(mockGapi.load).toHaveBeenCalled();
      expect(mockTokenClient.requestAccessToken).toHaveBeenCalled();
      expect(mockGapi.client.setToken).toHaveBeenCalledWith({ access_token: 'test-token' });
    });

    it('should throw user-friendly error when popup is closed', async () => {
      // Initialize first to avoid race condition
      await service.initialize();
      
      const signInPromise = service.signIn();
    await Promise.resolve();
      
      // Simulate popup closed error
      if (mockTokenClient.callback) {
        (mockTokenClient as any).error_callback({ type: 'popup_closed' });
      }

      await expect(signInPromise).rejects.toThrow('Sign-in cancelled by user');
    });

    it('should throw user-friendly error when access is denied', async () => {
      // Initialize first to avoid race condition
      await service.initialize();
      
      const signInPromise = service.signIn();
    await Promise.resolve();
      
      // Simulate access denied error
      if (mockTokenClient.callback) {
        mockTokenClient.callback({ error: 'access_denied' });
      }

      await expect(signInPromise).rejects.toThrow('Access denied');
    });
  });

  describe('signOut', () => {
    it('should sign out user', async () => {
      await service.initialize();
      
      // Sign in first
      const signInPromise = service.signIn();
    await Promise.resolve();
      if (mockTokenClient.callback) {
        mockTokenClient.callback({ access_token: 'test-token' });
      }
      await signInPromise;
      
      // Now sign out
      await service.signOut();

      expect(mockGapi.client.setToken).toHaveBeenCalledWith(null);
    });

    it('should not throw if not initialized', async () => {
      await expect(service.signOut()).resolves.not.toThrow();
    });
  });

  describe('listFiles', () => {
    beforeEach(async () => {
      await service.initialize();
      
      // Sign in
      const signInPromise = service.signIn();
    await Promise.resolve();
      if (mockTokenClient.callback) {
        mockTokenClient.callback({ access_token: 'test-token' });
      }
      await signInPromise;

      // Mock folder lookup
      mockGapi.client.drive.files.list.mockResolvedValueOnce({
        result: {
          files: [{ id: 'folder-123', name: 'diedrico' }],
        },
      });
    });

    it('should list .diedrico files from diedrico folder', async () => {
      const mockFiles = [
        { id: 'file-1', name: 'project1.diedrico', modifiedTime: '2026-01-06T10:00:00Z' },
        { id: 'file-2', name: 'project2.diedrico', modifiedTime: '2026-01-05T10:00:00Z' },
      ];

      mockGapi.client.drive.files.list.mockResolvedValueOnce({
        result: { files: mockFiles },
      });

      const files = await service.listFiles();

      expect(files).toHaveLength(2);
      expect(files[0]).toEqual({
        id: 'file-1',
        name: 'project1.diedrico',
        modifiedTime: '2026-01-06T10:00:00Z',
      });
    });

    it('should return empty array when no files exist', async () => {
      mockGapi.client.drive.files.list.mockResolvedValueOnce({
        result: { files: [] },
      });

      const files = await service.listFiles();

      expect(files).toEqual([]);
    });

    it('should throw error when not signed in', async () => {
      // Sign out to clear auth state
      await service.signOut();
      mockGapi.client.getToken.mockReturnValue(null);
      
      await expect(service.listFiles()).rejects.toThrow('User not signed in');
    });

    it('should handle authentication expired error', async () => {
      mockGapi.client.drive.files.list.mockReset();
      mockGapi.client.getToken.mockReturnValue({ access_token: 'test-token' });
      
      // First call succeeds (folder lookup), second call fails (list files)
      mockGapi.client.drive.files.list
        .mockResolvedValueOnce({
          result: {
            files: [{ id: 'folder-123', name: 'diedrico' }],
          },
        })
        .mockRejectedValueOnce({ status: 401 });

      await expect(service.listFiles()).rejects.toThrow('Authentication expired');
    });
  });

  describe('createFile', () => {
    beforeEach(async () => {
      await service.initialize();
      await signInHelper();

      // Mock folder lookup
      mockGapi.client.drive.files.list.mockResolvedValue({
        result: {
          files: [{ id: 'folder-123', name: 'diedrico' }],
        },
      });
    });

    it('should create .diedrico file with data', async () => {
      const mockData = { id: 'proj-1', name: 'Test Project' };
      
      // Mock folder lookup to return existing folder
      mockGapi.client.drive.files.list.mockResolvedValue({
        result: {
          files: [{ id: 'folder-123', name: 'diedrico' }],
        },
      });
      
      mockGapi.client.request.mockResolvedValue({
        result: { id: 'file-123' },
      });

      const fileId = await service.createFile('test-project', mockData);

      expect(fileId).toBe('file-123');
      expect(mockGapi.client.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/upload/drive/v3/files',
          method: 'POST',
        })
      );
    });

    it('should add .diedrico extension if missing', async () => {
      mockGapi.client.drive.files.list.mockResolvedValue({
        result: {
          files: [{ id: 'folder-123', name: 'diedrico' }],
        },
      });
      
      mockGapi.client.request.mockResolvedValue({
        result: { id: 'file-123' },
      });

      await service.createFile('test-project', {});

      const requestCall = mockGapi.client.request.mock.calls[0][0];
      expect(requestCall.body).toContain('test-project.diedrico');
    });

    it('should not duplicate .diedrico extension', async () => {
      // Mock folder lookup
      mockGapi.client.drive.files.list.mockResolvedValue({
        result: {
          files: [{ id: 'folder-123', name: 'diedrico' }],
        },
      });
      
      mockGapi.client.request.mockResolvedValue({
        result: { id: 'file-123' },
      });

      await service.createFile('test-project.diedrico', {});

      const requestCall = mockGapi.client.request.mock.calls[0][0];
      // Should only contain one .diedrico extension
      const extensionCount = (requestCall.body.match(/\.diedrico/g) || []).length;
      expect(extensionCount).toBe(1);
    });

    it('should throw error when not signed in', async () => {
      // Sign out to clear auth state
      await service.signOut();
      mockGapi.client.getToken.mockReturnValue(null);

      await expect(service.createFile('test', {})).rejects.toThrow('User not signed in');
    });
  });

  describe('loadFile', () => {
    beforeEach(async () => {
      await service.initialize();
      await signInHelper();
    });

    it('should load and parse .diedrico file', async () => {
      const mockData = { id: 'proj-1', name: 'Test Project' };
      
      // Mock metadata check (first call to files.get)
      mockGapi.client.drive.files.get.mockResolvedValueOnce({
        result: {
          trashed: false,
          explicitlyTrashed: false,
        },
      });
      
      // Mock file content retrieval (second call to files.get)
      mockGapi.client.drive.files.get.mockResolvedValueOnce({
        body: JSON.stringify(mockData),
      });

      const data = await service.loadFile('file-123');

      expect(data).toEqual(mockData);
      expect(mockGapi.client.drive.files.get).toHaveBeenCalledTimes(2);
      // First call: metadata check
      expect(mockGapi.client.drive.files.get).toHaveBeenNthCalledWith(1, {
        fileId: 'file-123',
        fields: 'trashed, explicitlyTrashed',
      });
      // Second call: content retrieval
      expect(mockGapi.client.drive.files.get).toHaveBeenNthCalledWith(2, {
        fileId: 'file-123',
        alt: 'media',
      });
    });

    it('should throw error for file not found', async () => {
      mockGapi.client.drive.files.get.mockRejectedValue({ status: 404 });

      await expect(service.loadFile('file-123')).rejects.toThrow('File not found');
    });

    it('should throw error when not signed in', async () => {
      // Sign out to clear auth state
      await service.signOut();
      mockGapi.client.getToken.mockReturnValue(null);

      await expect(service.loadFile('file-123')).rejects.toThrow('User not signed in');
    });
  });

  describe('updateFile', () => {
    beforeEach(async () => {
      await service.initialize();
      await signInHelper();
    });

    it('should update .diedrico file with new data', async () => {
      const mockData = { id: 'proj-1', name: 'Updated Project' };
      
      // Mock file status check (first request call)
      mockGapi.client.request.mockResolvedValueOnce({
        result: {
          id: 'file-123',
          name: 'Old Name.diedrico',
          trashed: false,
        },
      });
      
      // Mock file update (second request call)
      mockGapi.client.request.mockResolvedValueOnce({});

      await service.updateFile('file-123', mockData);

      expect(mockGapi.client.request).toHaveBeenCalledTimes(2);
      // First call: status check
      expect(mockGapi.client.request).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          path: '/drive/v3/files/file-123',
          method: 'GET',
        })
      );
      // Second call: file update
      expect(mockGapi.client.request).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          path: '/upload/drive/v3/files/file-123',
          method: 'PATCH',
          body: expect.stringContaining('"name":"Updated Project.diedrico"')
        })
      );
    });

    it('should handle quota exceeded error', async () => {
      mockGapi.client.request.mockRejectedValue({ status: 403 });

      await expect(service.updateFile('file-123', {})).rejects.toThrow('quota');
    });

    it('should throw error when not signed in', async () => {
      // Sign out to clear auth state
      await service.signOut();
      mockGapi.client.getToken.mockReturnValue(null);

      await expect(service.updateFile('file-123', {})).rejects.toThrow('User not signed in');
    });
  });

  describe('deleteFile', () => {
    beforeEach(async () => {
      await service.initialize();
      await signInHelper();
    });

    it('should delete .diedrico file', async () => {
      mockGapi.client.drive.files.delete.mockResolvedValue({});

      await service.deleteFile('file-123');

      expect(mockGapi.client.drive.files.delete).toHaveBeenCalledWith({
        fileId: 'file-123',
      });
    });

    it('should throw error when not signed in', async () => {
      // Sign out to clear auth state
      await service.signOut();
      mockGapi.client.getToken.mockReturnValue(null);

      await expect(service.deleteFile('file-123')).rejects.toThrow('User not signed in');
    });
  });

  describe('fetchUserProfile', () => {
    beforeEach(async () => {
      await service.initialize();
      await signInHelper();
      // Access token is now set by signInHelper
    });

    it('should fetch user profile from Google userinfo API', async () => {
      const mockProfileData = {
        id: 'google-user-123',
        name: 'John Doe',
        email: 'john@example.com',
        picture: 'https://example.com/avatar.jpg',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockProfileData,
      } as Response);

      const profile = await service.fetchUserProfile();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: 'Bearer test-token',
          },
        }
      );

      expect(profile).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        picture: 'https://example.com/avatar.jpg',
        sub: 'google-user-123',
      });
    });

    it('should use email as fallback when name not available', async () => {
      const mockProfileData = {
        id: 'google-user-123',
        email: 'john@example.com',
        picture: 'https://example.com/avatar.jpg',
        // name missing
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockProfileData,
      } as Response);

      const profile = await service.fetchUserProfile();

      expect(profile.name).toBe('john@example.com');
    });

    it('should throw error when not signed in', async () => {
      // Sign out to clear auth state
      await service.signOut();
      mockGapi.client.getToken.mockReturnValue(null);

      await expect(service.fetchUserProfile()).rejects.toThrow('User not signed in');
    });

    it('should throw error on HTTP error response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      // Service transforms 401 errors to "Authentication expired"
      await expect(service.fetchUserProfile()).rejects.toThrow('Authentication expired');
    });

    it('should handle authentication expiry', async () => {
      global.fetch = vi.fn().mockRejectedValue({ status: 401 });

      await expect(service.fetchUserProfile()).rejects.toThrow('Authentication expired');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.fetchUserProfile()).rejects.toThrow('Failed to fetch user profile.');
    });
  });
});
