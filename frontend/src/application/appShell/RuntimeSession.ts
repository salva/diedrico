import { CommandStack } from '@/commands/CommandStack';
import { World } from '@/domain/world/World';
import { initializeWorld } from '@/application/world/initializeWorld';
import { SelectionDeletionCommandService } from '@/application/selectionDeletion/SelectionDeletionCommandService';
import type { SelectionDeletionCommandPort } from '@/application/selectionDeletion/SelectionDeletionPorts';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import type { CanvasToolControllerToolStore } from '@/application/tools/CanvasToolController';
import { ProcessHistoryController } from '@/application/processHistory/ProcessHistoryController';
import type { ActivePlanePort, CommandHistoryPort, OpenedProjectSession, ProjectSessionPersistencePort, RuntimeSessionRestoreHandle, RuntimeSessionSnapshotHandle, SelectionReadPort } from './AppShellPorts';
import { CanvasPresentationController } from '@/application/canvasPresentation/CanvasPresentationController';
import { createCanvasWorldReadPort } from '@/application/canvasPresentation/CanvasWorldReadPort';
import { createThreeWorldReadPort } from '@/application/threePresentation/ThreeWorldReadPort';
import { screenTo3D } from '@/utils/coordinateTransform';
import { FreePoint2D, Point2DLineLineIntersection, Point2DLineCircleIntersection, Point2DCircleCircleIntersection } from '@/domain/world/Point';
import { Line2DByTwoPoints } from '@/domain/world/Line';
import { Segment2DByPoints } from '@/domain/world/Segment';
import { Circle2DByCenterAndPoint, Circle2DByThreePoints } from '@/domain/world/Circle';
import { Guide2D } from '@/domain/world/Guide';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { Element2D } from '@/domain/world/Element2D';
import { getActionDescriptionParts } from '@/domain/processTree/Action';
import type { ProcessNode } from '@/domain/processTree/ProcessTree';
import type { VisualStyle } from '@/domain/world/VisualStyle';
import type { CanvasViewPort, ProcessTreeReadPort, ProcessNodeViewModel, ElementsPanelPort, ThreePresentationPort, ActivePlaneSelectorPort, ElementsPanelElementViewModel, PropertiesDialogViewModel } from './RuntimeViewPorts';
import { mapDescriptionParts } from './RuntimeViewPorts';

export interface RuntimeSessionPersistenceSnapshotHandle extends RuntimeSessionSnapshotHandle {
  readonly commandStack: CommandStack;
}

export interface RuntimeSessionPersistenceRestoreHandle extends RuntimeSessionRestoreHandle {
  readonly world: World;
  readonly commandStack: CommandStack;
}

export class RuntimeSession {
  private readonly world = new World();
  private readonly commandStack = new CommandStack();


  canvasViewPort(): CanvasViewPort {
    const canvasReadPort = createCanvasWorldReadPort(this.world);
    const canvasPresentationController = new CanvasPresentationController();
    return {
      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
      getActivePlaneId: () => this.world.getActivePlaneId(),
      getPlaneTransformsForInput: () => {
        const transforms = new Map();
        for (const plane of this.world.getAllProjectionPlanes()) {
          const realization = this.world.getProjectionPlane2DRealization(plane.id);
          if (realization) transforms.set(plane.id, realization.paperToPlane2D);
        }
        return transforms;
      },
      buildPresentationModel: (viewport, options) => canvasPresentationController.buildModel(
        canvasReadPort,
        viewport,
        {
          hoveredIds: options.hoveredElementId ? new Set([options.hoveredElementId]) : undefined,
          selectedIds: options.selectedIds.length > 0 ? new Set(options.selectedIds) : undefined,
          cascadeHighlightIds: options.cascadeHighlightIds.length > 0 ? new Set(options.cascadeHighlightIds) : undefined,
          activePlaneId: options.activePlaneId,
          showProjectedElements: options.showProjectedElements,
          gridVisible: options.gridVisible,
        }
      ),
      getElementLabel: (elementId, elementType, planeId) => this.getElementLabel(elementId, elementType, planeId),
      getMovableFreePointMoveSession: ({ planeId, pointId, commandSink }) => {
        const plane = this.world.getProjectionPlaneById(planeId);
        const point = plane?.getPoint(pointId);
        if (!(point instanceof FreePoint2D) || point.locked) return null;
        return commandSink.startFreePointMove({ planeId, pointId, label: point.label ?? pointId });
      },
      invokeToolClick: (tool, context) => tool.handleClick({ ...context, world: this.world }),
      screenTo3D: ({ clientX, clientY, svg, viewportMatrix, activePlaneId }) => screenTo3D(clientX, clientY, svg, viewportMatrix, activePlaneId, this.world),
      getPropertiesDialogViewModel: (elementId) => this.getPropertiesDialogViewModel(elementId),
    };
  }

  processTreeReadPort(): ProcessTreeReadPort {
    return {
      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
      subscribeToTree: (listener) => this.world.getProcessTree().subscribe(listener),
      getTree: () => {
        const tree = this.world.getProcessTree();
        return {
          root: this.createProcessNodeViewModel(tree.root),
          version: tree.getVersion(),
          activeSubprocessId: tree.getCurrentSubprocess().id,
        };
      },
      getRelatedActionIds: (selectedIds) => {
        const related = new Set<string>();
        const selectedIdSet = new Set(selectedIds);
        for (const action of this.world.getProcessTree().getAllActions()) {
          const producesSelected = selectedIdSet.has(action.elementId);
          const dependsOnSelected = this.world.getDependencyService().getDependencies(action.elementId).some(depId => selectedIdSet.has(depId));
          if (producesSelected || dependsOnSelected) related.add(action.id);
        }
        return related;
      },
      countNodes: (node) => 1 + (node.children?.reduce((sum, child) => sum + this.countProcessNodeViewModels(child), 0) ?? 0),
    };
  }

  elementsPanelPort(): ElementsPanelPort {
    return {
      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
      getReadModel: () => ({
        projectionPlanes: this.world.getAllProjectionPlanes().slice().sort((a, b) => {
          if (a.name === 'P_H') return -1;
          if (b.name === 'P_H') return 1;
          if (a.name === 'P_V') return -1;
          if (b.name === 'P_V') return 1;
          return a.name.localeCompare(b.name);
        }).map(plane => {
          const points = plane.getAllPoints();
          const allLines = plane.getAllLines();
          const lines = allLines.filter(l => !(l instanceof HalfHingeLine2D) && !(l instanceof Segment2DByPoints) && !(l instanceof Guide2D));
          const segments = allLines.filter(l => l instanceof Segment2DByPoints);
          const circles = plane.getAllCircles();
          const guides = allLines.filter(l => l instanceof Guide2D);
          return {
            id: plane.id,
            name: plane.name,
            label: plane.name === 'P_H' ? 'Horizontal' : (plane.name === 'P_V' ? 'Vertical' : 'Auxiliary'),
            elements: {
              points: points.map(element => this.formatElementForPanel(element, 'point')),
              lines: lines.map(element => this.formatElementForPanel(element, 'line')),
              segments: segments.map(element => this.formatElementForPanel(element, 'segment')),
              circles: circles.map(element => this.formatElementForPanel(element, 'circle')),
              guides: guides.map(element => this.formatElementForPanel(element, 'guide')),
            },
            hasElements: points.length + lines.length + segments.length + circles.length + guides.length > 0,
          };
        }),
        threeDElements: {
          points: this.world.getAll3DPoints().map(element => this.formatElementForPanel(element, 'point')),
          lines: this.world.getAll3DLines().map(element => this.formatElementForPanel(element, 'line')),
          segments: this.world.getAll3DSegments().map(element => this.formatElementForPanel(element, 'segment')),
          planes: this.world.getAllPlanes().map(element => this.formatElementForPanel(element, 'plane')),
          hasElements: this.world.getAll3DPoints().length + this.world.getAll3DLines().length + this.world.getAll3DSegments().length + this.world.getAllPlanes().length > 0,
        },
      }),
      toggleVisibility: (elementId) => {
        const element = this.findVisibleElement(elementId);
        if (!element) return;
        if (!element.visualStyle) {
          element.visualStyle = { color: '#000000', lineWidth: 2, lineStyle: 'solid', opacity: 1.0, visible: false, inherited: true };
        } else {
          element.visualStyle.visible = !element.visualStyle.visible;
        }
        this.world.markDirty();
      },
    };
  }

  threePresentationPort(): ThreePresentationPort {
    const readPort = createThreeWorldReadPort(this.world);
    return {
      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
      getReadPort: () => readPort,
    };
  }

  activePlaneSelectorPort(): ActivePlaneSelectorPort {
    return {
      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
      getPlaneOptions: () => this.world.getAllProjectionPlanes().filter(p => typeof p.id === 'string' && p.id.length > 0).map(p => ({ id: p.id, label: p.name || p.id })),
      getActivePlaneId: () => this.world.getActivePlaneId(),
      getActivePlaneLabel: () => {
        const planeId = this.world.getActivePlaneId();
        return planeId ? (this.world.getProjectionPlaneById(planeId)?.name || planeId) : undefined;
      },
      setActivePlaneId: (id) => this.world.setActivePlaneId(id),
    };
  }

  canvasCommandProducerPort(toolStore: CanvasToolControllerToolStore): CanvasToolController {
    return new CanvasToolController({
      world: this.world,
      commandStack: this.commandStack,
      toolStore,
    });
  }

  processHistoryCommandPort(): ProcessHistoryController {
    return new ProcessHistoryController({
      world: this.world,
      commandStack: this.commandStack,
    });
  }

  activePlanePort(): ActivePlanePort {
    return {
      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
      getActivePlaneId: () => this.world.getActivePlaneId(),
      setActivePlaneId: (id) => this.world.setActivePlaneId(id),
      getProjectionPlaneSummaries: () => this.world.getAllProjectionPlanes().map((plane) => ({ id: plane.id, name: plane.name })),
      getProjectionPlaneName: (id) => this.world.getProjectionPlaneById(id)?.name,
    };
  }

  selectionReadPort(): SelectionReadPort {
    return {
      getSelectableIdsInPlane: (planeId) => {
        const plane = this.world.getProjectionPlaneById(planeId);
        if (!plane) return [];
        return [
          ...plane.getAllPoints().map((point) => point.id),
          ...plane.getAllLines().map((line) => line.id),
          ...plane.getAllCircles().map((circle) => circle.id),
        ];
      },
      getCascadePreviewIds: (selectedIds) => {
        const deletionOrder = this.world.getDependencyService().getElementsInDeletionOrder([...selectedIds]);
        return deletionOrder.filter((id) => !selectedIds.includes(id));
      },
    };
  }

  commandHistoryPort(): CommandHistoryPort {
    return {
      canUndo: () => this.commandStack.canUndo(),
      undo: () => this.commandStack.undo(),
      canRedo: () => this.commandStack.canRedo(),
      redo: () => this.commandStack.redo(),
      subscribe: (listener) => this.commandStack.subscribe(listener),
    };
  }

  selectionDeletionCommandPort(): SelectionDeletionCommandPort {
    return new SelectionDeletionCommandService(this.world, this.commandStack);
  }

  initializeDefaultWorldIfNeeded(): void {
    initializeWorld(this.world, this.commandStack);
  }

  resetToEmptyInitializedWorld(): void {
    this.world.clear();
    this.commandStack.clear();
    this.initializeDefaultWorldIfNeeded();
  }

  clear(): void {
    this.world.clear();
    this.commandStack.clear();
  }

  getVersion(): number {
    return this.world.getVersion();
  }

  snapshot(projectName: string, persistence: ProjectSessionPersistencePort): object {
    return persistence.snapshotCurrentSession(this.snapshotHandle(), projectName);
  }

  validateProjectData(data: unknown, persistence: ProjectSessionPersistencePort): OpenedProjectSession {
    return persistence.validateProjectData(data);
  }

  restoreValidatedProject(openedSession: OpenedProjectSession, persistence: ProjectSessionPersistencePort): void {
    const candidateWorld = new World();
    const candidateCommandStack = new CommandStack();
    persistence.restoreSession(openedSession.payload, { world: candidateWorld, commandStack: candidateCommandStack });
    if (candidateWorld.getAllProjectionPlanes().length === 0) initializeWorld(candidateWorld, candidateCommandStack);
    candidateWorld.markDirty();

    this.world.clear();
    this.commandStack.clear();
    persistence.restoreSession(openedSession.payload, this.restoreTarget());
    if (this.world.getAllProjectionPlanes().length === 0) this.initializeDefaultWorldIfNeeded();
    this.world.markDirty();
  }


  private getElementLabel(elementId: string, elementType: string, planeId?: string): string {
    const planes = planeId ? [this.world.getProjectionPlaneById(planeId)].filter(Boolean) : this.world.getAllProjectionPlanes();
    for (const plane of planes) {
      let element: { label?: string } | undefined;
      switch (elementType) {
        case 'point': element = plane?.getPoint(elementId); break;
        case 'line':
        case 'half-hinge-line':
        case 'segment':
        case 'guide': element = plane?.getLine(elementId); break;
        case 'circle': element = plane?.getCircle(elementId); break;
      }
      if (element) return element.label || elementId;
    }
    return elementId;
  }

  private getPropertiesDialogViewModel(elementId: string | null): PropertiesDialogViewModel | null {
    if (!elementId) return null;
    const element = this.findVisibleElement(elementId) as any;
    if (!element) return null;
    const style = this.styleView(element.visualStyle);
    return {
      elementId,
      elementLabel: element.label || elementId,
      elementType: this.describeElementType(elementId),
      planeId: typeof element.planeId === 'string' ? element.planeId : null,
      coordinates: this.describeCoordinates(elementId),
      dependencies: this.describeDependencies(elementId),
      createdBy: 'Action in ProcessTree',
      style,
    };
  }

  private describeElementType(elementId: string): string {
    if (this.world.getPoint2D(elementId)) return '2D Point';
    if (this.world.getLine2D(elementId)) return '2D Line';
    if (this.world.getSegment2D(elementId)) return '2D Segment';
    if (this.world.getCircle2D(elementId)) return '2D Circle';
    if (this.world.getGuide2D(elementId)) return '2D Guide';
    if (this.world.getElement3DById(elementId)) return '3D Element';
    if (this.world.getProjectionPlaneById(elementId)) return 'Projection Plane';
    return 'Unknown';
  }

  private describeCoordinates(elementId: string): string | null {
    const point = this.world.getPoint2D(elementId);
    if (point) {
      const realization = this.world.getProjectionPlaneById(point.planeId)?.getPoint(elementId)?.realize2D(this.world);
      if (realization) {
        const pos = realization.getPosition();
        return `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`;
      }
    }
    const circle = this.world.getCircle2D(elementId);
    if (circle) {
      const realization = this.world.getProjectionPlaneById(circle.planeId)?.getCircle(elementId)?.realize2D(this.world);
      if (realization) return `Center: (${realization.center.x.toFixed(2)}, ${realization.center.y.toFixed(2)}), Radius: ${realization.getRadius().toFixed(2)}`;
    }
    return null;
  }

  private describeDependencies(elementId: string): readonly string[] {
    const point = this.world.getPoint2D(elementId);
    if (point instanceof Point2DLineLineIntersection) return [point.line1Id, point.line2Id].filter(Boolean);
    if (point instanceof Point2DLineCircleIntersection) return [point.lineId, point.circleId].filter(Boolean);
    if (point instanceof Point2DCircleCircleIntersection) return [point.circle1Id, point.circle2Id].filter(Boolean);
    const line = this.world.getLine2D(elementId);
    if (line instanceof Line2DByTwoPoints) return [line.point1Id, line.point2Id];
    const segment = this.world.getSegment2D(elementId);
    if (segment instanceof Segment2DByPoints) return [segment.point1Id, segment.point2Id];
    const circle = this.world.getCircle2D(elementId);
    if (circle instanceof Circle2DByCenterAndPoint) return [circle.centerPointId, circle.circumferencePointId];
    if (circle instanceof Circle2DByThreePoints) return [circle.point1Id, circle.point2Id, circle.point3Id];
    const guide = this.world.getGuide2D(elementId);
    if (guide instanceof Guide2D) return [guide.referenceLineId, guide.throughPointId];
    return [];
  }

  private styleView(style?: VisualStyle): PropertiesDialogViewModel['style'] {
    return {
      color: style?.color ?? '#000000',
      lineWidth: style?.lineWidth ?? 1.0,
      lineStyle: style?.lineStyle ?? 'solid',
      visible: style?.visible !== false,
    };
  }

  private createProcessNodeViewModel(node: ProcessNode): ProcessNodeViewModel {
    if (node.type === 'action') {
      const descriptionParts = mapDescriptionParts(getActionDescriptionParts(node, this.world));
      return {
        id: node.id,
        type: node.type,
        isOutput: node.isOutput,
        elementId: node.elementId,
        descriptionParts,
        isInfeasible: this.isActionInfeasible(node.elementId),
        hideBecauseElementMissing: descriptionParts.length === 0,
      };
    }
    return {
      id: node.id,
      type: node.type,
      name: node.type === 'subprocess' ? node.name : undefined,
      children: node.children.filter(child => child !== null).map(child => this.createProcessNodeViewModel(child)),
      showIntermediates: node.type === 'subprocess' ? node.showIntermediates : undefined,
      isOutput: node.isOutput,
      isAuxiliary: node.type === 'actionGroup' ? node.isAuxiliary : undefined,
      descriptionParts: [],
      isInfeasible: false,
      hideBecauseElementMissing: false,
    };
  }

  private isActionInfeasible(elementId: string): boolean {
    let element;
    try {
      element = this.world.getElement2D(elementId);
    } catch {
      element = this.world.getElement3DById(elementId) || this.world.getProjectionPlaneById(elementId);
    }
    if (element instanceof Element2D) {
      const realization = element.realize2D(this.world);
      return realization ? !realization.isFeasible() : false;
    }
    return false;
  }

  private countProcessNodeViewModels(node: ProcessNodeViewModel): number {
    return 1 + (node.children?.reduce((sum, child) => sum + this.countProcessNodeViewModels(child), 0) ?? 0);
  }

  private formatElementForPanel(element: any, fallbackType: string): ElementsPanelElementViewModel {
    return {
      id: element.id,
      label: element.label || element.id,
      type: fallbackType,
      visible: element.visualStyle?.visible !== false,
      properties: this.getElementProperties(element),
    };
  }

  private getElementProperties(element: any): string {
    if ('position' in element) {
      const pos = element.position;
      return `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`;
    }
    if ('radius' in element) return `r=${element.radius.toFixed(2)}`;
    return '';
  }

  private findVisibleElement(elementId: string): any {
    return this.world.getElement2D(elementId)
      || this.world.getElement3DById(elementId)
      || this.world.getProjectionPlaneById(elementId);
  }

  private snapshotHandle(): RuntimeSessionPersistenceSnapshotHandle {
    return {
      commandStack: this.commandStack,
      nextElementId: this.world.peekNextId(),
    };
  }

  private restoreTarget(): RuntimeSessionPersistenceRestoreHandle {
    return {
      world: this.world,
      commandStack: this.commandStack,
    };
  }
}
