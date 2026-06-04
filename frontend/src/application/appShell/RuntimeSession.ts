import { CommandStack } from '@/commands/CommandStack';
import { World } from '@/domain/world/World';
import { initializeWorld } from '@/application/world/initializeWorld';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { SelectionDeletionCommandService } from '@/application/selectionDeletion/SelectionDeletionCommandService';
import type { SelectionDeletionCommandPort } from '@/application/selectionDeletion/SelectionDeletionPorts';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import { createToolInteractionReadPort } from '@/application/tools/ToolInteractionReadPort';
import { ProcessHistoryController } from '@/application/processHistory/ProcessHistoryController';
import type { ActivePlanePort, CommandHistoryPort, OpenedProjectSession, ProjectSessionPersistencePayload, ProjectSessionPersistencePort, SelectionReadPort } from './AppShellPorts';
import type { ProjectSessionKernel } from './ProjectSessionKernel';
import type { RuntimeSessionPersistenceRestoreHandle, RuntimeSessionPersistenceSnapshotHandle } from './ProjectSessionPersistenceTargets';
import { createCanvasPresentationContext } from '@/application/canvasPresentation/CanvasPresentationContext';
import { CanvasPresentationSelector } from '@/application/canvasPresentation/CanvasPresentationSelector';
import { createThreePresentationReadPorts } from '@/application/threePresentation/ThreeWorldReadPort';
import { screenTo3D } from '@/utils/coordinateTransform';
import { FreePoint2D } from '@/domain/world/Point';
import type { CanvasViewPort, ProcessTreeReadPort, ElementsPanelPort, ThreePresentationPort, ActivePlaneSelectorPort } from './RuntimeViewPorts';
import { buildPropertiesDialogViewModel } from './readModels/PropertiesDialogReadModel';
import { buildProcessTreeReadModel, countProcessNodeViewModels, getRelatedActionIds } from './readModels/ProcessTreeReadModel';
import { buildElementsPanelReadModel } from './readModels/ElementsPanelReadModel';
import { toggleElementVisibility } from './readModels/ElementVisibilityIntent';
import { RuntimeChangePublisher, type ChangeNotifier } from './RuntimeChangePublisher';

export class RuntimeSession implements ProjectSessionKernel, CommandHistoryPort {
  private readonly world = new World();
  private readonly changes = new RuntimeChangePublisher();
  private readonly commandStack = new CommandStack();
  private readonly commandProducer = new RuntimeCommandProducer(this.world, this.commandStack, this.changes);
  private activePlaneId?: string;


  canvasViewPort(): CanvasViewPort {
    const canvasContext = createCanvasPresentationContext(this.world);
    const canvasPresentationSelector = new CanvasPresentationSelector();
    return {
      subscribeToChanges: (listener) => this.changes.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.changes.unsubscribeFromChanges(listener),
      getActivePlaneId: () => this.getActivePlaneId(),
      getPlaneTransformsForInput: () => new Map(canvasContext.getCanvasPlaneTransforms().map(transform => [transform.planeId, transform.paperToPlane])),
      buildPresentationModel: (viewport, options) => canvasPresentationSelector.select(
        canvasContext,
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
      screenTo3D: ({ clientX, clientY, svg, viewportMatrix, activePlaneId }) => screenTo3D(clientX, clientY, svg, viewportMatrix, activePlaneId, this.world),
      getPropertiesDialogViewModel: (elementId) => this.getPropertiesDialogViewModel(elementId),
    };
  }

  toolInteractionReadPort() {
    return createToolInteractionReadPort(this.world);
  }

  processTreeReadPort(): ProcessTreeReadPort {
    return {
      subscribeToChanges: (listener) => this.changes.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.changes.unsubscribeFromChanges(listener),
      getTree: () => buildProcessTreeReadModel({ world: this.world, dependencyQuery: this.world.getDependencyQuery() }),
      getRelatedActionIds: (selectedIds) => getRelatedActionIds(selectedIds, { world: this.world, dependencyQuery: this.world.getDependencyQuery() }),
      countNodes: (node) => countProcessNodeViewModels(node),
    };
  }

  elementsPanelPort(): ElementsPanelPort {
    return {
      subscribeToChanges: (listener) => this.changes.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.changes.unsubscribeFromChanges(listener),
      getReadModel: () => buildElementsPanelReadModel({ world: this.world }),
      toggleVisibility: (elementId) => {
        toggleElementVisibility(elementId, {
          findElement: (id) => this.findVisibleElement(id),
        });
        this.changes.markDirty();
      },
    };
  }

  threePresentationPort(): ThreePresentationPort {
    const readPorts = createThreePresentationReadPorts(this.world);
    return {
      subscribeToChanges: (listener) => this.changes.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.changes.unsubscribeFromChanges(listener),
      getReadPorts: () => readPorts,
    };
  }

  activePlaneSelectorPort(): ActivePlaneSelectorPort {
    return {
      subscribeToChanges: (listener) => this.changes.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.changes.unsubscribeFromChanges(listener),
      getPlaneOptions: () => this.world.getAllProjectionPlanes().filter(p => typeof p.id === 'string' && p.id.length > 0).map(p => ({ id: p.id, label: p.name || p.id })),
      getActivePlaneId: () => this.getActivePlaneId(),
      getActivePlaneLabel: () => {
        const planeId = this.getActivePlaneId();
        return planeId ? (this.world.getProjectionPlaneById(planeId)?.name || planeId) : undefined;
      },
      setActivePlaneId: (id) => this.setActivePlaneId(id),
    };
  }

  canvasCommandProducerPort(): CanvasToolController {
    return new CanvasToolController({
      world: this.world,
      commands: this.commandProducer,
    });
  }

  processHistoryCommandPort(): ProcessHistoryController {
    return new ProcessHistoryController({
      world: this.world,
      commands: this.commandProducer,
    });
  }

  activePlanePort(): ActivePlanePort {
    return {
      subscribeToChanges: (listener) => this.changes.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.changes.unsubscribeFromChanges(listener),
      getActivePlaneId: () => this.getActivePlaneId(),
      setActivePlaneId: (id) => this.setActivePlaneId(id),
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
        const deletionOrder = this.world.getDependencyQuery().getElementsInDeletionOrder([...selectedIds]);
        return deletionOrder.filter((id) => !selectedIds.includes(id));
      },
    };
  }

  selectionDeletionCommandPort(): SelectionDeletionCommandPort {
    return new SelectionDeletionCommandService(this.world, this.commandStack, this.changes);
  }

  canUndo(): boolean {
    return this.commandStack.canUndo();
  }

  undo(): void {
    this.commandStack.undo();
  }

  canRedo(): boolean {
    return this.commandStack.canRedo();
  }

  redo(): void {
    this.commandStack.redo();
  }

  subscribe(listener: () => void): () => void {
    return this.commandStack.subscribe(listener);
  }

  initializeDefaultWorldIfNeeded(): void {
    initializeWorld(this.world, this.commandStack, this.changes);
    this.ensureActivePlane();
  }

  resetToEmptyInitializedWorld(): void {
    this.world.clear();
    this.commandStack.clear();
    this.initializeDefaultWorldIfNeeded();
  }

  clear(): void {
    this.world.clear();
    this.commandStack.clear();
    this.activePlaneId = undefined;
  }

  getVersion(): number {
    return this.changes.getVersion();
  }

  snapshot(projectName: string, persistence: ProjectSessionPersistencePort): ProjectSessionPersistencePayload {
    return persistence.snapshotCurrentSession(this.snapshotHandle(), projectName);
  }

  validateProjectData(data: unknown, persistence: ProjectSessionPersistencePort): OpenedProjectSession {
    return persistence.validateProjectData(data);
  }

  restoreValidatedProject(openedSession: OpenedProjectSession, persistence: ProjectSessionPersistencePort): void {
    const candidateWorld = new World();
    const candidateCommandStack = new CommandStack();
    const validationNotifier: ChangeNotifier = { notifyChange: () => {} };
    persistence.restoreSession(openedSession.payload, { world: candidateWorld, commandStack: candidateCommandStack, notifier: validationNotifier });
    if (candidateWorld.getAllProjectionPlanes().length === 0) initializeWorld(candidateWorld, candidateCommandStack, validationNotifier);

    this.world.clear();
    this.commandStack.clear();
    this.activePlaneId = undefined;
    persistence.restoreSession(openedSession.payload, this.restoreTarget());
    if (this.world.getAllProjectionPlanes().length === 0) this.initializeDefaultWorldIfNeeded();
    this.ensureActivePlane();
    this.changes.markDirty();
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

  private getPropertiesDialogViewModel(elementId: string | null) {
    return buildPropertiesDialogViewModel(elementId, {
      findElement: (id) => this.findVisibleElement(id),
      world: this.world,
    });
  }

  private findVisibleElement(elementId: string) {
    return this.world.getElement2D(elementId)
      || this.world.getElement3DById(elementId)
      || this.world.getProjectionPlaneById(elementId);
  }

  private getActivePlaneId(): string | undefined {
    return this.ensureActivePlane();
  }

  private setActivePlaneId(id: string): void {
    this.activePlaneId = id;
    this.changes.markDirty();
  }

  private ensureActivePlane(): string | undefined {
    if (this.activePlaneId && this.world.getProjectionPlaneById(this.activePlaneId)) {
      return this.activePlaneId;
    }

    const planes = this.world.getAllProjectionPlanes();
    const defaultPlane = planes.find(plane => plane.id === 'projPlaneH' || plane.name === 'P_H') ?? planes[0];
    this.activePlaneId = defaultPlane?.id;
    return this.activePlaneId;
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
      notifier: this.changes,
    };
  }
}
