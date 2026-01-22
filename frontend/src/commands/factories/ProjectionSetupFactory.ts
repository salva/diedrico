/**
 * ProjectionSetupFactory - Factory for creating complete projection plane setups
 * 
 * Provides reusable construction logic for the 14-step geometric procedure that creates
 * traces T1, T2, and T2' with proper geometric unfolding.
 * 
 * Used by:
 * - InteractiveProjectionSetupTool (user selects points)
 * - QuickProjectionSetupTool (uses predefined points)
 * 
 * Reference: specs/001-dihedral-learning-mvp/example-setups.md
 */

import { Command } from '@/commands/Command';
import type { ToolContext } from '@/tools/ITool';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { IntersectionSequenceFactory } from './IntersectionSequenceFactory';
import { LineSequenceFactory } from './LineSequenceFactory';
import { CircleSequenceFactory } from './CircleSequenceFactory';
import { PlaneSequenceFactory } from '@/services/factories/PlaneSequenceFactory';
import { AddAuxiliaryProjectionPlaneOp } from '@/commands/operations/world/AddAuxiliaryProjectionPlaneOp';
import { AddHingeLineOp } from '@/commands/operations/world/InitializationOps';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { createProjectionPlaneAction } from '@/domain/processTree/actions/CreateProjectionPlaneAction';

/**
 * Construct complete projection plane setup following the 14-step procedure
 * 
 * Creates T1, T2, and T2' with proper geometric unfolding computation.
 * 
 * @param cmd - Command to add operations to
 * @param context - Tool execution context
 * @param a1Id - Point A1 on P_H
 * @param a2Id - Point A2 on P_H
 * @param b1Id - Point B1 on P_V
 */
export function constructProjectionPlaneSetup(
  cmd: Command,
  context: ToolContext,
  a1Id: string,
  a2Id: string,
  b1Id: string
): void {
  const { world } = context;
  
  const P_H = world.getAllProjectionPlanes().find(p => p.name === 'P_H');
  const P_V = world.getAllProjectionPlanes().find(p => p.name === 'P_V');
  
  if (!P_H || !P_V) {
    throw new Error('Standard projection planes not found');
  }

  // Find the hinge line between P_H and P_V
  const hingeLines = world.getAllHingeLines();
  const hingeLine = hingeLines.find(hl => 
    (hl.plane1Id === P_H.id && hl.plane2Id === P_V.id) ||
    (hl.plane1Id === P_V.id && hl.plane2Id === P_H.id)
  );
  if (!hingeLine) {
    throw new Error('Hinge line between P_H and P_V not found');
  }
  const hingeLineId = hingeLine.id;

  // Get the HalfHingeLine2D on P_H for intersection operations
  const halfHingeLineH = P_H.getAllLines().find(
    line => line instanceof HalfHingeLine2D && (line as any).hingeLineId === hingeLineId
  ) as any;
  if (!halfHingeLineH) {
    throw new Error('Half hinge line on P_H not found');
  }
  const halfHingeLineHId = halfHingeLineH.id;

  // Step 2: L1 = line through A1 and A2 (this will be T1)
  const l1Result = LineSequenceFactory.createLineByTwoPoints(cmd, P_H.id!, a1Id, a2Id);
  const l1Id = l1Result.lineId;
  
  const l1Line = world.getLine2D(l1Id);
  if (l1Line) l1Line.label = 'T1';

  // Step 3: A3 = intersection of L1 and HL_HV (auto-creates sibling B2 on P_V)
  const a3Result = IntersectionSequenceFactory.createLineLineIntersection(
    cmd, P_H.id!, l1Id, halfHingeLineHId, world
  );
  const a3Id = a3Result.pointId;
  const b2Id = a3Result.siblingPointId!;

  // Step 5: L2 = line through B1 and B2 (this will be T2)
  const l2Result = LineSequenceFactory.createLineByTwoPoints(cmd, P_V.id!, b1Id, b2Id);
  const l2Id = l2Result.lineId;
  
  const l2Line = world.getLine2D(l2Id);
  if (l2Line) l2Line.label = 'T2';

  // --- Phase 2: Compute T2' by geometric unfolding ---

  // Step 6: L3 = line perpendicular to L1 (the hinge trace), passing through A1
  const l3Result = LineSequenceFactory.createPerpendicularLine(cmd, P_H.id!, l1Id, a1Id);
  const l3Id = l3Result.lineId;

  // Step 7: C1 = intersection of L3 and HL_HV (auto-creates sibling on P_V)
  const c1Result = IntersectionSequenceFactory.createLineLineIntersection(
    cmd, P_H.id!, l3Id, halfHingeLineHId, world
  );
  const c1SiblingId = c1Result.siblingPointId!;

  // Step 8: L4 = perpendicular guide in P_V, perpendicular to HL_HV, passing through C1's sibling
  
  // L4 is perpendicular to HL_HV (which is horizontal), so it's vertical
  // Find half hinge line on P_V
  const halfHingeLineV = P_V.getAllLines().find(
    line => line instanceof HalfHingeLine2D && (line as any).hingeLineId === hingeLineId
  ) as any;
  if (!halfHingeLineV) {
    throw new Error('Half hinge line on P_V not found');
  }
  const halfHingeLineVId = halfHingeLineV.id;
  const l4Result = LineSequenceFactory.createPerpendicularLine(cmd, P_V.id!, halfHingeLineVId, c1SiblingId);
  const l4Id = l4Result.lineId;

  // Step 9: C2 = intersection of L4 and L2
  const c2Result = IntersectionSequenceFactory.createLineLineIntersection(
    cmd, P_V.id!, l4Id, l2Id, world
  );
  const c2Id = c2Result.pointId;

  // Step 10: D1 = circle in P_V with center at B2 and radius to C2
  const d1Result = CircleSequenceFactory.createCircleByCenterAndPoint(cmd, P_V.id!, b2Id, c2Id);
  const d1Id = d1Result.circleId;

  // Step 11: C3 = intersection of D1 and HL_HV (auto-creates sibling on P_H)
  const c3Result = IntersectionSequenceFactory.createLineCircleIntersection(
    cmd, P_V.id!, halfHingeLineVId, d1Id, 0, world
  );
  const c3SiblingId = c3Result.siblingPointId!;
  
  // Step 12: D2 = circle in P_H with center at A3 and radius to C3's sibling
  const d2Result = CircleSequenceFactory.createCircleByCenterAndPoint(cmd, P_H.id!, a3Id, c3SiblingId);
  const d2Id = d2Result.circleId;

  // Step 13: C4 = intersection of D2 and L3
  const c4Result = IntersectionSequenceFactory.createLineCircleIntersection(
    cmd, P_H.id!, l3Id, d2Id, 0, world
  );
  const c4Id = c4Result.pointId;

  // Step 14: L5 = line through A3 and C4 (this will be T2')
  const l5Result = LineSequenceFactory.createLineByTwoPoints(cmd, P_H.id!, a3Id, c4Id);
  const l5Id = l5Result.lineId;
  
  const l5Line = world.getLine2D(l5Id);
  if (l5Line) l5Line.label = 'T2\'';

  // === Create the auxiliary projection plane ===
  
  // Step 15: Create 3D plane from T1 (L1) and T2 (L2)
  const { planeId: plane3DId } = PlaneSequenceFactory.create3DPlaneFromTraces(
    cmd,
    l1Id,  // T1
    l2Id,  // T2
    P_H.id!,
    P_V.id!,
    'Plane Q'
  );

  // Step 16: Create auxiliary projection plane with trace dependencies
  const projPlaneResult = cmd.addAndExecute(new AddAuxiliaryProjectionPlaneOp(
    plane3DId,
    l1Id,   // T1 (hinge trace)
    l2Id,   // T2 (other trace)
    l5Id,   // T2' (position line)
    'P_A1'  // Name for the auxiliary projection plane
  ));
  const projPlaneId = projPlaneResult.outputs.planeId as string;

  // Step 17: Create hinge line between T1's plane (P_H) and new projection plane
  cmd.addAndExecute(new AddHingeLineOp(
    l1Id,   // T1
    P_H.id!,
    projPlaneId
  ));

  // Step 18: Record in ProcessTree
  const action = createProjectionPlaneAction(
    projPlaneId,
    l1Id,   // T1
    l2Id,   // T2
    l5Id    // T2'
  );
  cmd.addAndExecute(new AddProcessTreeActionOp(action));
}
