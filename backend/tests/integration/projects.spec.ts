import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/server.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_DATA_DIR = path.join(process.cwd(), 'backend', 'data', 'projects');

describe('Projects API Integration Tests', () => {
  beforeAll(async () => {
    // Ensure data directory exists
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
  });

  beforeEach(async () => {
    // Clean directory before each test
    const files = await fs.readdir(TEST_DATA_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(TEST_DATA_DIR, file));
      }
    }
  });

  afterAll(async () => {
    // Clean up all projects
    try {
      const files = await fs.readdir(TEST_DATA_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(TEST_DATA_DIR, file));
        }
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('POST /api/projects', () => {
    it('should create a new project with default state', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Test Project' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Project');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Verify default planes
      expect(response.body.planes).toHaveLength(2);
      expect(response.body.planes[0].id).toBe('P_H');
      expect(response.body.planes[1].id).toBe('P_V');

      // Verify default hinge line
      expect(response.body.hingeLines).toHaveLength(1);
      expect(response.body.hingeLines[0].id).toBe('HL_HV');
      expect(response.body.hingeLines[0].plane1Id).toBe('P_H');
      expect(response.body.hingeLines[0].plane2Id).toBe('P_V');

      // Verify empty elements
      expect(response.body.elements2D).toEqual([]);
      expect(response.body.elements3D).toEqual([]);

      // Verify default view state
      expect(response.body.activePlaneId).toBe('P_H');
      expect(response.body.view2D).toEqual({
        panX: 0,
        panY: 0,
        zoom: 1.0
      });

      // Verify empty dependency graph
      expect(response.body.dependencyGraph.nodes).toEqual([]);
      expect(response.body.dependencyGraph.edges).toEqual([]);

      // Verify process tree root
      expect(response.body.processTree.root).toHaveProperty('id');
      expect(response.body.processTree.root.type).toBe('process');
      expect(response.body.processTree.root.children).toEqual([]);
    });

    it('should reject empty project name', async () => {
      await request(app)
        .post('/api/projects')
        .send({ name: '' })
        .expect(400);
    });

    it('should reject missing project name', async () => {
      await request(app)
        .post('/api/projects')
        .send({})
        .expect(400);
    });

    it('should trim project name', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: '  Test Project  ' })
        .expect(201);

      expect(response.body.name).toBe('Test Project');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should load existing project by ID', async () => {
      // Create a project first
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'Load Test Project' })
        .expect(201);

      const projectId = createResponse.body.id;

      // Load the project
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(200);

      expect(response.body.id).toBe(projectId);
      expect(response.body.name).toBe('Load Test Project');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent project', async () => {
      await request(app)
        .get('/api/projects/non-existent-id')
        .expect(404);
    });

    it('should preserve all project state', async () => {
      // Create project
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'State Test' })
        .expect(201);

      const projectId = createResponse.body.id;

      // Load and verify complete state
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(200);

      expect(response.body.planes).toHaveLength(2);
      expect(response.body.hingeLines).toHaveLength(1);
      expect(response.body.processTree).toHaveProperty('root');
      expect(response.body.dependencyGraph).toHaveProperty('nodes');
      expect(response.body.dependencyGraph).toHaveProperty('edges');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project with new state', async () => {
      // Create project
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'Update Test' })
        .expect(201);

      const projectId = createResponse.body.id;
      const originalUpdatedAt = createResponse.body.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update project
      const updateData = {
        elements2D: [
          {
            id: 'p1',
            kind: 'Point2DFree',
            name: 'P1',
            x: 100,
            y: 200,
            planeId: 'P_H',
            createdBy: 'action_1',
            infeasible: null,
            visualStyle: {
              color: '#000000',
              lineWidth: 2,
              lineStyle: 'solid',
              opacity: 1.0,
              visible: true,
              inherited: false
            }
          }
        ],
        view2D: {
          panX: 50,
          panY: 100,
          zoom: 1.5
        }
      };

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.id).toBe(projectId);
      expect(response.body.elements2D).toHaveLength(1);
      expect(response.body.elements2D[0].id).toBe('p1');
      expect(response.body.view2D.panX).toBe(50);
      expect(response.body.view2D.zoom).toBe(1.5);

      // Verify updatedAt changed
      expect(response.body.updatedAt).not.toBe(originalUpdatedAt);

      // Verify createdAt didn't change
      expect(response.body.createdAt).toBe(createResponse.body.createdAt);
    });

    it('should return 404 for non-existent project', async () => {
      await request(app)
        .put('/api/projects/non-existent-id')
        .send({ elements2D: [] })
        .expect(404);
    });

    it('should preserve project ID during update', async () => {
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'ID Test' })
        .expect(201);

      const projectId = createResponse.body.id;

      // Try to update with different ID
      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .send({ id: 'different-id', name: 'Changed' })
        .expect(200);

      // ID should not change
      expect(response.body.id).toBe(projectId);
    });
  });

  describe('GET /api/projects', () => {
    it('should list all projects', async () => {
      // Create multiple projects
      await request(app)
        .post('/api/projects')
        .send({ name: 'Project 1' })
        .expect(201);

      await request(app)
        .post('/api/projects')
        .send({ name: 'Project 2' })
        .expect(201);

      await request(app)
        .post('/api/projects')
        .send({ name: 'Project 3' })
        .expect(201);

      // List projects
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('createdAt');
      expect(response.body[0]).toHaveProperty('updatedAt');

      // Should not include full project data
      expect(response.body[0]).not.toHaveProperty('elements2D');
      expect(response.body[0]).not.toHaveProperty('planes');
    });

    it('should return empty array when no projects exist', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should sort projects by updatedAt descending', async () => {
      // Create projects with delays to ensure different timestamps
      const p1 = await request(app)
        .post('/api/projects')
        .send({ name: 'First' })
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 10));

      const p2 = await request(app)
        .post('/api/projects')
        .send({ name: 'Second' })
        .expect(201);

      await new Promise(resolve => setTimeout(resolve, 10));

      const p3 = await request(app)
        .post('/api/projects')
        .send({ name: 'Third' })
        .expect(201);

      // List projects
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      // Most recently updated should be first
      expect(response.body[0].id).toBe(p3.body.id);
      expect(response.body[1].id).toBe(p2.body.id);
      expect(response.body[2].id).toBe(p1.body.id);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete existing project', async () => {
      // Create project
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'Delete Test' })
        .expect(201);

      const projectId = createResponse.body.id;

      // Delete project
      await request(app)
        .delete(`/api/projects/${projectId}`)
        .expect(204);

      // Verify project is gone
      await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent project', async () => {
      await request(app)
        .delete('/api/projects/non-existent-id')
        .expect(404);
    });
  });
});
