/**
 * Unit tests for Create3DPlaneCommand
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Create3DPlaneCommand, type Create3DPlaneParams } from '@/commands/Create3DPlaneCommand';
import type { Line2DByTwoPoints, Point2DFree } from '@/types/ElementTypes';
import { defaultVisualStyle } from '@/domain/world/VisualStyle';

describe('Create3DPlaneCommand', () => {
  let worldStore: any;
  let viewStore: any;

  beforeEach(() => {
    // Setup mock world store
    worldStore = {
      elements2D: new Map(),
      elements3D: new Map(),
      brokenHingeLines: new Map(),
      dependencyGraph: {
        addNode: () => {},
        hasNode: () => false,
        addEdge: () => {}
      },
      addElement2D: function(element: any) {
        this.elements2D.set(element.id, element);
      },
      addElement3D: function(element: any) {
        this.elements3D.set(element.id, element);
      },
      removeElement2D: function(id: string) {
        this.elements2D.delete(id);
      },
      removeElement3D: function(id: string) {
        this.elements3D.delete(id);
      }
    };

    // Setup mock view store
    viewStore = {
      projectionPlanes: [
        { id: 'plane-h', name: 'P_H' },
        { id: 'plane-v', name: 'P_V' }
      ]
    };
  });

  function createMockPoint(id: string, x: number, y: number, planeId: string): Point2DFree {
    return {
      id,
      kind: 'Point2DFree',
      name: id,
      planeId,
      x,
      y,
      createdBy: 'test-action',
      infeasible: false,
      visualStyle: defaultVisualStyle
    };
  }

  function createMockLine(id: string, point1Id: string, point2Id: string, planeId: string): Line2DByTwoPoints {
    return {
      id,
      kind: 'Line2DByTwoPoints',
      name: id,
      planeId,
      point1Id,
      point2Id,
      createdBy: 'test-action',
      infeasible: false,
      visualStyle: defaultVisualStyle
    };
  }

  it('should create 3D plane from valid traces', () => {
    // Setup: Create horizontal trace on P_H
    const p1h = createMockPoint('p1h', 0, 0, 'plane-h');
    const p2h = createMockPoint('p2h', 10, 0, 'plane-h');
    const traceH = createMockLine('traceH', 'p1h', 'p2h', 'plane-h');

    // Setup: Create vertical trace on P_V
    const p1v = createMockPoint('p1v', 0, 0, 'plane-v');
    const p2v = createMockPoint('p2v', 0, 10, 'plane-v');
    const traceV = createMockLine('traceV', 'p1v', 'p2v', 'plane-v');

    worldStore.elements2D.set('p1h', p1h);
    worldStore.elements2D.set('p2h', p2h);
    worldStore.elements2D.set('traceH', traceH);
    worldStore.elements2D.set('p1v', p1v);
    worldStore.elements2D.set('p2v', p2v);
    worldStore.elements2D.set('traceV', traceV);

    // Execute command
    const params: Create3DPlaneParams = {
      traceHId: 'traceH',
      traceVId: 'traceV',
      actionId: 'action-1',
      name: 'TestPlane'
    };

    const command = new Create3DPlaneCommand(params, worldStore, viewStore);
    const result = command.execute();

    // Verify success
    if (!result.success) {
      console.error('Command failed:', result.error);
    }
    expect(result.success).toBe(true);
    expect(result.outputs?.plane3DId).toBeDefined();
    expect(result.outputs?.bhlId).toBeDefined();
    expect(result.outputs?.bhlProjectionHId).toBeDefined();
    expect(result.outputs?.bhlProjectionVId).toBeDefined();
    expect(result.outputs?.planeName).toBe('TestPlane');
  });

  it('should fail if trace lines not found', () => {
    const params: Create3DPlaneParams = {
      traceHId: 'missing-trace-h',
      traceVId: 'missing-trace-v',
      actionId: 'action-1'
    };

    const command = new Create3DPlaneCommand(params, worldStore, viewStore);
    const result = command.execute();

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should fail if horizontal trace not on P_H', () => {
    // Create trace on wrong plane
    const p1 = createMockPoint('p1', 0, 0, 'plane-v'); // Should be plane-h
    const p2 = createMockPoint('p2', 10, 0, 'plane-v');
    const traceH = createMockLine('traceH', 'p1', 'p2', 'plane-v');

    const p1v = createMockPoint('p1v', 0, 0, 'plane-v');
    const p2v = createMockPoint('p2v', 0, 10, 'plane-v');
    const traceV = createMockLine('traceV', 'p1v', 'p2v', 'plane-v');

    worldStore.elements2D.set('p1', p1);
    worldStore.elements2D.set('p2', p2);
    worldStore.elements2D.set('traceH', traceH);
    worldStore.elements2D.set('p1v', p1v);
    worldStore.elements2D.set('p2v', p2v);
    worldStore.elements2D.set('traceV', traceV);

    const params: Create3DPlaneParams = {
      traceHId: 'traceH',
      traceVId: 'traceV',
      actionId: 'action-1'
    };

    const command = new Create3DPlaneCommand(params, worldStore, viewStore);
    const result = command.execute();

    expect(result.success).toBe(false);
    expect(result.error).toContain('P_H');
  });

  it('should fail if vertical trace not on P_V', () => {
    // Create horizontal trace correctly
    const p1h = createMockPoint('p1h', 0, 0, 'plane-h');
    const p2h = createMockPoint('p2h', 10, 0, 'plane-h');
    const traceH = createMockLine('traceH', 'p1h', 'p2h', 'plane-h');

    // Create vertical trace on wrong plane
    const p1v = createMockPoint('p1v', 0, 0, 'plane-h'); // Should be plane-v
    const p2v = createMockPoint('p2v', 0, 10, 'plane-h');
    const traceV = createMockLine('traceV', 'p1v', 'p2v', 'plane-h');

    worldStore.elements2D.set('p1h', p1h);
    worldStore.elements2D.set('p2h', p2h);
    worldStore.elements2D.set('traceH', traceH);
    worldStore.elements2D.set('p1v', p1v);
    worldStore.elements2D.set('p2v', p2v);
    worldStore.elements2D.set('traceV', traceV);

    const params: Create3DPlaneParams = {
      traceHId: 'traceH',
      traceVId: 'traceV',
      actionId: 'action-1'
    };

    const command = new Create3DPlaneCommand(params, worldStore, viewStore);
    const result = command.execute();

    expect(result.success).toBe(false);
    expect(result.error).toContain('P_V');
  });

  it('should auto-generate plane name if not provided', () => {
    // Setup valid traces
    const p1h = createMockPoint('p1h', 0, 0, 'plane-h');
    const p2h = createMockPoint('p2h', 10, 0, 'plane-h');
    const traceH = createMockLine('traceH', 'p1h', 'p2h', 'plane-h');

    const p1v = createMockPoint('p1v', 0, 0, 'plane-v');
    const p2v = createMockPoint('p2v', 0, 10, 'plane-v');
    const traceV = createMockLine('traceV', 'p1v', 'p2v', 'plane-v');

    worldStore.elements2D.set('p1h', p1h);
    worldStore.elements2D.set('p2h', p2h);
    worldStore.elements2D.set('traceH', traceH);
    worldStore.elements2D.set('p1v', p1v);
    worldStore.elements2D.set('p2v', p2v);
    worldStore.elements2D.set('traceV', traceV);

    const params: Create3DPlaneParams = {
      traceHId: 'traceH',
      traceVId: 'traceV',
      actionId: 'action-1'
      // name not provided
    };

    const command = new Create3DPlaneCommand(params, worldStore, viewStore);
    const result = command.execute();

    expect(result.success).toBe(true);
    expect(result.outputs?.planeName).toMatch(/^Pi\d+$/); // Should be like Pi1, Pi2, etc.
  });

  it('should create BHL with correct naming', () => {
    // Setup valid traces
    const p1h = createMockPoint('p1h', 0, 0, 'plane-h');
    const p2h = createMockPoint('p2h', 10, 0, 'plane-h');
    const traceH = createMockLine('traceH', 'p1h', 'p2h', 'plane-h');

    const p1v = createMockPoint('p1v', 0, 0, 'plane-v');
    const p2v = createMockPoint('p2v', 0, 10, 'plane-v');
    const traceV = createMockLine('traceV', 'p1v', 'p2v', 'plane-v');

    worldStore.elements2D.set('p1h', p1h);
    worldStore.elements2D.set('p2h', p2h);
    worldStore.elements2D.set('traceH', traceH);
    worldStore.elements2D.set('p1v', p1v);
    worldStore.elements2D.set('p2v', p2v);
    worldStore.elements2D.set('traceV', traceV);

    const params: Create3DPlaneParams = {
      traceHId: 'traceH',
      traceVId: 'traceV',
      actionId: 'action-1',
      name: 'Alpha'
    };

    const command = new Create3DPlaneCommand(params, worldStore, viewStore);
    const result = command.execute();

    expect(result.success).toBe(true);
    expect(result.outputs?.bhlName).toBe('BHL_Alpha');
  });

  it('should commit all operations successfully', () => {
    // Setup valid traces
    const p1h = createMockPoint('p1h', 0, 0, 'plane-h');
    const p2h = createMockPoint('p2h', 10, 5, 'plane-h');
    const traceH = createMockLine('traceH', 'p1h', 'p2h', 'plane-h');

    const p1v = createMockPoint('p1v', 0, 0, 'plane-v');
    const p2v = createMockPoint('p2v', 5, 10, 'plane-v');
    const traceV = createMockLine('traceV', 'p1v', 'p2v', 'plane-v');

    worldStore.elements2D.set('p1h', p1h);
    worldStore.elements2D.set('p2h', p2h);
    worldStore.elements2D.set('traceH', traceH);
    worldStore.elements2D.set('p1v', p1v);
    worldStore.elements2D.set('p2v', p2v);
    worldStore.elements2D.set('traceV', traceV);

    const params: Create3DPlaneParams = {
      traceHId: 'traceH',
      traceVId: 'traceV',
      actionId: 'action-1',
      name: 'TestPlane'
    };

    const command = new Create3DPlaneCommand(params, worldStore, viewStore);
    const result = command.execute();
    
    expect(result.success).toBe(true);
    
    // Verify command can be committed
    command.commit();
    expect(command.status).toBe('committed');
  });
});
