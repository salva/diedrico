import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { RuntimeSession } from '@/application/appShell/RuntimeSession';
import { createToolInteractionReadPort } from '@/application/tools/ToolInteractionReadPort';
import type { ITool, ToolContext } from '@/tools/ITool';
import type { ToolCommandSink } from '@/tools/ToolCommandIntents';
import { createTestWorld, getHorizontalOrigin, getHorizontalOriginId, getHorizontalPlaneId, getVerticalPlaneId, getElement2D } from '../../../helpers/worldHelpers';

describe('ToolInteractionReadPort', () => {
  it('exposes only caller-mapped tool read and realization behavior from the runtime-owned world', () => {
    const { world, operationContext } = createTestWorld();
    const readPort = createToolInteractionReadPort(world, operationContext.realizations);
    const horizontalPlaneId = getHorizontalPlaneId(world);
    const verticalPlaneId = getVerticalPlaneId(world);
    const origin = getHorizontalOrigin(world);

    expect(readPort.getProjectionPlaneById(horizontalPlaneId)?.id).toBe(horizontalPlaneId);
    expect(readPort.getElement2D(getHorizontalOriginId(world))?.id).toBe(origin.id);
    expect(readPort.getPoint2D(origin.id)?.id).toBe(origin.id);
    expect(readPort.realizePoint2D(origin)?.feasible).toBe(true);
    expect(readPort.areProjectionPlanesDistinct(horizontalPlaneId, verticalPlaneId)).toBe(true);
    expect(readPort.areProjectionPlanesDistinct(horizontalPlaneId, horizontalPlaneId)).toBe(false);

    const exposedKeys = Object.keys(readPort).sort();
    expect(exposedKeys).toEqual([
      'areProjectionPlanesDistinct',
      'getCircle2D',
      'getElement2D',
      'getExpectedT2PrimeLineRealization',
      'getLine2D',
      'getPoint2D',
      'getProjectionPlaneById',
      'realizeCircle2D',
      'realizeLine2D',
      'realizePoint2D',
    ]);
    expect(readPort).not.toHaveProperty('getAllProjectionPlanes');
    expect(readPort).not.toHaveProperty('query');
    expect(readPort).not.toHaveProperty('traverse');
  });
});

describe('RuntimeSession tool invocation read context', () => {
  it('exposes a tool read port for controller-owned tool invocation without raw World', () => {
    const session = new RuntimeSession();
    session.initializeDefaultWorldIfNeeded();
    const canvasViewPort = session.canvasViewPort();
    const readPort = session.toolInteractionReadPort();
    const commandSink = fakeCommandSink();
    let capturedContext: ToolContext | undefined;
    const tool: ITool = {
      name: 'capture-tool-context',
      handleClick: vi.fn((context: ToolContext) => {
        capturedContext = context;
        return { success: true };
      }),
    };

    const result = tool.handleClick({
      planeId: canvasViewPort.getActivePlaneId()!,
      planeCoords: new Vector3(1, 2, 1),
      canvasCoords: { x: 10, y: 20 },
      commandSink,
      readPort,
      interactionQuery: { hitTest: vi.fn(() => null) },
      paperToPlaneTransform: undefined,
      viewport: { zoom: 1, panX: 0, panY: 0 },
    });

    expect(result).toEqual({ success: true });
    expect(tool.handleClick).toHaveBeenCalledTimes(1);
    expect(capturedContext?.commandSink).toBe(commandSink);
    expect(capturedContext?.readPort.getProjectionPlaneById(capturedContext.planeId)?.id).toBe(capturedContext?.planeId);
    expect(capturedContext).not.toHaveProperty('world');
  });
});

function fakeCommandSink(): ToolCommandSink {
  return {
    executeConstructionIntent: vi.fn(() => ({ success: true })),
    startFreePointMove: vi.fn(() => null),
  } as unknown as ToolCommandSink;
}
