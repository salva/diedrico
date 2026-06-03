/**
 * T409: Unit tests for authStore
 * Tests authentication state management, session persistence, and profile handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuthStore } from '../../../src/stores/authStore';
import type { GoogleUserProfile } from '../../../src/application/appShell/DrivePortTypes';

describe('authStore', () => {
  let authStore: ReturnType<typeof useAuthStore>;

  // Mock profile data
  const mockProfile: GoogleUserProfile = {
    name: 'John Doe',
    email: 'john@example.com',
    picture: 'https://example.com/avatar.jpg',
    sub: 'google-user-123',
  };

  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear();
    
    // Clear any existing auth state by calling clearAuth
    // This ensures each test starts fresh
    const tempStore = useAuthStore();
    tempStore.clearAuth();
    
    // Create fresh store instance
    authStore = useAuthStore();
  });

  afterEach(() => {
    // Clean up
    sessionStorage.clear();
  });

  describe('Initial State', () => {
    it('should start unauthenticated', () => {
      expect(authStore.isAuthenticated.value).toBe(false);
      expect(authStore.user.value).toBeNull();
      expect(authStore.accessToken.value).toBeNull();
      expect(authStore.tokenExpiry.value).toBeNull();
    });
  });

  describe('setAuthenticated', () => {
    it('should set authenticated state with user profile', () => {
      const token = 'test-access-token';
      
      authStore.setAuthenticated(mockProfile, token);
      
      expect(authStore.isAuthenticated.value).toBe(true);
      expect(authStore.user.value).toEqual(mockProfile);
      expect(authStore.accessToken.value).toBe(token);
    });

    it('should persist to session storage', () => {
      const token = 'test-access-token';
      
      authStore.setAuthenticated(mockProfile, token);
      
      expect(sessionStorage.getItem('diedrico_access_token')).toBe(token);
      expect(sessionStorage.getItem('diedrico_user_profile')).toBe(JSON.stringify(mockProfile));
    });

    it('should store token expiry when provided', () => {
      const token = 'test-access-token';
      const expiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      authStore.setAuthenticated(mockProfile, token, expiry);
      
      expect(authStore.tokenExpiry.value).toEqual(expiry);
      expect(sessionStorage.getItem('diedrico_token_expiry')).toBe(expiry.toISOString());
    });
  });

  describe('setUser', () => {
    it('should update user profile', () => {
      // First authenticate
      authStore.setAuthenticated(mockProfile, 'token');
      
      // Update profile
      const updatedProfile: GoogleUserProfile = {
        ...mockProfile,
        name: 'Jane Doe',
      };
      
      authStore.setUser(updatedProfile);
      
      expect(authStore.user.value).toEqual(updatedProfile);
      expect(sessionStorage.getItem('diedrico_user_profile')).toBe(JSON.stringify(updatedProfile));
    });
  });

  describe('clearAuth', () => {
    it('should clear all authentication state', () => {
      // First authenticate
      authStore.setAuthenticated(mockProfile, 'token');
      
      // Clear auth
      authStore.clearAuth();
      
      expect(authStore.isAuthenticated.value).toBe(false);
      expect(authStore.user.value).toBeNull();
      expect(authStore.accessToken.value).toBeNull();
      expect(authStore.tokenExpiry.value).toBeNull();
    });

    it('should clear session storage', () => {
      // First authenticate
      authStore.setAuthenticated(mockProfile, 'token');
      
      // Clear auth
      authStore.clearAuth();
      
      expect(sessionStorage.getItem('diedrico_access_token')).toBeNull();
      expect(sessionStorage.getItem('diedrico_user_profile')).toBeNull();
      expect(sessionStorage.getItem('diedrico_token_expiry')).toBeNull();
    });
  });

  describe('restoreSession', () => {
    it('should restore valid session from storage', () => {
      const token = 'stored-token';
      
      // Manually set session storage
      sessionStorage.setItem('diedrico_access_token', token);
      sessionStorage.setItem('diedrico_user_profile', JSON.stringify(mockProfile));
      
      const restored = authStore.restoreSession();
      
      expect(restored).toBe(true);
      expect(authStore.isAuthenticated.value).toBe(true);
      expect(authStore.user.value).toEqual(mockProfile);
      expect(authStore.accessToken.value).toBe(token);
    });

    it('should return false when no session exists', () => {
      const restored = authStore.restoreSession();
      
      expect(restored).toBe(false);
      expect(authStore.isAuthenticated.value).toBe(false);
    });

    it('should clear expired session', () => {
      const token = 'expired-token';
      const expiredDate = new Date(Date.now() - 3600000); // 1 hour ago
      
      sessionStorage.setItem('diedrico_access_token', token);
      sessionStorage.setItem('diedrico_user_profile', JSON.stringify(mockProfile));
      sessionStorage.setItem('diedrico_token_expiry', expiredDate.toISOString());
      
      const restored = authStore.restoreSession();
      
      expect(restored).toBe(false);
      expect(authStore.isAuthenticated.value).toBe(false);
      expect(sessionStorage.getItem('diedrico_access_token')).toBeNull();
    });

    it('should handle corrupted profile data', () => {
      sessionStorage.setItem('diedrico_access_token', 'token');
      sessionStorage.setItem('diedrico_user_profile', 'invalid-json{');
      
      const restored = authStore.restoreSession();
      
      expect(restored).toBe(false);
      expect(authStore.isAuthenticated.value).toBe(false);
    });

    it('should restore valid session with future expiry', () => {
      const token = 'valid-token';
      const futureDate = new Date(Date.now() + 7200000); // 2 hours from now
      
      sessionStorage.setItem('diedrico_access_token', token);
      sessionStorage.setItem('diedrico_user_profile', JSON.stringify(mockProfile));
      sessionStorage.setItem('diedrico_token_expiry', futureDate.toISOString());
      
      const restored = authStore.restoreSession();
      
      expect(restored).toBe(true);
      expect(authStore.isAuthenticated.value).toBe(true);
      expect(authStore.tokenExpiry.value).toEqual(futureDate);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false when no expiry set', () => {
      authStore.setAuthenticated(mockProfile, 'token');
      
      expect(authStore.isTokenExpired()).toBe(false);
    });

    it('should return true when token is expired', () => {
      const expiredDate = new Date(Date.now() - 3600000); // 1 hour ago
      authStore.setAuthenticated(mockProfile, 'token', expiredDate);
      
      expect(authStore.isTokenExpired()).toBe(true);
    });

    it('should return true when token expires within 5 minutes', () => {
      const soonExpiry = new Date(Date.now() + 4 * 60 * 1000); // 4 minutes from now
      authStore.setAuthenticated(mockProfile, 'token', soonExpiry);
      
      expect(authStore.isTokenExpired()).toBe(true);
    });

    it('should return false when token has more than 5 minutes left', () => {
      const futureExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      authStore.setAuthenticated(mockProfile, 'token', futureExpiry);
      
      expect(authStore.isTokenExpired()).toBe(false);
    });
  });

  describe('Computed Properties', () => {
    it('should expose readonly computed values', () => {
      authStore.setAuthenticated(mockProfile, 'token');
      
      // Computed properties should be reactive
      expect(authStore.isAuthenticated.value).toBe(true);
      expect(authStore.user.value?.name).toBe('John Doe');
      expect(authStore.accessToken.value).toBe('token');
    });

    it('should update reactively when state changes', () => {
      authStore.setAuthenticated(mockProfile, 'token');
      expect(authStore.isAuthenticated.value).toBe(true);
      
      authStore.clearAuth();
      expect(authStore.isAuthenticated.value).toBe(false);
    });
  });
});
