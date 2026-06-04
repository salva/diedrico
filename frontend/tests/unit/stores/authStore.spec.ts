import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../../../src/stores/authStore';
import type { GoogleUserProfile } from '../../../src/application/appShell/DrivePortTypes';

describe('authStore', () => {
  const mockProfile: GoogleUserProfile = {
    name: 'John Doe',
    email: 'john@example.com',
    picture: 'https://example.com/avatar.jpg',
    sub: 'google-user-123',
  };

  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore().clearAuth();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('sets and clears authentication state', () => {
    const store = useAuthStore();
    store.setAuthenticated(mockProfile, 'token');
    expect(store.isAuthenticated.value).toBe(true);
    expect(store.user.value).toEqual(mockProfile);
    expect(store.accessToken.value).toBe('token');
    expect(sessionStorage.getItem('diedrico_access_token')).toBe('token');
    store.clearAuth();
    expect(store.isAuthenticated.value).toBe(false);
    expect(store.user.value).toBeNull();
    expect(store.accessToken.value).toBeNull();
  });

  it('restores valid sessions and rejects expired/corrupt sessions', () => {
    const store = useAuthStore();
    sessionStorage.setItem('diedrico_access_token', 'token');
    sessionStorage.setItem('diedrico_user_profile', JSON.stringify(mockProfile));
    expect(store.restoreSession()).toBe(true);
    expect(store.user.value).toEqual(mockProfile);

    store.clearAuth();
    sessionStorage.setItem('diedrico_access_token', 'expired');
    sessionStorage.setItem('diedrico_user_profile', JSON.stringify(mockProfile));
    sessionStorage.setItem('diedrico_token_expiry', new Date(Date.now() - 1000).toISOString());
    expect(store.restoreSession()).toBe(false);

    sessionStorage.setItem('diedrico_access_token', 'bad');
    sessionStorage.setItem('diedrico_user_profile', 'not-json');
    expect(store.restoreSession()).toBe(false);
  });
});
