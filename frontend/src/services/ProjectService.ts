import type { ProjectDTO, ProjectMetadata } from '../../../backend/src/models/Project';
import { useWorldStore } from '../stores/worldStore';
import { useProcessStore } from '../stores/processStore';
import { useViewStore } from '../stores/viewStore';
import type { Element2D, Element3D } from '../types/ElementTypes';

const API_BASE = 'http://localhost:3000/api';

/**
 * Service for managing project persistence
 */
export class ProjectService {
  private currentProjectId: string | null = null;
  private autosaveTimeout: NodeJS.Timeout | null = null;
  private isDirty = false;

  /**
   * List all projects
   */
  async listProjects(): Promise<ProjectMetadata[]> {
    const response = await fetch(\`\${API_BASE}/projects\`);
    if (!response.ok) {
      throw new Error(\`Failed to list projects: \${response.statusText}\`);
    }
    return response.json();
  }

  /**
   * Create a new project
   */
  async createProject(name: string): Promise<ProjectDTO> {
    const response = await fetch(\`\${API_BASE}/projects\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) {
      throw new Error(\`Failed to create project: \${response.statusText}\`);
    }
    
    const project = await response.json();
    this.currentProjectId = project.id;
    return project;
  }

  /**
   * Load project by ID
   */
  async loadProject(projectId: string): Promise<ProjectDTO> {
    const response = await fetch(\`\${API_BASE}/projects/\${projectId}\`);
    if (!response.ok) {
      throw new Error(\`Failed to load project: \${response.statusText}\`);
    }
    
    const project = await response.json();
    this.currentProjectId = projectId;
    await this.deserializeProject(project);
    return project;
  }

  /**
   * Save current project
   */
  async saveProject(): Promise<ProjectDTO> {
    if (!this.currentProjectId) {
      throw new Error('No project loaded');
    }

    const projectData = this.serializeProject();
    const response = await fetch(\`\${API_BASE}/projects/\${this.currentProjectId}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });
    
    if (!response.ok) {
      throw new Error(\`Failed to save project: \${response.statusText}\`);
    }
    
    this.isDirty = false;
    return response.json();
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(\`\${API_BASE}/projects/\${projectId}\`, {
      method: 'DELETE'
    });
    
    if (!response.ok && response.status !== 204) {
      throw new Error(\`Failed to delete project: \${response.statusText}\`);
    }
    
    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
    }
  }

  /**
   * Mark project as dirty (needs save)
   */
  markDirty(): void {
    this.isDirty = true;
    this.scheduleAutosave();
  }

  /**
   * Schedule autosave after 500ms of inactivity
   */
  private scheduleAutosave(): void {
    if (this.autosaveTimeout) {
      clearTimeout(this.autosaveTimeout);
    }
    
    this.autosaveTimeout = setTimeout(async () => {
      if (this.isDirty && this.currentProjectId) {
        try {
          await this.saveProject();
          console.log('Project autosaved');
        } catch (error) {
          console.error('Autosave failed:', error);
        }
      }
    }, 500);
  }

  /**
   * Serialize current application state to ProjectDTO
   */
  private serializeProject(): Partial<ProjectDTO> {
    const worldStore = useWorldStore();
    const processStore = useProcessStore();
    const viewStore = useViewStore();

    return {
      elements2D: Array.from(worldStore.elements2D.values()),
      elements3D: Array.from(worldStore.elements3D.values()),
      dependencyGraph: {
        nodes: Array.from(worldStore.dependencyGraph['nodes'].entries()).map(([id, node]) => ({
          id,
          type: node.type
        })),
        edges: Array.from(worldStore.dependencyGraph['edges'].entries()).flatMap(([from, toSet]) =>
          Array.from(toSet).map(to => ({ from, to }))
        )
      },
      activePlaneId: viewStore.activePlaneId,
      planes: viewStore.planes,
      hingeLines: viewStore.hingeLines,
      view2D: viewStore.view2D,
      processTree: {
        root: processStore.root
      }
    };
  }

  /**
   * Deserialize ProjectDTO and reconstruct application state
   */
  private async deserializeProject(project: ProjectDTO): Promise<void> {
    const worldStore = useWorldStore();
    const processStore = useProcessStore();
    const viewStore = useViewStore();

    // Clear existing state
    worldStore.clear();
    processStore.clear();
    viewStore.clear();

    // Restore elements
    project.elements2D.forEach((el: Element2D) => {
      worldStore.addElement2D(el);
    });

    project.elements3D.forEach((el: Element3D) => {
      worldStore.addElement3D(el);
    });

    // Restore dependency graph
    project.dependencyGraph.nodes.forEach(node => {
      worldStore.dependencyGraph.addNode(node.id, node.type as 'element' | 'action');
    });

    project.dependencyGraph.edges.forEach(edge => {
      worldStore.dependencyGraph.addEdge(edge.from, edge.to);
    });

    // Restore view state
    viewStore.activePlaneId = project.activePlaneId;
    viewStore.planes = project.planes;
    viewStore.hingeLines = project.hingeLines;
    viewStore.view2D = project.view2D;

    // Restore process tree
    processStore.root = project.processTree.root;

    this.isDirty = false;
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  /**
   * Check if project has unsaved changes
   */
  isDirtyProject(): boolean {
    return this.isDirty;
  }
}

// Export singleton instance
export const projectService = new ProjectService();
