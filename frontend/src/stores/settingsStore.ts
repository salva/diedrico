/**
 * Settings Store - User preferences and application settings
 * 
 * Manages user-configurable settings with explicit localStorage persistence.
 * 
 * Settings Categories:
 * - Grid: Spacing and style
 * - Snap: Enable/disable, snap radius (in pixels)
 * 
 * Settings are UI preferences persisted locally; project data persistence is handled separately.
 */

import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

const STORAGE_KEY = 'diedrico_settings_v1';

/**
 * Default settings values
 * Default settings values used when localStorage has no saved preferences.
 */
const DEFAULT_SETTINGS = {
  // Grid settings
  grid: {
    spacing: 20, // Base spacing in world units (adapts with zoom)
    color: '#E0E0E0',
  },
  
  // Snap settings
  snap: {
    enabled: true,
    radius: 12, // Snap radius in screen pixels (10-15 per spec)
  },
};

interface Settings {
  grid: {
    spacing: number;
    color: string;
  };
  snap: {
    enabled: boolean;
    radius: number;
  };
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>(structuredClone(DEFAULT_SETTINGS));
  
  /**
   * Load settings from localStorage
   * Falls back to defaults if not found or invalid
   */
  function initFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        settings.value = {
          grid: {
            spacing: parsed.grid?.spacing ?? DEFAULT_SETTINGS.grid.spacing,
            color: parsed.grid?.color ?? DEFAULT_SETTINGS.grid.color,
          },
          snap: {
            enabled: parsed.snap?.enabled ?? DEFAULT_SETTINGS.snap.enabled,
            radius: parsed.snap?.radius ?? DEFAULT_SETTINGS.snap.radius,
          },
        };
      }
    } catch (error) {
      console.warn('[SettingsStore] Failed to load settings from localStorage:', error);
    }
  }
  
  /**
   * Save settings to localStorage
   */
  function saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
    } catch (error) {
      console.error('[SettingsStore] Failed to save settings to localStorage:', error);
    }
  }
  
  const gridSpacing = computed({
    get: () => settings.value.grid.spacing,
    set: (value: number) => {
      settings.value.grid.spacing = value;
    },
  });
  
  // Snap settings
  const snapEnabled = computed({
    get: () => settings.value.snap.enabled,
    set: (value: boolean) => {
      settings.value.snap.enabled = value;
    },
  });
  
  const snapRadius = computed({
    get: () => settings.value.snap.radius,
    set: (value: number) => {
      settings.value.snap.radius = value;
    },
  });
  return {
    // State
    settings,
    
    // Grid settings
    gridSpacing,
    // Snap settings
    snapEnabled,
    snapRadius,
    
    // Methods
    initFromStorage,
    saveToStorage,
  };
});
