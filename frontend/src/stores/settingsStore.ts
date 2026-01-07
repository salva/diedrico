/**
 * Settings Store - User preferences and application settings
 * 
 * Manages user-configurable settings with localStorage persistence.
 * Settings are loaded on application startup and saved automatically on change.
 * 
 * Settings Categories:
 * - Grid: Visibility, spacing, style, snap-to-grid
 * - Snap: Enable/disable, snap radius (in pixels)
 * - Default Styles: Colors, line widths for new elements
 * - 3D View: Initial camera position, display options
 * 
 * @see specs/001-dihedral-learning-mvp/ui-spec.md#project-settings-dialog
 * @see specs/001-dihedral-learning-mvp/ui-spec.md#state-persistence
 */

import { ref, computed, watch } from 'vue';
import { defineStore } from 'pinia';

const STORAGE_KEY = 'diedrico_settings_v1';

/**
 * Default settings values
 * Following ui-spec.md recommendations
 */
const DEFAULT_SETTINGS = {
  // Grid settings
  grid: {
    visible: true,
    spacing: 20, // Base spacing in world units (adapts with zoom)
    color: '#E0E0E0',
    snapToGrid: false,
  },
  
  // Snap settings
  snap: {
    enabled: true,
    radius: 12, // Snap radius in screen pixels (10-15 per spec)
  },
  
  // Default visual styles for new elements
  defaultStyles: {
    pointColor: '#000000',
    pointSize: 3, // Radius in pixels
    lineColor: '#000000',
    lineWidth: 1.5, // In pixels
    circleColor: '#000000',
    circleWidth: 1.5,
    guideColor: '#666666',
    guideWidth: 1,
    guideDashed: true,
  },
  
  // 3D view settings
  view3D: {
    showPlanes: true,
    showProjectionLines: true,
    show2DElements: true,
    initialCameraDistance: 10,
  },
};

export type Settings = typeof DEFAULT_SETTINGS;

export const useSettingsStore = defineStore('settings', () => {
  // Settings state (initialized from localStorage or defaults)
  const settings = ref<Settings>(loadSettings());
  
  /**
   * Load settings from localStorage
   * Falls back to defaults if not found or invalid
   */
  function loadSettings(): Settings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new settings in updates
        return {
          grid: { ...DEFAULT_SETTINGS.grid, ...(parsed.grid || {}) },
          snap: { ...DEFAULT_SETTINGS.snap, ...(parsed.snap || {}) },
          defaultStyles: { ...DEFAULT_SETTINGS.defaultStyles, ...(parsed.defaultStyles || {}) },
          view3D: { ...DEFAULT_SETTINGS.view3D, ...(parsed.view3D || {}) },
        };
      }
    } catch (error) {
      console.warn('[SettingsStore] Failed to load settings from localStorage:', error);
    }
    return structuredClone(DEFAULT_SETTINGS);
  }
  
  /**
   * Save settings to localStorage
   */
  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
      console.log('[SettingsStore] Settings saved to localStorage');
    } catch (error) {
      console.error('[SettingsStore] Failed to save settings to localStorage:', error);
    }
  }
  
  /**
   * Watch for settings changes and auto-save
   */
  watch(settings, () => {
    saveSettings();
  }, { deep: true });
  
  // Grid settings
  const gridVisible = computed({
    get: () => settings.value.grid.visible,
    set: (value: boolean) => {
      settings.value.grid.visible = value;
    },
  });
  
  const gridSpacing = computed({
    get: () => settings.value.grid.spacing,
    set: (value: number) => {
      settings.value.grid.spacing = value;
    },
  });
  
  const gridColor = computed({
    get: () => settings.value.grid.color,
    set: (value: string) => {
      settings.value.grid.color = value;
    },
  });
  
  const snapToGrid = computed({
    get: () => settings.value.grid.snapToGrid,
    set: (value: boolean) => {
      settings.value.grid.snapToGrid = value;
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
  
  // Default style getters (read-only for now)
  const defaultPointColor = computed(() => settings.value.defaultStyles.pointColor);
  const defaultPointSize = computed(() => settings.value.defaultStyles.pointSize);
  const defaultLineColor = computed(() => settings.value.defaultStyles.lineColor);
  const defaultLineWidth = computed(() => settings.value.defaultStyles.lineWidth);
  const defaultCircleColor = computed(() => settings.value.defaultStyles.circleColor);
  const defaultCircleWidth = computed(() => settings.value.defaultStyles.circleWidth);
  const defaultGuideColor = computed(() => settings.value.defaultStyles.guideColor);
  const defaultGuideWidth = computed(() => settings.value.defaultStyles.guideWidth);
  const defaultGuideDashed = computed(() => settings.value.defaultStyles.guideDashed);
  
  // 3D view settings getters (read-only for now)
  const showPlanes = computed(() => settings.value.view3D.showPlanes);
  const showProjectionLines = computed(() => settings.value.view3D.showProjectionLines);
  const show2DElements = computed(() => settings.value.view3D.show2DElements);
  const initialCameraDistance = computed(() => settings.value.view3D.initialCameraDistance);
  
  /**
   * Update a specific setting
   */
  function updateSetting(path: string, value: any) {
    const keys = path.split('.');
    let target: any = settings.value;
    
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]];
    }
    
    target[keys[keys.length - 1]] = value;
  }
  
  /**
   * Reset all settings to defaults
   */
  function resetToDefaults() {
    settings.value = structuredClone(DEFAULT_SETTINGS);
    console.log('[SettingsStore] Settings reset to defaults');
  }
  
  /**
   * Reset a specific category to defaults
   */
  function resetCategory(category: keyof Settings) {
    (settings.value as any)[category] = structuredClone((DEFAULT_SETTINGS as any)[category]);
    console.log(`[SettingsStore] ${category} settings reset to defaults`);
  }
  
  return {
    // State
    settings,
    
    // Grid settings
    gridVisible,
    gridSpacing,
    gridColor,
    snapToGrid,
    
    // Snap settings
    snapEnabled,
    snapRadius,
    
    // Default styles
    defaultPointColor,
    defaultPointSize,
    defaultLineColor,
    defaultLineWidth,
    defaultCircleColor,
    defaultCircleWidth,
    defaultGuideColor,
    defaultGuideWidth,
    defaultGuideDashed,
    
    // 3D view settings
    showPlanes,
    showProjectionLines,
    show2DElements,
    initialCameraDistance,
    
    // Methods
    updateSetting,
    resetToDefaults,
    resetCategory,
    loadSettings,
    saveSettings,
  };
});
