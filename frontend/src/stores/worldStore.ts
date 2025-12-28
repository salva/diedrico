import { defineStore } from 'pinia';
import type { Element2D, Element3D } from '../types/ElementTypes';
import type { Guide } from '../domain/world/Guide';
import type { BrokenHingeLine } from '../domain/world/BrokenHingeLine';
import { DependencyGraph } from '../domain/world/DependencyGraph';

interface WorldState {
  elements2D: Map<string, Element2D>;
  elements3D: Map<string, Element3D>;
  guides: Map<string, Guide>;
  brokenHingeLines: Map<string, BrokenHingeLine>;
  dependencyGraph: DependencyGraph;
}

export const useWorldStore = defineStore('world', {
  state: (): WorldState => ({
    elements2D: new Map(),
    elements3D: new Map(),
    guides: new Map(),
    brokenHingeLines: new Map(),
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
     * Get all guides as array
     */
    allGuides: (state) => Array.from(state.guides.values()),

    /**
     * Get guide by ID
     */
    getGuideById: (state) => (id: string): Guide | undefined => {
      return state.guides.get(id);
    },

    /**
     * Get guides for a specific plane
     */
    getGuidesForPlane: (state) => (planeId: string): Guide[] => {
      return Array.from(state.guides.values()).filter(
        guide => guide.plane1Id === planeId || guide.plane2Id === planeId
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
     * Add a guide
     */
    addGuide(guide: Guide): void {
      this.guides.set(guide.id, guide);
    },

    /**
     * Get guide by ID
     */
    getGuide(id: string): Guide | undefined {
      return this.guides.get(id);
    },

    /**
     * Remove a guide
     */
    removeGuide(id: string): void {
      this.guides.delete(id);
    },

    /**
     * Clear all elements (for testing or reset)
     */
    clear(): void {
      this.elements2D.clear();
      this.elements3D.clear();
      this.guides.clear();
      this.brokenHingeLines.clear();
      this.dependencyGraph = new DependencyGraph();
    },

    /**
     * Initialize a new workspace with origin point O and hinge line HL_HV
     */
    initializeWorkspace(): void {
      // === Origin Point O ===
      // Create 2D projection on P_H at hinge line (local y=-200)
      const originH: Element2D = {
        id: 'O_H',
        name: 'O',
        kind: 'Point2DFree',
        planeId: 'P_H',
        x: 0,
        y: -200,
        createdBy: 'system:init',
        infeasible: false,
        visualStyle: {
          visible: true,
          color: '#FF6B35',
          lineWidth: 3,
          lineStyle: 'solid',
          inheritFromProcess: false
        }
      };

      // Create 2D projection on P_V at hinge line (local y=200)
      const originV: Element2D = {
        id: 'O_V',
        name: 'O',
        kind: 'Point2DFree',
        planeId: 'P_V',
        x: 0,
        y: 200,
        createdBy: 'system:init',
        infeasible: false,
        visualStyle: {
          visible: true,
          color: '#FF6B35',
          lineWidth: 3,
          lineStyle: 'solid',
          inheritFromProcess: false
        }
      };

      // Create 3D origin point O at (0,0,0)
      const origin3D: Element3D = {
        id: 'O',
        name: 'O',
        kind: 'Point3DByCoordinates',
        x: 0,
        y: 0,
        z: 0,
        projectionHId: 'O_H',
        projectionVId: 'O_V',
        createdBy: 'system:init',
        infeasible: false,
        visualStyle: {
          visible: true,
          color: '#FF6B35',
          lineWidth: 3,
          lineStyle: 'solid',
          inheritFromProcess: false
        }
      };

      // === Projection Planes P_H and P_V ===
      // P_H: Horizontal plane through O with normal vector (0, 0, 1) pointing up
      const planeH: Element3D = {
        id: 'P_H',
        name: 'Horizontal Plane',
        kind: 'Plane3DByPointAndNormal',
        originPointId: 'O',
        normalVector: { x: 0, y: 0, z: 1 },
        createdBy: 'system:init',
        infeasible: false,
        visualStyle: {
          visible: true,
          color: '#4A90E2',
          lineWidth: 1,
          lineStyle: 'solid',
          inheritFromProcess: false
        }
      };

      // P_V: Vertical plane through O with normal vector (0, 1, 0) pointing toward viewer
      const planeV: Element3D = {
        id: 'P_V',
        name: 'Vertical Plane',
        kind: 'Plane3DByPointAndNormal',
        originPointId: 'O',
        normalVector: { x: 0, y: 1, z: 0 },
        createdBy: 'system:init',
        infeasible: false,
        visualStyle: {
          visible: true,
          color: '#E94B3C',
          lineWidth: 1,
          lineStyle: 'solid',
          inheritFromProcess: false
        }
      };

      // === Hinge Line HL_HV (intersection of P_H and P_V) ===
      // Create 2D line projections for rendering
      // On P_H: horizontal line at y=-200 (the meeting point)
      const hlH: Element2D = {
        id: 'HL_HV_H',
        name: 'HL_HV',
        kind: 'Line2DByTwoPoints',
        planeId: 'P_H',
        point1Id: 'HL_HV_H_p1',
        point2Id: 'HL_HV_H_p2',
        createdBy: 'system:init',
        infeasible: false,
        visualStyle: {
          visible: true,
          color: '#333333',
          lineWidth: 2,
          lineStyle: 'dashed',
          inheritFromProcess: false
        }
      };

      // On P_V: horizontal line at y=200 (same global position)
      const hlV: Element2D = {
        id: 'HL_HV_V',
        name: 'HL_HV',
        kind: 'Line2DByTwoPoints',
        planeId: 'P_V',
        point1Id: 'HL_HV_V_p1',
        point2Id: 'HL_HV_V_p2',
        createdBy: 'system:init',
        infeasible: false,
        visualStyle: {
          visible: true,
          color: '#333333',
          lineWidth: 2,
          lineStyle: 'dashed',
          inheritFromProcess: false
        }
      };

      // Create auxiliary points for HL_HV_H (on P_H at y=-200)
      const hlHp1: Element2D = {
        id: 'HL_HV_H_p1',
        name: '',
        kind: 'Point2DFree',
        planeId: 'P_H',
        x: -1000,
        y: -200,
        createdBy: 'system:init',
        infeasible: false,
        visualStyle: {
          visible: false,
          color: '#333333',
          lineWidth: 1,
          lineStyle: 'solid',
          inheritFromProcess: false
        }
      };

      const hlHp2: Element2D = {
        id: 'HL_HV_H_p2',
        name: '',
        kind: 'Point2DFree',
        planeId: 'P_H',
        x: 1000,
        y: -200,
        createdBy: 'system:init',
        infeasible: false,
        visualStyle: {
          visible: false,
          color: '#333333',
          lineWidth: 1,
          lineStyle: 'solid',
          inheritFromProcess: false
        }
      };

      // Create auxiliary points for HL_HV_V (on P_V at y=200)
      const hlVp1: Element2D = {
        id: 'HL_HV_V_p1',
        name: '',
        kind: 'Point2DFree',
        planeId: 'P_V',
        x: -1000,
        y: 200,
        createdBy: 'system:init',
        infeasible: false,
        visualStyle: {
          visible: false,
          color: '#333333',
          lineWidth: 1,
          lineStyle: 'solid',
          inheritFromProcess: false
        }
      };

      const hlVp2: Element2D = {
        id: 'HL_HV_V_p2',
        name: '',
        kind: 'Point2DFree',
        planeId: 'P_V',
        x: 1000,
        y: 200,
        createdBy: 'system:init',
        infeasible: false,
        visualStyle: {
          visible: false,
          color: '#333333',
          lineWidth: 1,
          lineStyle: 'solid',
          inheritFromProcess: false
        }
      };

      // Create 3D hinge line HL_HV (intersection of P_H and P_V)
      const hl3D: Element3D = {
        id: 'HL_HV',
        name: 'HL_HV',
        kind: 'Line3DFromPlaneIntersection',
        plane1Id: 'P_H',
        plane2Id: 'P_V',
        projectionHId: 'HL_HV_H',
        projectionVId: 'HL_HV_V',
        createdBy: 'system:init',
        infeasible: false,
        visualStyle: {
          visible: true,
          color: '#333333',
          lineWidth: 2,
          lineStyle: 'dashed',
          inheritFromProcess: false
        }
      };

      // Add all elements to store
      // Auxiliary points first
      this.addElement2D(hlHp1);
      this.addElement2D(hlHp2);
      this.addElement2D(hlVp1);
      this.addElement2D(hlVp2);
      
      // Origin projections
      this.addElement2D(originH);
      this.addElement2D(originV);

      // Hinge line projections
      this.addElement2D(hlH);
      this.addElement2D(hlV);

      // 3D elements
      this.addElement3D(origin3D);
      this.addElement3D(planeH);
      this.addElement3D(planeV);
      this.addElement3D(hl3D);

      // Add dependencies
      this.dependencyGraph.addNode('system:init', 'action');
      
      // Origin dependencies
      this.dependencyGraph.addEdge('system:init', 'O_H');
      this.dependencyGraph.addEdge('system:init', 'O_V');
      this.dependencyGraph.addEdge('O_H', 'O');
      this.dependencyGraph.addEdge('O_V', 'O');
      
      // Hinge line dependencies
      this.dependencyGraph.addEdge('system:init', 'HL_HV_H_p1');
      this.dependencyGraph.addEdge('system:init', 'HL_HV_H_p2');
      this.dependencyGraph.addEdge('system:init', 'HL_HV_V_p1');
      this.dependencyGraph.addEdge('system:init', 'HL_HV_V_p2');
      this.dependencyGraph.addEdge('HL_HV_H_p1', 'HL_HV_H');
      this.dependencyGraph.addEdge('HL_HV_H_p2', 'HL_HV_H');
      this.dependencyGraph.addEdge('HL_HV_V_p1', 'HL_HV_V');
      this.dependencyGraph.addEdge('HL_HV_V_p2', 'HL_HV_V');
      this.dependencyGraph.addEdge('HL_HV_H', 'HL_HV');
      this.dependencyGraph.addEdge('HL_HV_V', 'HL_HV');
    },

    /**
     * Get BrokenHingeLine by ID
     */
    getBrokenHingeLine(id: string): BrokenHingeLine | undefined {
      return this.brokenHingeLines.get(id);
    },

    /**
     * Get BrokenHingeLine for a 3D plane
     */
    getBHLForPlane3D(plane3DId: string): BrokenHingeLine | undefined {
      for (const bhl of this.brokenHingeLines.values()) {
        if (bhl.sourcePlane3DId === plane3DId) {
          return bhl;
        }
      }
      return undefined;
    }
  }
});
