import express, { Request, Response } from 'express';
import { ProjectRepository } from '../storage/ProjectRepository.js';

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
