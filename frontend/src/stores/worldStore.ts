import { defineStore } from 'pinia';
import type { Element2D, Element3D } from '../types/ElementTypes';
import { DependencyGraph } from '../domain/world/DependencyGraph';

export interface ProjectionPlane {
  id: string;
  label: string;      // "P_H", "P_V", etc.
  name: string;       // Display name
  isActive: boolean;
  isVisible: boolean;
}

export interface HingeLine {
  id: string;
  label: string;      // "HL_HV", etc.
  name: string;       // Display name
  plane1Id: string;
  plane2Id: string;
}

interface WorldState {
  planes: ProjectionPlane[];
  hingeLines: HingeLine[];
  elements2D: Map<string, Element2D>;
  elements3D: Map<string, Element3D>;
  dependencyGraph: DependencyGraph;
}

export const useWorldStore = defineStore('world', {
  state: (): WorldState => ({
    planes: [],
    hingeLines: [],
    elements2D: new Map(),
    elements3D: new Map(),
    dependencyGraph: new DependencyGraph()
  }),

  getters: {
    /**
     * Get all 2D elements as array
     */
    allElements2D: (state) => Array.from(state.elements2D.values()),

    /**
     * Get all 3D elements as array
     */
    allElements3D: (state) => Array.from(state.elements3D.values()),

    /**
     * Get element by ID (checks both 2D and 3D)
     */
    getElementById: (state) => (id: string): Element2D | Element3D | undefined => {
      return state.elements2D.get(id) || state.elements3D.get(id);
    },

    /**
     * Get all visible 2D elements
     */
    visibleElements2D: (state) => {
      return Array.from(state.elements2D.values()).filter(
        el => el.visualStyle.visible
      );
    },

    /**
     * Get all visible 3D elements
     */
    visibleElements3D: (state) => {
      return Array.from(state.elements3D.values()).filter(
        el => el.visualStyle.visible
      );
    },

    /**
     * Get infeasible elements
     */
    infeasibleElements: (state) => {
      const infeasible2D = Array.from(state.elements2D.values()).filter(
        el => el.infeasible !== null
      );
      const infeasible3D = Array.from(state.elements3D.values()).filter(
        el => el.infeasible !== null
      );
      return [...infeasible2D, ...infeasible3D];
    }
  },

  actions: {
    /**
     * Add a 2D element
     */
    addElement2D(element: Element2D): void {
      this.elements2D.set(element.id, element);
      
      // Add to dependency graph
      this.dependencyGraph.addNode(element.id, 'element');
    },

    /**
     * Add a 3D element
     */
    addElement3D(element: Element3D): void {
      this.elements3D.set(element.id, element);
      
      // Add to dependency graph
      this.dependencyGraph.addNode(element.id, 'element');
    },

    /**
     * Get 2D element by ID
     */
    getElement2D(id: string): Element2D | undefined {
      return this.elements2D.get(id);
    },

    /**
     * Get 3D element by ID
     */
    getElement3D(id: string): Element3D | undefined {
      return this.elements3D.get(id);
    },

    /**
     * Update a 2D element
     */
    updateElement2D(id: string, updates: Partial<Element2D>): void {
      const element = this.elements2D.get(id);
      if (element) {
        this.elements2D.set(id, { ...element, ...updates } as Element2D);
      }
    },

    /**
     * Update a 3D element
     */
    updateElement3D(id: string, updates: Partial<Element3D>): void {
      const element = this.elements3D.get(id);
      if (element) {
        this.elements3D.set(id, { ...element, ...updates } as Element3D);
      }
    },

    /**
     * Remove a 2D element
     */
    removeElement2D(id: string): void {
      this.elements2D.delete(id);
      // Note: Dependency edges should be removed separately via DependencyOperations
    },

    /**
     * Remove a 3D element
     */
    removeElement3D(id: string): void {
      this.elements3D.delete(id);
      // Note: Dependency edges should be removed separately via DependencyOperations
    },

    /**
     * Clear all elements (for testing or reset)
     */
    clear(): void {
      this.elements2D.clear();
      this.elements3D.clear();
      this.dependencyGraph = new DependencyGraph();
    }
  }
});
