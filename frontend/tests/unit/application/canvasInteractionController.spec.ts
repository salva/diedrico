import { describe, expect, it, vi } from 'vitest';
import { Matrix3, Vector3 } from 'three';
import { CanvasInteractionController, type CanvasSelectionPort, type ToolLifecyclePort, type ViewportPort, type HoverPort } from '@/application/canvas/CanvasInteractionController';
import { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';
import type { CanvasQueryItem } from '@/application/canvasPresentation/CanvasPresentationModel';
import type { FreePointMoveSession, ToolCommandSink } from '@/tools/ToolCommandIntents';
import type { ToolInteractionReadPort } from '@/tools/ToolInteractionReadPort';

const viewport = { zoom: 1, panX: 0, panY: 0 };
const paperToPlaneTransform = new Matrix3().identity();

const noopToolLifecycle: ToolLifecyclePort = {
  completeTool: vi.fn(),
  setToolStepMessage: vi.fn(),
};

const noopToolReadPort = {} as ToolInteractionReadPort;

const noopViewport: ViewportPort = {
  adjustZoom: vi.fn(),
  adjustPan: vi.fn(),
  setZoom: vi.fn(),
  setPan: vi.fn(),
};

const noopHover: HoverPort = {
  setHoveredElement: vi.fn(),
  clearHover: vi.fn(),
};

function makeSelection(): CanvasSelectionPort & {
  selectSingle: ReturnType<typeof vi.fn>;
  addToSelection: ReturnType<typeof vi.fn>;
  clearSelection: ReturnType<typeof vi.fn>;
} {
  return {
    selectSingle: vi.fn(),
    addToSelection: vi.fn(),
    clearSelection: vi.fn(),
  };
}

function makeController(selection?: CanvasSelectionPort): CanvasInteractionController {
  return new CanvasInteractionController({
    selection: selection ?? makeSelection(),
    toolLifecycle: noopToolLifecycle,
    toolReadPort: noopToolReadPort,
    viewport: noopViewport,
    hover: noopHover,
    getElementLabel: vi.fn(() => ''),
  });
}

function makeQuery(items: CanvasQueryItem[]): CanvasInteractionQuery {
  return new CanvasInteractionQuery(items);
}

function pointItem(id: string, x = 0, y = 0): CanvasQueryItem {
  return {
    id: `point-${id}`,
    kind: 'point',
    elementId: id,
    elementType: 'point',
    planeId: 'plane-a',
    selectable: true,
    planeGeometry: { type: 'point', position: new Vector3(x, y, 1), visualRadiusPixels: 5 },
  };
}

describe('CanvasInteractionController', () => {
  it('applies select-click policy for replace, extend, and empty clicks', () => {
    const selection = makeSelection();
    const controller = makeController(selection);
    const interactionQuery = makeQuery([pointItem('p1')]);

    controller.handleSelectClick({
      canvasPos: new Vector3(0, 0, 1),
      activePlaneId: 'plane-a',
      paperToPlaneTransform,
      viewport,
      interactionQuery,
      shiftKey: false,
    });
    expect(selection.selectSingle).toHaveBeenCalledWith('p1');

    controller.handleSelectClick({
      canvasPos: new Vector3(0, 0, 1),
      activePlaneId: 'plane-a',
      paperToPlaneTransform,
      viewport,
      interactionQuery,
      shiftKey: true,
    });
    expect(selection.addToSelection).toHaveBeenCalledWith('p1');

    controller.handleSelectClick({
      canvasPos: new Vector3(100, 100, 1),
      activePlaneId: 'plane-a',
      paperToPlaneTransform,
      viewport,
      interactionQuery,
      shiftKey: false,
    });
    expect(selection.clearSelection).toHaveBeenCalledOnce();
  });

  it('starts, previews, and commits a movable free-point drag after threshold movement', () => {
    const selection = makeSelection();
    const controller = makeController(selection);
    const session: FreePointMoveSession = {
      preview: vi.fn(() => ({ success: true })),
      commit: vi.fn(() => ({ success: true })),
      cancel: vi.fn(),
    };
    const sink = {} as ToolCommandSink;

    const started = controller.tryStartFreePointDrag({
      canvasPos: new Vector3(0, 0, 1),
      activePlaneId: 'plane-a',
      paperToPlaneTransform,
      viewport,
      interactionQuery: makeQuery([pointItem('p1')]),
      commandSink: sink,
      getMoveSession: vi.fn(() => session),
      startClientX: 10,
      startClientY: 20,
    });

    expect(started).toBe(true);
    expect(selection.selectSingle).toHaveBeenCalledWith('p1');
    expect(controller.getFreePointDragState()).toMatchObject({ active: true, planeId: 'plane-a', pointId: 'p1', moved: false });

    expect(controller.previewFreePointDrag({ clientX: 11, clientY: 21, planePosition: new Vector3(1, 1, 1) })).toBeNull();
    expect(session.preview).not.toHaveBeenCalled();

    const previewResult = controller.previewFreePointDrag({ clientX: 15, clientY: 20, planePosition: new Vector3(2, 3, 1) });
    expect(previewResult?.success).toBe(true);
    expect(session.preview).toHaveBeenCalledWith(new Vector3(2, 3, 1));

    const finish = controller.finishFreePointDrag();
    expect(finish).toMatchObject({ active: true, moved: true, result: { success: true } });
    expect(session.commit).toHaveBeenCalledOnce();
    expect(session.cancel).not.toHaveBeenCalled();
    expect(controller.getFreePointDragState().active).toBe(false);
  });

  it('cancels a free-point drag that never moved', () => {
    const controller = makeController();
    const session: FreePointMoveSession = {
      preview: vi.fn(() => ({ success: true })),
      commit: vi.fn(() => ({ success: true })),
      cancel: vi.fn(),
    };

    controller.tryStartFreePointDrag({
      canvasPos: new Vector3(0, 0, 1),
      activePlaneId: 'plane-a',
      paperToPlaneTransform,
      viewport,
      interactionQuery: makeQuery([pointItem('p1')]),
      commandSink: {} as ToolCommandSink,
      getMoveSession: () => session,
      startClientX: 0,
      startClientY: 0,
    });

    const finish = controller.finishFreePointDrag();
    expect(finish).toEqual({ active: true, moved: false, result: undefined });
    expect(session.cancel).toHaveBeenCalledOnce();
    expect(session.commit).not.toHaveBeenCalled();
  });

  it('manages tool lifecycle through setToolName', () => {
    const toolLifecycle: ToolLifecyclePort = {
      completeTool: vi.fn(),
      setToolStepMessage: vi.fn(),
    };
    const controller = new CanvasInteractionController({
      selection: makeSelection(),
      toolLifecycle,
      toolReadPort: noopToolReadPort,
      viewport: noopViewport,
      hover: noopHover,
      getElementLabel: vi.fn(() => ''),
    });

    controller.setToolName('point');
    expect(controller.isSelectMode()).toBe(false);
    expect(controller.getCurrentTool()).not.toBeNull();
    expect(controller.getCurrentTool()?.name).toBe('point');

    controller.setToolName('select');
    expect(controller.isSelectMode()).toBe(true);
  });

  it('handles canvas click in select mode', () => {
    const selection = makeSelection();
    const controller = makeController(selection);
    const interactionQuery = makeQuery([pointItem('p1')]);

    controller.setToolName('select');
    controller.handleCanvasClick({
      canvasPos: new Vector3(0, 0, 1),
      canvasPoint: { x: 0, y: 0 },
      activePlaneId: 'plane-a',
      planePos: new Vector3(0, 0, 1),
      paperToPlaneTransform,
      viewport,
      interactionQuery,
      commandSink: {} as ToolCommandSink,
    });

    expect(selection.selectSingle).toHaveBeenCalledWith('p1');
  });

  it('manages viewport pan state', () => {
    const controller = makeController();

    expect(controller.isViewportPanning()).toBe(false);

    controller.startViewportPan(10, 20);
    expect(controller.isViewportPanning()).toBe(true);
    expect(controller.getViewportPanState()).toEqual({ active: true, startX: 10, startY: 20, moved: false });

    controller.updateViewportPan(15, 25, 1.0);
    expect(noopViewport.adjustPan).toHaveBeenCalledWith(5, 5);
    expect(controller.getViewportPanState()).toEqual({ active: true, startX: 15, startY: 25, moved: true });

    expect(controller.endViewportPan()).toEqual({ active: true, moved: true });
    expect(controller.isViewportPanning()).toBe(false);

    controller.cancelViewportPan();
    expect(controller.isViewportPanning()).toBe(false);
  });
});
