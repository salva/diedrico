import { defineStore } from 'pinia';

interface ToolState {
  activeTool: string | null;
  toolState: Record<string, any>;
}

export const useToolStore = defineStore('tool', {
  state: (): ToolState => ({
    activeTool: null,
    toolState: {}
  }),

  getters: {
    /**
     * Check if a tool is active
     */
    isToolActive: (state) => (toolName: string): boolean => {
      return state.activeTool === toolName;
    },

    /**
     * Get state for specific tool
     */
    getToolState: (state) => (toolName: string): any => {
      return state.toolState[toolName];
    },

    /**
     * Check if any tool is active
     */
    hasActiveTool: (state): boolean => {
      return state.activeTool !== null;
    }
  },

  actions: {
    /**
     * Set active tool
     */
    setActiveTool(toolName: string): void {
      this.activeTool = toolName;
      
      // Initialize tool state if not exists
      if (!this.toolState[toolName]) {
        this.toolState[toolName] = {};
      }
    },

    /**
     * Clear active tool
     */
    clearTool(): void {
      this.activeTool = null;
    },

    /**
     * Update tool-specific state
     */
    updateToolState(toolName: string, updates: Record<string, any>): void {
      if (!this.toolState[toolName]) {
        this.toolState[toolName] = {};
      }
      this.toolState[toolName] = {
        ...this.toolState[toolName],
        ...updates
      };
    },

    /**
     * Clear tool state for specific tool
     */
    clearToolState(toolName: string): void {
      delete this.toolState[toolName];
    },

    /**
     * Clear all tool state
     */
    clearAllToolState(): void {
      this.toolState = {};
      this.activeTool = null;
    }
  }
});
