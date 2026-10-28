import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { ArgumentCollectorTool } from '@/tools/ArgumentCollectorTool';
import type { ToolArgumentSet } from '@/tools/ToolArgumentCollector';
import type { ToolContext } from '@/tools/ITool';
import { SelectionMask } from '@/types/SelectionMask';
import { createTestWorld, getHorizontalPlane } from '../../helpers/worldHelpers';
import { createToolInteractionReadPort } from '@/application/tools/ToolInteractionReadPort';
import { CanvasInteractionController } from '@/application/canvas/CanvasInteractionController';
import { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';

class Alternatives extends ArgumentCollectorTool {
  readonly name = 'alternatives';
  constructor(readonly sets: ToolArgumentSet[]) { super(); }
  getArgumentSets() { return this.sets; }
  protected buildConstructionIntent(): never { throw new Error('callbacks own execution'); }
}

describe('argument collection eligibility and alternatives', () => {
  it('retains same-named alternatives, rejects invalid matching specs and executes the first valid completed set', () => {
    const { world, operationContext: ctx } = createTestWorld();
    const plane = getHorizontalPlane(world);
    const point = ctx.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 20, 1));
    const rejected = vi.fn(), accepted = vi.fn(() => ({ success: true })), later = vi.fn();
    const tool = new Alternatives([
      { arguments: [{ name: 'operand', mask: SelectionMask.point(), validator: () => ({ valid: false }) }], execute: rejected },
      { arguments: [{ name: 'operand', mask: SelectionMask.point() }], setValidator: () => ({ valid: false }), execute: rejected },
      { arguments: [{ name: 'operand', mask: SelectionMask.point() }], execute: accepted },
      { arguments: [{ name: 'operand', mask: SelectionMask.point() }], execute: later },
    ]);
    const readPort = createToolInteractionReadPort(world, ctx.realizations);
    expect(tool.isElementEligible(point.id, plane.id, readPort)).toBe(true);
    const hitTest = vi.fn((_pos, _radius, _context, _mask, eligible) => eligible(point.id) ? { elementId: point.id, elementType: 'point' } : null);
    const context = { planeId: plane.id, planeCoords: new Vector3(10, 20, 1), canvasCoords: { x: 10, y: 20 }, readPort,
      interactionQuery: { hitTest }, viewport: { zoom: 1, panX: 0, panY: 0 }, commandSink: {} } as unknown as ToolContext;
    const controller = new CanvasInteractionController({ toolReadPort: readPort, hover: { setHoveredElement: vi.fn(), clearHover: vi.fn() },
      selection: {} as never, viewport: {} as never, toolLifecycle: { setToolStepMessage: vi.fn() }, getElementLabel: () => 'point' });
    (controller as unknown as { currentTool: Alternatives }).currentTool = tool;
    const hover = controller.updateHover(new Vector3(10, 20, 1), { hitTest } as unknown as CanvasInteractionQuery, plane.id, undefined, context.viewport);
    expect(hover.hitElementId).toBe(point.id);
    expect(tool.handleClick(context).success).toBe(true);
    expect(accepted).toHaveBeenCalledTimes(1);
    expect(rejected).not.toHaveBeenCalled(); expect(later).not.toHaveBeenCalled();
    expect(hitTest.mock.calls.map(call => call[1])).toEqual([50, 50]);
    expect(tool.getState().collected).toEqual([]);
  });
});
