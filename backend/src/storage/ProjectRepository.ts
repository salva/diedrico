import path from 'path';
import { FileStorage } from './FileStorage.js';
import type { ProjectDTO, ProjectMetadata } from '../models/Project.js';
import { createEmptyProject } from '../models/Project.js';

/**
 * Repository for Project CRUD operations
 */
export class ProjectRepository {
  private storage: FileStorage;

  constructor(dataDir?: string) {
    const projectsDir = dataDir || path.join(process.cwd(), 'backend', 'data', 'projects');
    this.storage = new FileStorage(projectsDir);
  }

  /**
   * Get filename for project
   */
  private getFilename(projectId: string): string {
    return `${projectId}.json`;
  }

  /**
   * List all projects (metadata only)
   */
  async list(): Promise<ProjectMetadata[]> {
    const files = await this.storage.listFiles();
    const projects: ProjectMetadata[] = [];

    for (const file of files) {
      try {
        const project = await this.storage.readJSON<ProjectDTO>(file);
        projects.push({
          id: project.id,
          name: project.name,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        });
      } catch (error) {
        console.error(`Failed to read project ${file}:`, error);
      }
    }

    return projects.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Get project by ID
   */
  async get(projectId: string): Promise<ProjectDTO | null> {
    try {
      const filename = this.getFilename(projectId);
      return await this.storage.readJSON<ProjectDTO>(filename);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create new project
   */
  async create(name: string): Promise<ProjectDTO> {
    const project = createEmptyProject(name);
    const filename = this.getFilename(project.id);
    await this.storage.writeJSON(filename, project);
    return project;
  }

  /**
   * Update existing project
   */
  async update(projectId: string, updates: Partial<ProjectDTO>): Promise<ProjectDTO> {
    const existing = await this.get(projectId);
    if (!existing) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const updated: ProjectDTO = {
      ...existing,
      ...updates,
      id: projectId, // Ensure ID doesn't change
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };

    const filename = this.getFilename(projectId);
    await this.storage.writeJSON(filename, updated);
    return updated;
  }

  /**
   * Delete project
   */
  async delete(projectId: string): Promise<void> {
    const filename = this.getFilename(projectId);
    await this.storage.deleteFile(filename);
  }

  /**
   * Check if project exists
   */
  async exists(projectId: string): Promise<boolean> {
    const filename = this.getFilename(projectId);
    return await this.storage.exists(filename);
  }
}
