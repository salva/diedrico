import { defineStore } from 'pinia';
import type { ProjectionPlane } from '../domain/viewState/ProjectionPlane';
import type { HingeLine } from '../domain/viewState/HingeLine';
import { PLANE_H, PLANE_V } from '../domain/viewState/ProjectionPlane';
import { HL_HV } from '../domain/viewState/HingeLine';

interface View2DState {
  panX: number;
  panY: number;
  zoom: number;
}

interface ViewState {
  activePlaneId: string;
  planes: ProjectionPlane[];
  hingeLines: HingeLine[];
  view2D: View2DState;
}

export const useViewStore = defineStore('view', {
  state: (): ViewState => ({
    activePlaneId: 'P_H',
    planes: [PLANE_H, PLANE_V],
    hingeLines: [HL_HV],
    view2D: {
      panX: 0,
      panY: 0,
      zoom: 1.0
    }
  }),

  getters: {
    /**
     * Get active projection plane
     */
    activePlane: (state): ProjectionPlane | undefined => {
      return state.planes.find(p => p.id === state.activePlaneId);
    },

    /**
     * Get visible planes
     */
    visiblePlanes: (state): ProjectionPlane[] => {
      return state.planes.filter(p => p.isVisible);
    },

    /**
     * Get plane by ID
     */
    getPlaneById: (state) => (id: string): ProjectionPlane | undefined => {
      return state.planes.find(p => p.id === id);
    },

    /**
     * Get hinge line by ID
     */
    getHingeLineById: (state) => (id: string): HingeLine | undefined => {
      return state.hingeLines.find(hl => hl.id === id);
    },

    /**
     * Get hinge lines connected to a plane
     */
    getHingeLinesForPlane: (state) => (planeId: string): HingeLine[] => {
      return state.hingeLines.filter(
        hl => hl.plane1Id === planeId || hl.plane2Id === planeId
      );
    }
  },

  actions: {
    /**
     * Set active projection plane
     */
    setActivePlane(planeId: string): void {
      const plane = this.planes.find(p => p.id === planeId);
      if (plane) {
        this.activePlaneId = planeId;
      }
    },

    /**
     * Update 2D view state (pan/zoom)
     */
    updateView2D(updates: Partial<View2DState>): void {
      this.view2D = { ...this.view2D, ...updates };
    },

    /**
     * Set plane visibility
     */
    setPlaneVisibility(planeId: string, isVisible: boolean): void {
      const plane = this.planes.find(p => p.id === planeId);
      if (plane) {
        plane.isVisible = isVisible;
      }
    },

    /**
     * Add a new projection plane
     */
    addPlane(plane: ProjectionPlane): void {
      this.planes.push(plane);
    },

    /**
     * Remove a projection plane
     */
    removePlane(planeId: string): void {
      const index = this.planes.findIndex(p => p.id === planeId);
      if (index !== -1) {
        this.planes.splice(index, 1);
        
        // If removing active plane, set first available as active
        if (this.activePlaneId === planeId && this.planes.length > 0) {
          this.activePlaneId = this.planes[0].id;
        }
      }
    },

    /**
     * Add a new hinge line
     */
    addHingeLine(hingeLine: HingeLine): void {
      this.hingeLines.push(hingeLine);
    },

    /**
     * Remove a hinge line
     */
    removeHingeLine(hingeLineId: string): void {
      const index = this.hingeLines.findIndex(hl => hl.id === hingeLineId);
      if (index !== -1) {
        this.hingeLines.splice(index, 1);
      }
    },

    /**
     * Reset view to default (center, zoom 1.0)
     */
    resetView(): void {
      this.view2D = {
        panX: 0,
        panY: 0,
        zoom: 1.0
      };
    },

    /**
     * Clear all view state (for testing or reset)
     */
    clear(): void {
      this.activePlaneId = 'P_H';
      this.planes = [PLANE_H, PLANE_V];
      this.hingeLines = [HL_HV];
      this.resetView();
    }
  }
});
