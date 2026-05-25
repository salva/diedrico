/**
 * Determinism Tests for ProjectService
 * 
 * Purpose: Verify that deserializing the same project data multiple times
 * produces identical World state every time.
 * 
 * This ensures operations are deterministic (no randomness, no timestamps,
 * no external dependencies).
 * 
 * Reference: Phase 40 Task T439
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '@/domain/world/World';
import { createTestWorld } from '../helpers/worldHelpers';
import { CommandStack } from '@/commands/CommandStack';
import { ProjectService } from '@/services/ProjectService';
import { Command } from '@/commands/Command';
import { Vector3 } from 'three';
import { getHorizontalPlaneId } from '../helpers/worldHelpers';

// Import operations
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
import { AddCircle2DByCenterAndPointOp } from '@/commands/operations/world/AddCircleOp';
import { AddGuide2DPerpendicularToLineOp } from '@/commands/operations/world/AddGuideOp';
import { AddLineLineIntersectionPoint2DOp } from '@/commands/operations/world/AddLineLineIntersectionPoint2DOp';
import { RemovePoint2DOp } from '@/commands/operations/world/RemoveElementOps';
import type { Point2D, FreePoint2D } from '@/domain/world/Point';
import type { Line2D } from '@/domain/world/Line';
import type { Circle2D } from '@/domain/world/Circle';

describe('ProjectService Determinism Tests', () => {
  it('should produce identical World state when deserializing same project 5 times', () => {
    // Step 1: Create a complex project with various operations
    const { world, commandStack } = createTestWorld();
    const planeId = getHorizontalPlaneId(world);
    
    // Create multiple elements
    const cmd1 = new Command('Create points', world);
    const p1Result = cmd1.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 100, 1)));
    const p1Id = p1Result.outputs.pointId;
    
    const p2Result = cmd1.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(200, 100, 1)));
    const p2Id = p2Result.outputs.pointId;
    
    const p3Result = cmd1.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(150, 200, 1)));
    const p3Id = p3Result.outputs.pointId;
    cmd1.commit();
    commandStack.push(cmd1);
    
    // Create lines
    const cmd2 = new Command('Create lines', world);
    const l1Result = cmd2.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p1Id, p2Id));
    const l1Id = l1Result.outputs.lineId;
    
    const l2Result = cmd2.addAndExecute(new AddLine2DByTwoPointsOp(planeId, p2Id, p3Id));
    const l2Id = l2Result.outputs.lineId;
    cmd2.commit();
    commandStack.push(cmd2);
    
    // Create intersection
    const cmd3 = new Command('Create intersection', world);
    const intResult = cmd3.addAndExecute(new AddLineLineIntersectionPoint2DOp(planeId, l1Id, l2Id));
    const intId = intResult.outputs.pointId;
    cmd3.commit();
    commandStack.push(cmd3);
    
    // Create circle
    const cmd4 = new Command('Create circle', world);
    cmd4.addAndExecute(new AddCircle2DByCenterAndPointOp(planeId, p1Id, p3Id));
    cmd4.commit();
    commandStack.push(cmd4);
    
    // Create guide (needs half-hinge line, use first available)
    const halfHingeLines = world.getHalfHingeLines2D(planeId);
    if (halfHingeLines.length > 0) {
      const cmd5 = new Command('Create guide', world);
      cmd5.addAndExecute(new AddGuide2DPerpendicularToLineOp(planeId, halfHingeLines[0].id, p1Id));
      cmd5.commit();
      commandStack.push(cmd5);
    }
    
    // Delete one point
    const cmd6 = new Command('Delete point', world);
    cmd6.addAndExecute(new RemovePoint2DOp(planeId, p3Id));
    cmd6.commit();
    commandStack.push(cmd6);
    
    // Step 2: Serialize the project
    const serialized = ProjectService.serializeCommands(commandStack, world.peekNextId(), 'Determinism Test Project');
    
    // Step 3: Deserialize 5 times and capture World state
    const worldStates: any[] = [];
    
    for (let i = 0; i < 5; i++) {
      const { world: freshWorld, commandStack: freshStack } = createTestWorld();
      
      ProjectService.deserializeCommands(serialized, freshWorld, freshStack);
      
      // Capture World state for comparison
      const state = captureWorldState(freshWorld);
      worldStates.push(state);
    }
    
    // Step 4: Verify all 5 states are identical
    const firstState = worldStates[0];
    
    for (let i = 1; i < worldStates.length; i++) {
      expect(worldStates[i]).toEqual(firstState);
    }
    
    // Step 5: Verify specific properties are deterministic
    // All states should have same number of elements
    worldStates.forEach(state => {
      expect(state.planePointCount).toBe(firstState.planePointCount);
      expect(state.planeLineCount).toBe(firstState.planeLineCount);
      expect(state.planeCircleCount).toBe(firstState.planeCircleCount);
    });
    
    // All states should have same point IDs
    const firstPointIds = firstState.pointIds.sort();
    worldStates.forEach(state => {
      expect(state.pointIds.sort()).toEqual(firstPointIds);
    });
    
    // All states should have same point coordinates
    firstState.points.forEach((point: any, index: number) => {
      worldStates.forEach(state => {
        expect(state.points[index].id).toBe(point.id);
        expect(state.points[index].position).toEqual(point.position);
      });
    });
  });
  
  it('should generate same element IDs across multiple deserializations', () => {
    // Create a simple project
    const { world, commandStack } = createTestWorld();
    const planeId = getHorizontalPlaneId(world);
    
    const cmd = new Command('Create elements', world);
    cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(50, 50, 1)));
    cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(100, 50, 1)));
    cmd.addAndExecute(new AddFreePoint2DOp(planeId, new Vector3(75, 100, 1)));
    cmd.commit();
    commandStack.push(cmd);
    
    const serialized = ProjectService.serializeCommands(commandStack, world.peekNextId(), 'ID Test');
    
    // Deserialize 3 times
    const idSets: string[][] = [];
    
    for (let i = 0; i < 3; i++) {
      const { world: freshWorld, commandStack: freshStack } = createTestWorld();
      
      ProjectService.deserializeCommands(serialized, freshWorld, freshStack);
      
      const freshPlaneId = getHorizontalPlaneId(freshWorld);
      const plane = freshWorld.getProjectionPlaneById(freshPlaneId);
      if (!plane) throw new Error('Plane not found');
      const points = plane.getAllPoints();
      const ids = points.map((p: Point2D) => p.id).sort();
      idSets.push(ids);
    }
    
    // All ID sets should be identical
    expect(idSets[0]).toEqual(idSets[1]);
    expect(idSets[0]).toEqual(idSets[2]);
  });
});

/**
 * Helper: Capture complete World state for comparison
 */
function captureWorldState(world: World): any {
  const planeId = getHorizontalPlaneId(world);
  const plane = world.getProjectionPlaneById(planeId);
  if (!plane) throw new Error('Plane not found');
  
  const points = plane.getAllPoints();
  const lines = plane.getAllLines();
  const circles = plane.getAllCircles();
  
  return {
    planePointCount: points.length,
    planeLineCount: lines.length,
    planeCircleCount: circles.length,
    pointIds: points.map((p: Point2D) => p.id),
    lineIds: lines.map((l: Line2D) => l.id),
    circleIds: circles.map((c: Circle2D) => c.id),
    points: points.map((p: Point2D) => ({
      id: p.id,
      type: p.type,
      position: p.type === 'free' ? {
        x: (p as FreePoint2D).position.x,
        y: (p as FreePoint2D).position.y,
        z: (p as FreePoint2D).position.z
      } : null
    })),
    lines: lines.map((l: Line2D) => ({
      id: l.id,
      variant: l.variant
    })),
    circles: circles.map((c: Circle2D) => ({
      id: c.id,
      centerPointId: c.centerPointId,
      radiusPointId: c.radiusPointId
    }))
  };
}
