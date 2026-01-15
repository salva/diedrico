/**
 * SegmentTool - Polymorphic tool for creating finite line segments with multiple construction methods
 * 
 * Phase 74.2: Refactored to ArgumentCollectorTool framework with 4 construction methods:
 * 
 * Point-Point constructions:
 * 1. Segment between two points (original functionality)
 * 
 * Point-Line constructions:
 * 2. Perpendicular segment from point to line (1 solution - always exists)
 * 
 * Point-Circle constructions:
 * 3. Tangent segment from point to circle (2 possible - disambiguated by mouse)
 * 
 * Circle-Circle constructions:
 * 4. External tangent segment (2 possible - disambiguated by mouse)
 * 5. Internal tangent segment (2 possible - disambiguated by mouse)
 * 6. Perpendicular segment (1 solution - always exists)
 * 7. Through centers segment (1 solution - always exists)
 * 
 * Mouse Disambiguation:
 * - When multiple solutions exist, user's click positions determine which is selected
 * - Uses selectClosestSolution() to measure distances from clicks to solution features
 * 
 * References:
 * - specs/001-dihedral-learning-mvp/spec.md §FR-056 (Polymorphic Segment Tool)
 * - specs/001-dihedral-learning-mvp/data-model.md Phase 74
 * - specs/001-dihedral-learning-mvp/tasks.md T1230-T1249
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolContext, ToolResult } from './ITool';
import type { ToolArgumentSet, ArgumentValue } from '@/types/ToolArgumentCollector';
import type { Point2D } from '@/domain/world/Point';
import type { Line2D } from '@/domain/world/Line';
import type { Circle2D } from '@/domain/world/Circle';
import { SelectionMask } from '@/types/SelectionMask';
import { Command } from '@/commands/Command';
import { 
  AddSegment2DByPointsOp,
  AddSegment2DPointToLineOp,
  AddSegment2DPointToCircleTangentOp,
  AddSegment2DCircleToCircleExternalOp,
  AddSegment2DCircleToCircleInternalOp,
  AddSegment2DCircleToCirclePerpendicularOp,
  AddSegment2DCircleToCircleThroughCentersOp
} from '@/commands/operations/world/AddSegmentOp';
import { createSegmentAction } from '@/domain/processTree/actions/CreateSegmentAction';

/**
 * SegmentTool - Polymorphic segment construction with 4+ construction methods
 * 
 * Phase 74.2: Extends ArgumentCollectorTool for automated argument collection
 * and any-order selection workflow.
 */
export class SegmentTool extends ArgumentCollectorTool {
  readonly name = 'segment';
  readonly completionBehavior = 'stay-active' as const; // Primitives stay active

  /**
   * Define 7 argument sets for polymorphic segment construction
   * 
   * Framework automatically:
   * - Tracks viable sets as arguments are collected
   * - Computes selection mask as union of viable next arguments
   * - Generates status messages based on viable sets
   * - Executes when exactly one complete set is found
   */
  getArgumentSets(): ToolArgumentSet[] {
    return [
      // Set 0: Segment between two points (original functionality)
      {
        label: 'Segment between two points',
        arguments: [
          { name: 'point1', mask: SelectionMask.point() },
          { name: 'point2', mask: SelectionMask.point() }
        ],
        execute: (args, context) => this.executePointToPoint(args, context)
      },
      
      // Set 1: Perpendicular segment from point to line (any order)
      {
        label: 'Perpendicular segment to line',
        arguments: [
          { name: 'point', mask: SelectionMask.point() },
          { name: 'line', mask: SelectionMask.anyLine() }
        ],
        execute: (args, context) => this.executePointToLine(args, context)
      },
      
      // Set 2: Tangent segment from point to circle (any order)
      {
        label: 'Tangent segment to circle',
        arguments: [
          { name: 'point', mask: SelectionMask.point() },
          { name: 'circle', mask: SelectionMask.circle() }
        ],
        execute: (args, context) => this.executePointToCircle(args, context)
      },
      
      // Set 3: External tangent segment between two circles
      {
        label: 'External tangent segment between circles',
        arguments: [
          { name: 'circle1', mask: SelectionMask.circle() },
          { name: 'circle2', mask: SelectionMask.circle() }
        ],
        execute: (args, context) => this.executeCircleToCircleExternal(args, context)
      },
      
      // Set 4: Internal tangent segment between two circles
      {
        label: 'Internal tangent segment between circles',
        arguments: [
          { name: 'circle1', mask: SelectionMask.circle() },
          { name: 'circle2', mask: SelectionMask.circle() }
        ],
        execute: (args, context) => this.executeCircleToCircleInternal(args, context)
      },
      
      // Set 5: Perpendicular segment between circles
      {
        label: 'Perpendicular segment between circles',
        arguments: [
          { name: 'circle1', mask: SelectionMask.circle() },
          { name: 'circle2', mask: SelectionMask.circle() }
        ],
        execute: (args, context) => this.executeCircleToCirclePerpendicular(args, context)
      },
      
      // Set 6: Segment through circle centers
      {
        label: 'Segment through circle centers',
        arguments: [
          { name: 'circle1', mask: SelectionMask.circle() },
          { name: 'circle2', mask: SelectionMask.circle() }
        ],
        execute: (args, context) => this.executeCircleToCircleThroughCenters(args, context)
      }
    ];
  }

  /**
   * Execute Set 0: Segment between two points (original functionality)
   */
  private executePointToPoint(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    const { world, planeId, commandStack } = context;
    
    const point1 = args.get('point1')!.element as Point2D;
    const point2 = args.get('point2')!.element as Point2D;
    
    // Validate different points
    if (point1.id === point2.id) {
      return this.failure('Cannot create segment: same point selected twice');
    }
    
    try {
      const cmd = new Command("Create segment", world);
      const result = cmd.addAndExecute(new AddSegment2DByPointsOp(planeId, point1.id, point2.id));
      
      const segmentId = result.outputs.segmentId;
      
      // Record ProcessTree action
      const action = createSegmentAction(segmentId, planeId, point1.id, point2.id);
      world.getProcessTree().addAction(action);
      
      cmd.commit();
      commandStack.push(cmd);
      
      return this.success(`Created segment ${segmentId} between ${point1.id} and ${point2.id}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create segment: ${message}`);
    }
  }

  /**
   * Execute Set 1: Perpendicular segment from point to line
   */
  private executePointToLine(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    const { world, planeId, commandStack } = context;
    
    const point = args.get('point')!.element as Point2D;
    const line = args.get('line')!.element as Line2D;
    
    try {
      const cmd = new Command("Create perpendicular segment", world);
      const result = cmd.addAndExecute(new AddSegment2DPointToLineOp(planeId, point.id, line.id));
      
      const segmentId = result.outputs.segmentId;
      
      // Record ProcessTree action (use generic format with point/line inputs)
      const action = createSegmentAction(segmentId, planeId, point.id, line.id);
      world.getProcessTree().addAction(action);
      
      cmd.commit();
      commandStack.push(cmd);
      
      return this.success(`Created perpendicular segment ${segmentId} from ${point.id} to ${line.id}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create perpendicular segment: ${message}`);
    }
  }

  /**
   * Execute Set 2: Tangent segment from point to circle
   * 
   * Uses mouse disambiguation to select between two possible tangent segments
   */
  private executePointToCircle(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    const { world, planeId, commandStack } = context;
    const { selectClosestSolution } = require('@/types/GeometricSolution');
    
    const point = args.get('point')!.element as Point2D;
    const circle = args.get('circle')!.element as Circle2D;
    
    // Get click positions for disambiguation
    const clickPositions = [
      args.get('point')!.clickPosition!,
      args.get('circle')!.clickPosition!
    ];
    
    try {
      // Get circle and point realizations
      const plane = world.getProjectionPlaneById(planeId);
      const pointReal = point.realize2D(world);
      const circleReal = circle.realize2D(world);
      
      if (!pointReal || !circleReal) {
        return this.failure('Cannot realize point or circle');
      }
      
      // Check if point is outside circle
      const distPC = pointReal.position.distanceTo(circleReal.center);
      const radius = circleReal.getRadius();
      
      if (distPC <= radius + 1e-6) {
        return this.failure('Point must be outside circle for tangent segment');
      }
      
      // Create solution objects for both tangent options
      const solutions = [
        { index: 0, touchPoint: null }, // Computed by segment realize2D
        { index: 1, touchPoint: null }
      ];
      
      // Use simple distance-based selection (select index 0 if click closer to circle, 1 otherwise)
      const avgClickDist = clickPositions.reduce((sum, pos) => sum + pos.distanceTo(circleReal.center), 0) / 2;
      const tangentIndex = avgClickDist < distPC ? 0 : 1;
      
      const cmd = new Command("Create tangent segment", world);
      const result = cmd.addAndExecute(
        new AddSegment2DPointToCircleTangentOp(planeId, point.id, circle.id, tangentIndex as 0 | 1)
      );
      
      const segmentId = result.outputs.segmentId;
      
      // Record ProcessTree action (use generic format with point/circle inputs)
      const action = createSegmentAction(segmentId, planeId, point.id, circle.id);
      world.getProcessTree().addAction(action);
      
      cmd.commit();
      commandStack.push(cmd);
      
      return this.success(`Created tangent segment ${segmentId} from ${point.id} to ${circle.id}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create tangent segment: ${message}`);
    }
  }

  /**
   * Execute Set 3: External tangent segment between two circles
   * 
   * Uses mouse disambiguation with CircleGeometry.computeExternalTangents()
   */
  private executeCircleToCircleExternal(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    const { world, planeId, commandStack } = context;
    const { computeExternalTangents } = require('@/domain/calculations/CircleGeometry');
    const { selectClosestSolution } = require('@/types/GeometricSolution');
    
    const circle1 = args.get('circle1')!.element as Circle2D;
    const circle2 = args.get('circle2')!.element as Circle2D;
    
    // Validate different circles
    if (circle1.id === circle2.id) {
      return this.failure('Cannot create tangent: same circle selected twice');
    }
    
    // Get click positions for disambiguation
    const clickPositions = [
      args.get('circle1')!.clickPosition!,
      args.get('circle2')!.clickPosition!
    ];
    
    try {
      // Get circle realizations
      const c1Real = circle1.realize2D(world);
      const c2Real = circle2.realize2D(world);
      
      if (!c1Real || !c2Real) {
        return this.failure('Cannot realize circles');
      }
      
      // Compute all external tangents
      const tangents = computeExternalTangents(c1Real, c2Real);
      
      if (tangents.length === 0) {
        return this.failure('No external tangents exist (circles overlap)');
      }
      
      // Disambiguate using mouse positions
      const selected = selectClosestSolution(tangents, clickPositions);
      
      if (!selected) {
        return this.failure('Failed to select tangent solution');
      }
      
      const tangentIndex = tangents.indexOf(selected.solution) as 0 | 1;
      
      const cmd = new Command("Create external tangent segment", world);
      const result = cmd.addAndExecute(
        new AddSegment2DCircleToCircleExternalOp(planeId, circle1.id, circle2.id, tangentIndex)
      );
      
      const segmentId = result.outputs.segmentId;
      
      // Record ProcessTree action (use generic format with circle inputs)
      const action = createSegmentAction(segmentId, planeId, circle1.id, circle2.id);
      world.getProcessTree().addAction(action);
      
      cmd.commit();
      commandStack.push(cmd);
      
      return this.success(`Created external tangent segment ${segmentId} between ${circle1.id} and ${circle2.id}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create external tangent segment: ${message}`);
    }
  }

  /**
   * Execute Set 4: Internal tangent segment between two circles
   */
  private executeCircleToCircleInternal(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    const { world, planeId, commandStack } = context;
    const { computeInternalTangents } = require('@/domain/calculations/CircleGeometry');
    const { selectClosestSolution } = require('@/types/GeometricSolution');
    
    const circle1 = args.get('circle1')!.element as Circle2D;
    const circle2 = args.get('circle2')!.element as Circle2D;
    
    if (circle1.id === circle2.id) {
      return this.failure('Cannot create tangent: same circle selected twice');
    }
    
    const clickPositions = [
      args.get('circle1')!.clickPosition!,
      args.get('circle2')!.clickPosition!
    ];
    
    try {
      const c1Real = circle1.realize2D(world);
      const c2Real = circle2.realize2D(world);
      
      if (!c1Real || !c2Real) {
        return this.failure('Cannot realize circles');
      }
      
      const tangents = computeInternalTangents(c1Real, c2Real);
      
      if (tangents.length === 0) {
        return this.failure('No internal tangents exist (circles too close or overlapping)');
      }
      
      const selected = selectClosestSolution(tangents, clickPositions);
      
      if (!selected) {
        return this.failure('Failed to select tangent solution');
      }
      
      const tangentIndex = tangents.indexOf(selected.solution) as 0 | 1;
      
      const cmd = new Command("Create internal tangent segment", world);
      const result = cmd.addAndExecute(
        new AddSegment2DCircleToCircleInternalOp(planeId, circle1.id, circle2.id, tangentIndex)
      );
      
      const segmentId = result.outputs.segmentId;
      
      // Record ProcessTree action (use generic format with circle inputs)
      const action = createSegmentAction(segmentId, planeId, circle1.id, circle2.id);
      world.getProcessTree().addAction(action);
      
      cmd.commit();
      commandStack.push(cmd);
      
      return this.success(`Created internal tangent segment ${segmentId} between ${circle1.id} and ${circle2.id}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create internal tangent segment: ${message}`);
    }
  }

  /**
   * Execute Set 5: Perpendicular segment between circles
   */
  private executeCircleToCirclePerpendicular(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    const { world, planeId, commandStack } = context;
    
    const circle1 = args.get('circle1')!.element as Circle2D;
    const circle2 = args.get('circle2')!.element as Circle2D;
    
    if (circle1.id === circle2.id) {
      return this.failure('Cannot create segment: same circle selected twice');
    }
    
    try {
      const cmd = new Command("Create perpendicular segment", world);
      const result = cmd.addAndExecute(
        new AddSegment2DCircleToCirclePerpendicularOp(planeId, circle1.id, circle2.id)
      );
      
      const segmentId = result.outputs.segmentId;
      
      // Record ProcessTree action (use generic format with circle inputs)
      const action = createSegmentAction(segmentId, planeId, circle1.id, circle2.id);
      world.getProcessTree().addAction(action);
      
      cmd.commit();
      commandStack.push(cmd);
      
      return this.success(`Created perpendicular segment ${segmentId} between ${circle1.id} and ${circle2.id}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create perpendicular segment: ${message}`);
    }
  }

  /**
   * Execute Set 6: Segment through circle centers
   */
  private executeCircleToCircleThroughCenters(args: Map<string, ArgumentValue>, context: ToolContext): ToolResult {
    const { world, planeId, commandStack } = context;
    
    const circle1 = args.get('circle1')!.element as Circle2D;
    const circle2 = args.get('circle2')!.element as Circle2D;
    
    if (circle1.id === circle2.id) {
      return this.failure('Cannot create segment: same circle selected twice');
    }
    
    try {
      const cmd = new Command("Create segment through centers", world);
      const result = cmd.addAndExecute(
        new AddSegment2DCircleToCircleThroughCentersOp(planeId, circle1.id, circle2.id)
      );
      
      const segmentId = result.outputs.segmentId;
      
      // Record ProcessTree action (use generic format with circle inputs)
      const action = createSegmentAction(segmentId, planeId, circle1.id, circle2.id);
      world.getProcessTree().addAction(action);
      
      cmd.commit();
      commandStack.push(cmd);
      
      return this.success(`Created segment ${segmentId} through centers of ${circle1.id} and ${circle2.id}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.failure(`Failed to create segment through centers: ${message}`);
    }
  }
}
