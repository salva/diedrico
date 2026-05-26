/**
 * CreateProjectionPlaneTool - Creates auxiliary projection planes (Phase 82)
 * 
 * Three-argument workflow:
 * 1. T1 (hinge trace): Any line on any plane
 * 2. T2 (other trace): Any line on DIFFERENT plane than T1 (validator checks)
 * 3. T2' (position line): Any line on SAME plane as T1 (validator checks, warns if far from expected)
 * 
 * Creates:
 * - Plane3DFromTraces (from T1 and T2)
 * - AuxiliaryProjectionPlane (with T1, T2, T2' trace dependencies)
 * - HingeLine (between T1's plane and new projection plane)
 * - ProcessTree action
 * 
 * Validation:
 * - T1 and T2 must be on different planes
 * - T2' must be on same plane as T1
 * - T2' position warning: If far from expected position (computed via computeExpectedT2Prime)
 * 
 */

import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ToolArgumentSet, ArgumentValue, CollectionContext } from '@/types/ToolArgumentCollector';
import { SelectionMask } from '@/types/SelectionMask';
import { computeExpectedT2Prime, computeLineDistance } from '@/utils/projectionPlaneUtils';
import type { Element2D } from '@/domain/world/Element2D';

/**
 * Tool for creating auxiliary projection planes using ArgumentCollectorTool framework
 * 
 * Pattern: Extends ArgumentCollectorTool with 3-argument set and validators
 * - Base class handles argument collection, viable set tracking, execution
 * - Subclass defines argument specs, validators, and operation logic
 */
export class CreateProjectionPlaneTool extends ArgumentCollectorTool {
  readonly name = 'createprojectionplane';
  readonly completionBehavior = 'stay-active' as const;

  /**
   * Distance threshold for T2' position warning (in plane units)
   * If T2' is further than this from expected position, show warning
   */
  private readonly POSITION_WARNING_THRESHOLD = 10;

  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        arguments: [
          { 
            name: 't1HingeTrace', 
            mask: SelectionMask.line()
          },
          { 
            name: 't2OtherTrace', 
            mask: SelectionMask.line(),
            validator: (element: Element2D, context: CollectionContext) => {
              // T2 must be on DIFFERENT plane than T1
              const t1 = context.collected.get('t1HingeTrace');
              if (!t1) return { valid: true }; // T1 not yet collected
              
              const t1PlaneId = t1.element!.planeId;
              const t2PlaneId = element.planeId;
              
              if (t1PlaneId === t2PlaneId) {
                return { 
                  valid: false, 
                  error: 'T2 must be on a DIFFERENT plane than T1' 
                };
              }
              
              return { valid: true };
            }
          },
          { 
            name: 't2PrimePositionLine', 
            mask: SelectionMask.line(),
            validator: (element: Element2D, context: CollectionContext) => {
              // T2' must be on SAME plane as T1
              const t1 = context.collected.get('t1HingeTrace');
              if (!t1) return { valid: true }; // T1 not yet collected
              
              const t1PlaneId = t1.element!.planeId;
              const t2PrimePlaneId = element.planeId;
              
              if (t1PlaneId !== t2PrimePlaneId) {
                return { 
                  valid: false, 
                  error: 'T2\' must be on the SAME plane as T1' 
                };
              }
              
              // Compute expected T2' position and check distance
              const t2 = context.collected.get('t2OtherTrace');
              if (!t2) return { valid: true }; // T2 not yet collected, can't compute expected position
              
              const t1LineId = t1.element!.id;
              const t2LineId = t2.element!.id;
              const t2PrimeLineId = element.id;
              
              try {
                const expected = computeExpectedT2Prime(
                  t1LineId,
                  t2LineId,
                  context.world
                );
                
                if (!expected) {
                  // Expected position could not be computed (e.g., parallel traces)
                  return { valid: true, warning: 'Could not compute expected T2\' position' };
                }
                
                // Get realized T2' line to compute distance
                const t2PrimeLineModel = context.world.getLine2D(t2PrimeLineId);
                if (!t2PrimeLineModel) {
                  return { valid: true, warning: 'Could not validate T2\' position' };
                }
                
                const t2PrimeRealization = t2PrimeLineModel.realize2D(context.world);
                if (!t2PrimeRealization) {
                  return { valid: true, warning: 'Could not validate T2\' position' };
                }
                
                // Compute distance between selected T2' and expected T2'
                const distance = computeLineDistance(t2PrimeRealization, expected);
                
                if (distance > this.POSITION_WARNING_THRESHOLD) {
                  return { 
                    valid: true, 
                    warning: `T2' is ${distance.toFixed(1)} units from expected position (unfolding T2)` 
                  };
                }
                
                return { valid: true };
              } catch (error) {
                // Error computing expected position - allow but warn
                return { valid: true, warning: 'Could not validate T2\' position' };
              }
            }
          }
        ],
        setValidator: (args: Map<string, ArgumentValue>, context: CollectionContext) => {
          // Additional set-level validation (if needed)
          // Currently all validation is done at argument level
          const t1 = args.get('t1HingeTrace');
          const t2 = args.get('t2OtherTrace');
          const t2Prime = args.get('t2PrimePositionLine');
          
          if (!t1 || !t2 || !t2Prime) {
            return { valid: false, error: 'Missing required arguments' };
          }
          
          // Verify planes exist
          const t1Plane = context.world.getProjectionPlaneById(t1.element!.planeId);
          const t2Plane = context.world.getProjectionPlaneById(t2.element!.planeId);
          
          if (!t1Plane || !t2Plane) {
            return { valid: false, error: 'One or more projection planes not found' };
          }
          
          return { valid: true };
        }
      }
    ];
  }



  protected getCommandDescription(): string {
    return "Create auxiliary projection plane";
  }
}
