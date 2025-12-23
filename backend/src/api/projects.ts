import express, { Request, Response } from 'express';
import { ProjectRepository } from '../storage/ProjectRepository.js';


























































































































































































































export const projectService = new ProjectService();// Export singleton instance}  }    return this.isDirty;  isDirtyProject(): boolean {   */   * Check if project has unsaved changes  /**  }    return this.currentProjectId;  getCurrentProjectId(): string | null {   */   * Get current project ID  /**  }    this.isDirty = false;    processStore.root = project.processTree.root;    // Restore process tree    viewStore.view2D = project.view2D;    viewStore.hingeLines = project.hingeLines;    viewStore.planes = project.planes;    viewStore.activePlaneId = project.activePlaneId;    // Restore view state    });      worldStore.dependencyGraph.addEdge(edge.from, edge.to);    project.dependencyGraph.edges.forEach(edge => {    });      worldStore.dependencyGraph.addNode(node.id, node.type as 'element' | 'action');    project.dependencyGraph.nodes.forEach(node => {    // Restore dependency graph    });      worldStore.addElement3D(el);    project.elements3D.forEach((el: Element3D) => {    });      worldStore.addElement2D(el);    project.elements2D.forEach((el: Element2D) => {    // Restore elements    viewStore.clear();    processStore.clear();    worldStore.clear();    // Clear existing state    const viewStore = useViewStore();    const processStore = useProcessStore();    const worldStore = useWorldStore();  private async deserializeProject(project: ProjectDTO): Promise<void> {   */   * Deserialize ProjectDTO and reconstruct application state  /**  }    };      }        root: processStore.root      processTree: {      view2D: viewStore.view2D,      hingeLines: viewStore.hingeLines,      planes: viewStore.planes,      activePlaneId: viewStore.activePlaneId,      },        )          Array.from(toSet).map(to => ({ from, to }))        edges: Array.from(worldStore.dependencyGraph['edges'].entries()).flatMap(([from, toSet]) =>        })),          type: node.type          id,        nodes: Array.from(worldStore.dependencyGraph['nodes'].entries()).map(([id, node]) => ({      dependencyGraph: {      elements3D: Array.from(worldStore.elements3D.values()),      elements2D: Array.from(worldStore.elements2D.values()),    return {    const viewStore = useViewStore();    const processStore = useProcessStore();    const worldStore = useWorldStore();  private serializeProject(): Partial<ProjectDTO> {   */   * Serialize current application state to ProjectDTO  /**  }    }, 500);      }        }          console.error('Autosave failed:', error);        } catch (error) {          console.log('Project autosaved');          await this.saveProject();        try {      if (this.isDirty && this.currentProjectId) {    this.autosaveTimeout = setTimeout(async () => {        }      clearTimeout(this.autosaveTimeout);    if (this.autosaveTimeout) {  private scheduleAutosave(): void {   */   * Schedule autosave after 500ms of inactivity  /**  }    this.scheduleAutosave();    this.isDirty = true;  markDirty(): void {   */   * Mark project as dirty (needs save)  /**  }    }      this.currentProjectId = null;    if (this.currentProjectId === projectId) {        }      throw new Error(`Failed to delete project: ${response.statusText}`);    if (!response.ok && response.status !== 204) {        });      method: 'DELETE'    const response = await fetch(`${API_BASE}/projects/${projectId}`, {  async deleteProject(projectId: string): Promise<void> {   */   * Delete project  /**  }    return response.json();    this.isDirty = false;        }      throw new Error(`Failed to save project: ${response.statusText}`);    if (!response.ok) {        });      body: JSON.stringify(projectData)      headers: { 'Content-Type': 'application/json' },      method: 'PUT',    const response = await fetch(`${API_BASE}/projects/${this.currentProjectId}`, {    const projectData = this.serializeProject();    }      throw new Error('No project loaded');    if (!this.currentProjectId) {  async saveProject(): Promise<ProjectDTO> {   */   * Save current project  /**  }    return project;    await this.deserializeProject(project);    this.currentProjectId = projectId;    const project = await response.json();        }      throw new Error(`Failed to load project: ${response.statusText}`);    if (!response.ok) {    const response = await fetch(`${API_BASE}/projects/${projectId}`);  async loadProject(projectId: string): Promise<ProjectDTO> {   */   * Load project by ID  /**  }    return project;    this.currentProjectId = project.id;    const project = await response.json();        }      throw new Error(`Failed to create project: ${response.statusText}`);    if (!response.ok) {        });      body: JSON.stringify({ name })      headers: { 'Content-Type': 'application/json' },      method: 'POST',    const response = await fetch(`${API_BASE}/projects`, {  async createProject(name: string): Promise<ProjectDTO> {   */   * Create a new project  /**  }    return response.json();    }      throw new Error(`Failed to list projects: ${response.statusText}`);    if (!response.ok) {    const response = await fetch(`${API_BASE}/projects`);  async listProjects(): Promise<ProjectMetadata[]> {   */   * List all projects  /**  private isDirty = false;  private autosaveTimeout: NodeJS.Timeout | null = null;  private currentProjectId: string | null = null;export class ProjectService { */ * Service for managing project persistence/**const API_BASE = 'http://localhost:3000/api';import type { Element2D, Element3D } from '../types/ElementTypes';import { useViewStore } from '../stores/viewStore';import { useProcessStore } from '../stores/processStore';
const router = express.Router();
const projectRepo = new ProjectRepository();

/**
 * GET /api/projects
 * List all projects (metadata only)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await projectRepo.list();
    res.json(projects);
  } catch (error: any) {
    console.error('Failed to list projects:', error);
    res.status(500).json({ error: 'Failed to list projects', message: error.message });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await projectRepo.create(name.trim());
    res.status(201).json(project);
  } catch (error: any) {
    console.error('Failed to create project:', error);
    res.status(500).json({ error: 'Failed to create project', message: error.message });
  }
});

/**
 * GET /api/projects/:id
 * Get project by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await projectRepo.get(id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error: any) {
    console.error('Failed to get project:', error);
    res.status(500).json({ error: 'Failed to get project', message: error.message });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validate that project exists
    const exists = await projectRepo.exists(id);
    if (!exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = await projectRepo.update(id, updates);
    res.json(project);
  } catch (error: any) {
    console.error('Failed to update project:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: 'Failed to update project', message: error.message });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate that project exists
    const exists = await projectRepo.exists(id);
    if (!exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    await projectRepo.delete(id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Failed to delete project:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: 'Failed to delete project', message: error.message });
  }
});

export default router;
