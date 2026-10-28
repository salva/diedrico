import { Vector3, type Matrix3 } from 'three';
import type { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';
import type { FreePointMoveSession, ToolCommandResult, ToolCommandSink } from '@/tools/ToolCommandIntents';
import type { ToolInteractionReadPort } from '@/tools/ToolInteractionReadPort';
import type { ToolType } from '@/application/tools/ToolTypes';
import type { SelectionMask } from '@/types/SelectionMask';
import { supportsPlanePositionInput, supportsToolArgumentInput, type CanvasTool, type ToolResult } from '@/tools/ITool';
import type { ParsedToolArgumentInput, ToolArgumentInputRequest } from '@/types/ToolArgumentInput';
import { createCanvasTool } from '@/application/tools/createCanvasTool';

export interface CanvasSelectionPort {
  selectSingle(elementId: string): void;
  addToSelection(elementId: string): void;
  clearSelection(): void;
}

export interface ToolLifecyclePort {
  setToolStepMessage(message: string): void;
}

export interface ViewportPort {
  adjustZoom(delta: number, focusX: number, focusY: number): void;
  adjustPan(dx: number, dy: number): void;
  setZoom(zoom: number): void;
  setPan(x: number, y: number): void;
}

export interface HoverPort {
  setHoveredElement(elementId: string, elementType: string, label: string, temporary: boolean): void;
  clearHover(): void;
}

export interface CanvasInteractionDependencies {
  selection: CanvasSelectionPort;
  toolLifecycle: ToolLifecyclePort;
  toolReadPort: ToolInteractionReadPort;
  viewport: ViewportPort;
  hover: HoverPort;
  getElementLabel(elementId: string, elementType: string, planeId?: string): string;
}

export interface SelectClickRequest {
  canvasPos: Vector3;
  activePlaneId: string;
  paperToPlaneTransform: Matrix3 | undefined;
  viewport: { zoom: number; panX: number; panY: number };
  interactionQuery: CanvasInteractionQuery;
  shiftKey: boolean;
}

export interface CanvasClickRequest {
  canvasPos: Vector3;
  canvasPoint: { x: number; y: number };
  activePlaneId: string;
  planePos: Vector3;
  paperToPlaneTransform: Matrix3 | undefined;
  viewport: { zoom: number; panX: number; panY: number };
  interactionQuery: CanvasInteractionQuery;
  commandSink: ToolCommandSink;
}

export interface PlanePositionInputRequest {
  activePlaneId: string;
  planePos: Vector3;
  commandSink: ToolCommandSink;
  readPort: ToolInteractionReadPort;
  interactionQuery: CanvasInteractionQuery;
  paperToPlaneTransform: Matrix3 | undefined;
  viewport: { zoom: number; panX: number; panY: number };
}

export interface ToolArgumentInputSubmitRequest {
  activePlaneId: string;
  commandSink: ToolCommandSink;
  readPort: ToolInteractionReadPort;
  interactionQuery: CanvasInteractionQuery;
  paperToPlaneTransform: Matrix3 | undefined;
  viewport: { zoom: number; panX: number; panY: number };
  input: ParsedToolArgumentInput;
}

export interface MouseDownRequest {
  canvasPos: Vector3;
  activePlaneId: string;
  paperToPlaneTransform: Matrix3 | undefined;
  viewport: { zoom: number; panX: number; panY: number };
  interactionQuery: CanvasInteractionQuery;
  commandSink: ToolCommandSink;
  getMoveSession(args: { planeId: string; pointId: string; commandSink: ToolCommandSink }): FreePointMoveSession | null;
  startClientX: number;
  startClientY: number;
}

export interface PreviewFreePointDragRequest {
  clientX: number;
  clientY: number;
  planePosition: Vector3 | null;
}

export interface FreePointDragState {
  readonly active: boolean;
  readonly planeId: string | null;
  readonly pointId: string | null;
  readonly moved: boolean;
}

export interface HoverResult {
  hitElementId: string | undefined;
  hitElementType: string | undefined;
  hitLabel: string | undefined;
  isSnapPoint: boolean;
  snapChanged: boolean;
}

export interface ViewportPanState {
  readonly active: boolean;
  readonly startX: number;
  readonly startY: number;
  readonly moved: boolean;
}

interface MutableFreePointDragState extends FreePointDragState {
  moved: boolean;
  moveSession: FreePointMoveSession | null;
  startClientX: number;
  startClientY: number;
}

export class CanvasInteractionController {
  private readonly deps: CanvasInteractionDependencies;

  private currentTool: CanvasTool | null = null;
  private currentToolName: ToolType = 'select';
  private pointDrag: MutableFreePointDragState = CanvasInteractionController.emptyDragState();
  private viewportPan: ViewportPanState = CanvasInteractionController.emptyPanState();
  private snapTargetPointId: string | null = null;

  constructor(deps: CanvasInteractionDependencies) {
    this.deps = deps;
  }

  // --- Tool lifecycle ---

  setToolName(toolName: ToolType): void {
    this.currentToolName = toolName;
    const tool = createCanvasTool(toolName);
    if (tool) {
      this.currentTool = tool;
      if ('getStatusMessage' in tool && typeof tool.getStatusMessage === 'function') {
        const msg = tool.getStatusMessage();
        if (msg) this.deps.toolLifecycle.setToolStepMessage(msg);
      }
    } else {
      this.currentTool = null;
    }
  }

  isSelectMode(): boolean {
    return this.currentToolName === 'select';
  }

  getCurrentTool(): CanvasTool | null {
    return this.currentTool;
  }

  getSelectionMask(): SelectionMask | undefined {
    return this.currentTool?.getSelectionMask?.();
  }

  acceptsPlanePositionInput(): boolean {
    return supportsPlanePositionInput(this.currentTool) && this.currentTool.acceptsPlanePositionInput();
  }

  getPlanePositionInputLabel(): string {
    return supportsPlanePositionInput(this.currentTool) ? this.currentTool.getPlanePositionInputLabel() : 'position';
  }

  getToolArgumentInputRequest(): ToolArgumentInputRequest | null {
    return supportsToolArgumentInput(this.currentTool) ? this.currentTool.getToolArgumentInputRequest() : null;
  }

  // --- Canvas click dispatch ---

  handleCanvasClick(request: CanvasClickRequest): ToolResult | null {
    if (this.isSelectMode()) {
      this.handleSelectClick({
        canvasPos: request.canvasPos,
        activePlaneId: request.activePlaneId,
        paperToPlaneTransform: request.paperToPlaneTransform,
        viewport: request.viewport,
        interactionQuery: request.interactionQuery,
        shiftKey: false,
      });
      return { success: true };
    }

    const activeTool = this.currentTool;
    if (!activeTool) return null;

    const result = activeTool.handleClick({
      planeId: request.activePlaneId,
      planeCoords: request.planePos,
      canvasCoords: request.canvasPoint,
      commandSink: request.commandSink,
      readPort: this.deps.toolReadPort,
      interactionQuery: request.interactionQuery,
      paperToPlaneTransform: request.paperToPlaneTransform,
      viewport: request.viewport,
    });

    this.deps.toolLifecycle.setToolStepMessage(result.message || '');
    return result;
  }

  submitPlanePositionInput(request: PlanePositionInputRequest): ToolResult {
    const activeTool = this.currentTool;
    if (!supportsPlanePositionInput(activeTool)) {
      return { success: false, message: 'Current tool does not accept coordinate input.' };
    }
    if (!activeTool.acceptsPlanePositionInput()) {
      return { success: false, message: 'Current tool is not waiting for a free position.' };
    }

    const result = activeTool.handlePlanePositionInput({
      planeId: request.activePlaneId,
      planeCoords: request.planePos,
      canvasCoords: { x: 0, y: 0 },
      commandSink: request.commandSink,
      readPort: request.readPort,
      interactionQuery: request.interactionQuery,
      paperToPlaneTransform: request.paperToPlaneTransform,
      viewport: request.viewport,
    }, request.planePos);

    this.deps.toolLifecycle.setToolStepMessage(result.message || '');
    return result;
  }

  submitToolArgumentInput(request: ToolArgumentInputSubmitRequest): ToolResult {
    const activeTool = this.currentTool;
    if (!supportsToolArgumentInput(activeTool)) {
      return { success: false, message: 'Current tool does not accept direct input.' };
    }

    const planeCoords = request.input.kind === 'plane-position'
      ? request.input.position
      : new Vector3(0, 0, 1);

    const result = activeTool.handleToolArgumentInput({
      planeId: request.activePlaneId,
      planeCoords,
      canvasCoords: { x: 0, y: 0 },
      commandSink: request.commandSink,
      readPort: request.readPort,
      interactionQuery: request.interactionQuery,
      paperToPlaneTransform: request.paperToPlaneTransform,
      viewport: request.viewport,
    }, request.input);

    this.deps.toolLifecycle.setToolStepMessage(result.message || '');
    return result;
  }

  // --- Selection ---

  getFreePointDragState(): FreePointDragState {
    return {
      active: this.pointDrag.active,
      planeId: this.pointDrag.planeId,
      pointId: this.pointDrag.pointId,
      moved: this.pointDrag.moved,
    };
  }

  handleSelectClick(request: SelectClickRequest): void {
    const hit = request.interactionQuery.hitTest(
      request.canvasPos,
      20,
      {
        viewport: request.viewport,
        activePlaneId: request.activePlaneId,
        paperToPlaneTransform: request.paperToPlaneTransform,
      }
    );

    if (!hit) {
      this.deps.selection.clearSelection();
      return;
    }

    if (request.shiftKey) {
      this.deps.selection.addToSelection(hit.elementId);
    } else {
      this.deps.selection.selectSingle(hit.elementId);
    }
  }

  tryStartFreePointDrag(request: MouseDownRequest): boolean {
    const hit = request.interactionQuery.hitTest(
      request.canvasPos,
      20,
      {
        viewport: request.viewport,
        activePlaneId: request.activePlaneId,
        paperToPlaneTransform: request.paperToPlaneTransform,
      }
    );

    if (!hit || hit.elementType !== 'point') return false;

    const moveSession = request.getMoveSession({
      planeId: request.activePlaneId,
      pointId: hit.elementId,
      commandSink: request.commandSink,
    });
    if (!moveSession) return false;

    this.deps.selection.selectSingle(hit.elementId);
    this.pointDrag = {
      active: true,
      planeId: request.activePlaneId,
      pointId: hit.elementId,
      moveSession,
      startClientX: request.startClientX,
      startClientY: request.startClientY,
      moved: false,
    };
    return true;
  }

  previewFreePointDrag(request: PreviewFreePointDragRequest): ToolCommandResult | null {
    if (!this.pointDrag.active || !this.pointDrag.moveSession) return null;

    const dx = request.clientX - this.pointDrag.startClientX;
    const dy = request.clientY - this.pointDrag.startClientY;
    if (!this.pointDrag.moved && (dx * dx + dy * dy) < 9) return null;

    if (!request.planePosition) return null;

    this.pointDrag.moved = true;
    return this.pointDrag.moveSession.preview(request.planePosition);
  }

  finishFreePointDrag(): { active: boolean; moved: boolean; result?: ToolCommandResult } {
    if (!this.pointDrag.active) return { active: false, moved: false };

    const moved = this.pointDrag.moved;
    const result = moved ? this.pointDrag.moveSession?.commit() : undefined;
    if (!moved) this.pointDrag.moveSession?.cancel();
    this.pointDrag = CanvasInteractionController.emptyDragState();
    return { active: true, moved, result };
  }

  cancelFreePointDrag(): boolean {
    if (!this.pointDrag.active) return false;
    this.pointDrag.moveSession?.cancel();
    this.pointDrag = CanvasInteractionController.emptyDragState();
    return true;
  }

  // --- Viewport pan ---

  startViewportPan(startX: number, startY: number): void {
    this.viewportPan = { active: true, startX, startY, moved: false };
  }

  updateViewportPan(currentX: number, currentY: number, zoom: number): void {
    if (!this.viewportPan.active) return;
    const dx = currentX - this.viewportPan.startX;
    const dy = currentY - this.viewportPan.startY;
    this.deps.viewport.adjustPan(dx / zoom, dy / zoom);
    this.viewportPan = {
      active: true,
      startX: currentX,
      startY: currentY,
      moved: this.viewportPan.moved || dx !== 0 || dy !== 0,
    };
  }

  endViewportPan(): { active: boolean; moved: boolean } {
    if (!this.viewportPan.active) return { active: false, moved: false };
    const moved = this.viewportPan.moved;
    this.viewportPan = CanvasInteractionController.emptyPanState();
    return { active: true, moved };
  }

  isViewportPanning(): boolean {
    return this.viewportPan.active;
  }

  getViewportPanState(): ViewportPanState {
    return this.viewportPan;
  }

  cancelViewportPan(): void {
    this.viewportPan = CanvasInteractionController.emptyPanState();
  }

  // --- Hover/snap ---

  updateHover(
    canvasPos: Vector3,
    interactionQuery: CanvasInteractionQuery,
    activePlaneId: string,
    paperToPlaneTransform: Matrix3 | undefined,
    viewport: { zoom: number; panX: number; panY: number },
  ): HoverResult {
    const selectionMask = this.currentTool?.getSelectionMask?.();
    const hit = interactionQuery.hitTest(
      canvasPos,
      20,
      { viewport, activePlaneId, paperToPlaneTransform },
      selectionMask,
    );

    const previousSnapPointId = this.snapTargetPointId;

    if (hit && hit.elementType === 'point') {
      this.snapTargetPointId = hit.elementId;
    } else {
      this.snapTargetPointId = null;
    }

    if (hit) {
      const label = this.deps.getElementLabel(hit.elementId, hit.elementType, activePlaneId);
      this.deps.hover.setHoveredElement(hit.elementId, hit.elementType, label, false);
    } else {
      this.deps.hover.clearHover();
    }

    const snapChanged = previousSnapPointId !== this.snapTargetPointId;

    return {
      hitElementId: hit?.elementId,
      hitElementType: hit?.elementType,
      hitLabel: hit ? this.deps.getElementLabel(hit.elementId, hit.elementType, activePlaneId) : undefined,
      isSnapPoint: hit?.elementType === 'point',
      snapChanged,
    };
  }

  getSnapTargetPointId(): string | null {
    return this.snapTargetPointId;
  }

  clearHover(): void {
    this.deps.hover.clearHover();
    this.snapTargetPointId = null;
  }

  // --- Wheel zoom ---

  handleWheelZoom(delta: number, focusX: number, focusY: number): void {
    this.deps.viewport.adjustZoom(delta, focusX, focusY);
  }

  // --- Fit to view ---

  fitToView(
    primitives: readonly { type: string; position?: { x: number; y: number }; point1?: { x: number; y: number }; point2?: { x: number; y: number }; cx?: number; cy?: number; radius?: number }[],
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    if (primitives.length === 0) {
      this.deps.viewport.setZoom(1.0);
      this.deps.viewport.setPan(0, 0);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const prim of primitives) {
      if (prim.type === 'point' && prim.position) {
        minX = Math.min(minX, prim.position.x);
        minY = Math.min(minY, prim.position.y);
        maxX = Math.max(maxX, prim.position.x);
        maxY = Math.max(maxY, prim.position.y);
      } else if (prim.type === 'segment' && prim.point1 && prim.point2) {
        minX = Math.min(minX, prim.point1.x, prim.point2.x);
        minY = Math.min(minY, prim.point1.y, prim.point2.y);
        maxX = Math.max(maxX, prim.point1.x, prim.point2.x);
        maxY = Math.max(maxY, prim.point1.y, prim.point2.y);
      } else if ((prim.type === 'circle' || prim.type === 'arc') && prim.cx !== undefined && prim.cy !== undefined && prim.radius !== undefined) {
        minX = Math.min(minX, prim.cx - prim.radius);
        minY = Math.min(minY, prim.cy - prim.radius);
        maxX = Math.max(maxX, prim.cx + prim.radius);
        maxY = Math.max(maxY, prim.cy + prim.radius);
      }
    }

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      this.deps.viewport.setZoom(1.0);
      this.deps.viewport.setPan(0, 0);
      return;
    }

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    const paddingFactor = 0.9;
    const zoomX = (canvasWidth / boxWidth) * paddingFactor;
    const zoomY = (canvasHeight / boxHeight) * paddingFactor;
    const newZoom = Math.min(zoomX, zoomY, 4.0);
    const boxCenterX = (minX + maxX) / 2;
    const boxCenterY = (minY + maxY) / 2;
    const newPanX = canvasWidth / (2 * newZoom) - boxCenterX;
    const newPanY = canvasHeight / (2 * newZoom) - boxCenterY;

    this.deps.viewport.setZoom(newZoom);
    this.deps.viewport.setPan(newPanX, newPanY);
  }

  private static emptyDragState(): MutableFreePointDragState {
    return {
      active: false,
      planeId: null,
      pointId: null,
      moveSession: null,
      startClientX: 0,
      startClientY: 0,
      moved: false,
    };
  }

  private static emptyPanState(): ViewportPanState {
    return { active: false, startX: 0, startY: 0, moved: false };
  }
}
