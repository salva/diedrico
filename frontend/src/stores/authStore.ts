/**
 * authStore.ts - Authentication state management
 * 
 * T402: Manages Google Drive authentication state and user profile information.
 * NOT part of the command stack (authentication is user-specific, not document-specific).
 * NOT persisted in project files (session-only via session storage).
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md - Authentication State
 */

import { ref, computed } from 'vue';
import type { GoogleUserProfile } from '../services/GoogleDriveService';

export interface AuthState {
  isAuthenticated: boolean;
  user: GoogleUserProfile | null;
  accessToken: string | null;
  tokenExpiry: Date | null;
}

// Reactive state
const isAuthenticated = ref(false);
const user = ref<GoogleUserProfile | null>(null);
const accessToken = ref<string | null>(null);
const tokenExpiry = ref<Date | null>(null);

// Session storage keys
const SESSION_TOKEN_KEY = 'diedrico_access_token';
const SESSION_PROFILE_KEY = 'diedrico_user_profile';
const SESSION_EXPIRY_KEY = 'diedrico_token_expiry';

export function useAuthStore() {
  /**
   * Set authenticated state with user profile
   */
  function setAuthenticated(profile: GoogleUserProfile, token: string, expiry?: Date) {
    isAuthenticated.value = true;
    user.value = profile;
    accessToken.value = token;
    tokenExpiry.value = expiry || null;
    
    // Persist to session storage
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    sessionStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile));
    if (expiry) {
      sessionStorage.setItem(SESSION_EXPIRY_KEY, expiry.toISOString());
    }
  }

  /**
   * Update user profile information
   */
  function setUser(profile: GoogleUserProfile) {
    user.value = profile;
    sessionStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile));
  }

  /**
   * Clear authentication state (sign out)
   */
  function clearAuth() {
    isAuthenticated.value = false;
    user.value = null;
    accessToken.value = null;
    tokenExpiry.value = null;
    
    // Clear session storage
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_PROFILE_KEY);
    sessionStorage.removeItem(SESSION_EXPIRY_KEY);
  }

  /**
   * Restore authentication state from session storage
   * Returns true if session was restored, false if no valid session exists
   */
  function restoreSession(): boolean {
    const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const storedProfile = sessionStorage.getItem(SESSION_PROFILE_KEY);
    const storedExpiry = sessionStorage.getItem(SESSION_EXPIRY_KEY);

    if (!storedToken || !storedProfile) {
      return false;
    }

    // Check token expiry if available
    if (storedExpiry) {
      const expiry = new Date(storedExpiry);
      if (expiry < new Date()) {
        // Token expired, clear session
        clearAuth();
        return false;
      }
      tokenExpiry.value = expiry;
    }

    try {
      const profile = JSON.parse(storedProfile);
      isAuthenticated.value = true;
      user.value = profile;
      accessToken.value = storedToken;
      return true;
    } catch (error) {
      console.error('[AuthStore] Failed to parse stored profile:', error);
      clearAuth();
      return false;
    }
  }

  /**
   * Check if token is expired or about to expire (within 5 minutes)
   */
  function isTokenExpired(): boolean {
    if (!tokenExpiry.value) {
      return false; // No expiry info, assume valid
    }
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return tokenExpiry.value < fiveMinutesFromNow;
  }

  return {
    // State (readonly)
    isAuthenticated: computed(() => isAuthenticated.value),
    user: computed(() => user.value),
    accessToken: computed(() => accessToken.value),
    tokenExpiry: computed(() => tokenExpiry.value),
    
    // Actions
    setAuthenticated,
    setUser,
    clearAuth,
    restoreSession,
    isTokenExpired,
  };
}
