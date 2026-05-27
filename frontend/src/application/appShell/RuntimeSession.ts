import { CommandStack } from '@/commands/CommandStack';
import { World } from '@/domain/world/World';
import { initializeWorld } from '@/application/world/initializeWorld';
import { SelectionDeletionCommandService } from '@/application/selectionDeletion/SelectionDeletionCommandService';
import type { SelectionDeletionCommandPort } from '@/application/selectionDeletion/SelectionDeletionPorts';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import { createToolInteractionReadPort } from '@/application/tools/ToolInteractionReadPort';
import type { CanvasToolControllerToolStore } from '@/application/tools/CanvasToolController';
import { ProcessHistoryController } from '@/application/processHistory/ProcessHistoryController';
import type { ActivePlanePort, CommandHistoryPort, OpenedProjectSession, ProjectSessionPersistencePort, RuntimeSessionRestoreHandle, RuntimeSessionSnapshotHandle, SelectionReadPort } from './AppShellPorts';
import { CanvasPresentationController } from '@/application/canvasPresentation/CanvasPresentationController';
import { createCanvasWorldReadPort } from '@/application/canvasPresentation/CanvasWorldReadPort';
import { createThreeWorldReadPort } from '@/application/threePresentation/ThreeWorldReadPort';
import { screenTo3D } from '@/utils/coordinateTransform';
import { FreePoint2D } from '@/domain/world/Point';
import type { CanvasViewPort, ProcessTreeReadPort, ElementsPanelPort, ThreePresentationPort, ActivePlaneSelectorPort } from './RuntimeViewPorts';
import { buildPropertiesDialogViewModel } from './readModels/PropertiesDialogReadModel';
import { buildProcessTreeReadModel, countProcessNodeViewModels, getRelatedActionIds } from './readModels/ProcessTreeReadModel';
import { buildElementsPanelReadModel } from './readModels/ElementsPanelReadModel';
import { toggleElementVisibility } from './readModels/ElementVisibilityIntent';

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
    const toolReadPort = createToolInteractionReadPort(this.world);
    const canvasPresentationController = new CanvasPresentationController();
    return {
      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
      getActivePlaneId: () => this.world.getActivePlaneId(),
      getPlaneTransformsForInput: () => new Map(canvasReadPort.getCanvasPlaneTransforms().map(transform => [transform.planeId, transform.paperToPlane])),
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
      invokeToolClick: (tool, context) => tool.handleClick({ ...context, readPort: toolReadPort }),
      screenTo3D: ({ clientX, clientY, svg, viewportMatrix, activePlaneId }) => screenTo3D(clientX, clientY, svg, viewportMatrix, activePlaneId, this.world),
      getPropertiesDialogViewModel: (elementId) => this.getPropertiesDialogViewModel(elementId),
    };
  }

  processTreeReadPort(): ProcessTreeReadPort {
    return {
      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
      subscribeToTree: (listener) => this.world.getProcessTree().subscribe(listener),
      getTree: () => buildProcessTreeReadModel({ world: this.world }),
      getRelatedActionIds: (selectedIds) => getRelatedActionIds(selectedIds, { world: this.world }),
      countNodes: (node) => countProcessNodeViewModels(node),
    };
  }

  elementsPanelPort(): ElementsPanelPort {
    return {
      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
      getReadModel: () => buildElementsPanelReadModel({ world: this.world }),
      toggleVisibility: (elementId) => toggleElementVisibility(elementId, {
        findElement: (id) => this.findVisibleElement(id),
        markDirty: () => this.world.markDirty(),
      }),
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
