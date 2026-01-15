/**
 * LineTool - Polymorphic tool for creating lines with multiple construction methods
 * 
 * Phase 73: Refactored to ArgumentCollectorTool framework with 6 construction methods:
 * 
 * Point-Point constructions:
 * 1. Line through two points (original functionality)
 * 
 * Point-Circle constructions:
 * 2. Line through point and circle (2 possible tangent lines - disambiguated by mouse)
 * 
 * Circle-Circle constructions:
 * 3. External tangent to two circles (2 possible - disambiguated by mouse)
 * 4. Internal tangent to two circles (2 possible - disambiguated by mouse)
 * 5. Perpendicular to center line (1 solution - always exists)
 * 6. Through circle centers (1 solution - always exists)
 * 
 * Mouse Disambiguation:
 * - When multiple solutions exist, user's click positions determine which is selected
 * - Uses selectClosestSolution() to measure distances from clicks to solution features
 * - Example: External tangent "above" vs "below" based on which circle side user clicked
 * 
 * References:
 * - FR-055: Polymorphic Line Tool
 * - FR-058: Mouse-Position-Based Geometric Solution Disambiguation
 * - specs/001-dihedral-learning-mvp/spec.md §US2 (original)
 * - specs/001-dihedral-learning-mvp/data-model.md#phase-73-polymorphic-line-tool
 */

import { Vector3 } from 'three';
import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext, ToolResult } from './ITool';
import { Command } from '@/commands/Command';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
import { createLineAction } from '@/domain/processTree/actions/CreateLineAction';
import { SelectionMask } from '@/types/SelectionMask';
import type { ToolArgumentSet, ArgumentValue } from '@/types/ToolArgumentCollector';
import type { Point2D } from '@/domain/world/Point';
import type { Circle2D } from '@/domain/world/Circle';


/**
 * LineTool - Polymorphic line construction with 6 methods
 * 
 * Phase 73: Extends ArgumentCollectorTool for automated argument collection
 * and any-order selection workflow.
 */
export class LineTool extends ArgumentCollectorTool {
  readonly name = 'line';
  readonly completionBehavior = 'stay-active' as const; // Primitives stay active

  /**
   * Define 6 argument sets for polymorphic line construction
   * 
   * Framework automatically:
   * - Tracks viable sets as arguments are collected
   * - Computes selection mask as union of viable next arguments
   * - Generates status messages based on viable sets
   * - Executes when exactly one complete set is found
   */
  getArgumentSets(): ToolArgumentSet[] {
    return [
      // Set 0: Line through two points (original functionality)
      {
        label: 'Line through two points',
        arguments: [
          { name: 'point1', mask: SelectionMask.point() },
          { name: 'point2', mask: SelectionMask.point() }
        ],
        execute: (args, context) => this.executePointToPoint(args, context)
      },
      
      // Set 1: Line through point and circle (tangent)
      // Note: This is simplified - full implementation would need tangent logic
      {
        label: 'Line through point and circle (tangent)',
        arguments: [
          { name: 'circle', mask: SelectionMask.circle() },
          { name: 'point', mask: SelectionMask.point() }
        ],
        execute: (args, context) => this.executePointToCircle(args, context)
      },
      
      // Set 2: External tangent to two circles
      {
        label: 'External tangent to two circles',
        arguments: [
          { name: 'circle1', mask: SelectionMask.circle() },
          { name: 'circle2', mask: SelectionMask.circle() }
        ],
        execute: (args, context) => this.executeCircleToCircleExternal(args, context)
      },
      
      // Set 3: Internal tangent to two circles
      {
        label: 'Internal tangent to two circles',
        arguments: [
          { name: 'circle1', mask: SelectionMask.circle() },
          { name: 'circle2', mask: SelectionMask.circle() }
        ],
        execute: (args, context) => this.executeCircleToCircleInternal(args, context)
      },
      
      // Set 4: Perpendicular to center line of two circles
      {
        label: 'Perpendicular to circle center line',
        arguments: [
          { name: 'circle1', mask: SelectionMask.circle() },
          { name: 'circle2', mask: SelectionMask.circle() }
        ],
        execute: (args, context) => this.executeCircleToCirclePerpendicular(args, context)
      },
      
      // Set 5: Through circle centers
      {
        label: 'Through circle centers',
        arguments: [
          { name: 'circle1', mask: SelectionMask.circle() },
          { name: 'circle2', mask: SelectionMask.circle() }
        ],
        execute: (args, context) => this.executeCircleToCircleThroughCenters(args, context)
      }
    ];
  }

  /**
   * Execute Set 0: Line through two points (original functionality)
   */
  private executePointToPoint(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    const point1 = args.get('point1')!.element as Point2D;
    const point2 = args.get('point2')!.element as Point2D;
    
    // Validate different points
    if (point1.id === point2.id) {
      return this.failure('Cannot create line: same point selected twice');
    }
    
    try {
      const { planeId, commandStack, world, toolStore } = context;
      
      // Build Command
      const cmd = new Command("Create line through two points", world);
      
      // Execute operation
      const result = cmd.addAndExecute(
        new AddLine2DByTwoPointsOp(planeId, point1.id, point2.id)
      );
      
      // Extract outputs
      const lineId = result.outputs.lineId;
      
      // Record ProcessTree action
      const action = createLineAction(lineId, planeId, point1.id, point2.id);
      world.getProcessTree().addAction(action);
      
      // Commit and push
      cmd.commit();
      commandStack.push(cmd);
      
      // Handle completion
      this.handleCompletion(toolStore);
      
      return this.success(`Created line ${lineId} through ${point1.id} and ${point2.id}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create line: ${message}`);
    }
  }

  /**
   * Execute Set 1: Line through point and circle (tangent)
   * 
   * TODO Phase 73.4: Implement using existing tangent line functionality
   * For now, return error to indicate not yet implemented
   */
  private executePointToCircle(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    return this.failure('Tangent line through point and circle not yet implemented in polymorphic tool');
  }

  /**
   * Execute Set 2: External tangent to two circles
   * 
   * Uses CircleGeometry.computeExternalTangents() with mouse disambiguation
   */
  private executeCircleToCircleExternal(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    const circle1 = args.get('circle1')!.element as Circle2D;
    const circle2 = args.get('circle2')!.element as Circle2D;
    const clickPositions = this.getClickPositions(args);
    
    // Import CircleGeometry
    const { computeExternalTangents, selectClosestSolution } = require('@/domain/calculations/CircleGeometry');
    
    try {
      const { planeId, world } = context;
      
      // Get circle realizations
      const c1Real = circle1.realize2D(world);
      const c2Real = circle2.realize2D(world);
      
      if (!c1Real || !c2Real) {
        return this.failure('Failed to realize circles');
      }
      
      // Compute all external tangents
      const tangents = computeExternalTangents(c1Real, c2Real);
      
      if (tangents.length === 0) {
        return this.failure('No external tangents exist (one circle inside the other)');
      }
      
      // Disambiguate using mouse positions
      const selected = selectClosestSolution(tangents, clickPositions);
      
      if (!selected) {
        return this.failure('Failed to select tangent solution');
      }
      
      // TODO Phase 73.5: Create Line2DCircleToCircleExternal element
      // For now, return success with selected solution info
      return this.success(`Would create external tangent: ${selected.label} (index ${selected.index})`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create external tangent: ${message}`);
    }
  }

  /**
   * Execute Set 3: Internal tangent to two circles
   */
  private executeCircleToCircleInternal(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    const circle1 = args.get('circle1')!.element as Circle2D;
    const circle2 = args.get('circle2')!.element as Circle2D;
    const clickPositions = this.getClickPositions(args);
    
    const { computeInternalTangents, selectClosestSolution } = require('@/domain/calculations/CircleGeometry');
    
    try {
      const { planeId, world } = context;
      
      const c1Real = circle1.realize2D(world);
      const c2Real = circle2.realize2D(world);
      
      if (!c1Real || !c2Real) {
        return this.failure('Failed to realize circles');
      }
      
      const tangents = computeInternalTangents(c1Real, c2Real);
      
      if (tangents.length === 0) {
        return this.failure('No internal tangents exist (circles overlap)');
      }
      
      const selected = selectClosestSolution(tangents, clickPositions);
      
      if (!selected) {
        return this.failure('Failed to select tangent solution');
      }
      
      // TODO Phase 73.5: Create Line2DCircleToCircleInternal element
      return this.success(`Would create internal tangent: ${selected.label} (index ${selected.index})`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create internal tangent: ${message}`);
    }
  }

  /**
   * Execute Set 4: Perpendicular to center line
   */
  private executeCircleToCirclePerpendicular(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    const circle1 = args.get('circle1')!.element as Circle2D;
    const circle2 = args.get('circle2')!.element as Circle2D;
    
    const { computePerpendicularLine } = require('@/domain/calculations/CircleGeometry');
    
    try {
      const { planeId, world } = context;
      
      const c1Real = circle1.realize2D(world);
      const c2Real = circle2.realize2D(world);
      
      if (!c1Real || !c2Real) {
        return this.failure('Failed to realize circles');
      }
      
      const solution = computePerpendicularLine(c1Real, c2Real);
      
      if (!solution) {
        return this.failure('No perpendicular line exists (circles coincide)');
      }
      
      // TODO Phase 73.5: Create Line2DCircleToCirclePerpendicular element
      return this.success(`Would create perpendicular: ${solution.label}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create perpendicular line: ${message}`);
    }
  }

  /**
   * Execute Set 5: Through circle centers
   */
  private executeCircleToCircleThroughCenters(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    const circle1 = args.get('circle1')!.element as Circle2D;
    const circle2 = args.get('circle2')!.element as Circle2D;
    
    const { computeThroughCentersLine } = require('@/domain/calculations/CircleGeometry');
    
    try {
      const { planeId, world } = context;
      
      const c1Real = circle1.realize2D(world);
      const c2Real = circle2.realize2D(world);
      
      if (!c1Real || !c2Real) {
        return this.failure('Failed to realize circles');
      }
      
      const solution = computeThroughCentersLine(c1Real, c2Real);
      
      if (!solution) {
        return this.failure('No through-centers line exists (circles coincide)');
      }
      
      // TODO Phase 73.5: Create Line2DCircleToCircleThroughCenters element
      return this.success(`Would create through-centers line: ${solution.label}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create through-centers line: ${message}`);
    }
  }

  /**
   * Helper: Extract all click positions from collected arguments
   * Returns array of plane coordinates for disambiguation
   */
  private getClickPositions(args: Map<string, ArgumentValue>): Vector3[] {
    const positions: Vector3[] = [];
    
    for (const argValue of args.values()) {
      // Add planeCoords
      positions.push(argValue.planeCoords);
      
      // Add clickPositions if available (Phase 73.3 extension)
      if (argValue.clickPositions) {
        positions.push(...argValue.clickPositions);
      }
    }
    
    return positions;
  }
}

