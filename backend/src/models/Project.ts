/**
 * Project Data Transfer Object
 * Represents a complete dihedral drawing project with all state
 */

export interface ProjectDTO {
  id: string;
  name: string;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  
  // World state
  elements2D: Array<any>; // Serialized Element2D objects
  elements3D: Array<any>; // Serialized Element3D objects
  dependencyGraph: {
    nodes: Array<{ id: string; type: string }>;
    edges: Array<{ from: string; to: string }>;
  };
  
  // View state
  activePlaneId: string;
  planes: Array<{
    id: string;
    name: string;
    isActive: boolean;
    isVisible: boolean;
    color: string;
  }>;
  hingeLines: Array<{
    id: string;
    name: string;
    plane1Id: string;
    plane2Id: string;
  }>;
  view2D: {
    panX: number;
    panY: number;
    zoom: number;
  };
  
  // Process tree state
  processTree: {
    root: any; // Serialized Process object
  };
  
  // Command history (optional - for undo/redo across sessions)
  commandHistory?: Array<{
    id: string;
    description: string;
    operations: Array<any>;
  }>;
}

/**
 * Project metadata for listing projects
 */
export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a new empty project with default values
 */
export function createEmptyProject(name: string): ProjectDTO {
  const now = new Date().toISOString();
  const id = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    elements2D: [],
    elements3D: [],
    dependencyGraph: {
      nodes: [],
      edges: []
    },
    activePlaneId: 'P_H',
    planes: [
      {
        id: 'P_H',
        name: 'Horizontal Plane',
        isActive: true,
        isVisible: true,
        color: '#2563eb' // blue-600
      },
      {
        id: 'P_V',
        name: 'Vertical Plane',
        isActive: false,
        isVisible: true,
        color: '#dc2626' // red-600
      }
    ],
    hingeLines: [
      {
        id: 'HL_HV',
        name: 'Horizontal-Vertical Hinge',
        plane1Id: 'P_H',
        plane2Id: 'P_V'
      }
    ],
    view2D: {
      panX: 0,
      panY: 0,
      zoom: 1.0
    },
    processTree: {
      root: {
        id: 'root',
        type: 'process',
        name: 'Construction History',
        children: []
      }
    }
  };
}
