import { CommandStack } from '@/commands/CommandStack';
import { RuntimeDomainContext } from './RuntimeDomainContext';
import { initializeWorld } from '@/application/world/initializeWorld';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { SelectionDeletionCommandService } from '@/application/selectionDeletion/SelectionDeletionCommandService';
import type { SelectionDeletionCommandPort } from '@/application/selectionDeletion/SelectionDeletionPorts';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import { createToolInteractionReadPort } from '@/application/tools/ToolInteractionReadPort';
import { ProcessHistoryController } from '@/application/processHistory/ProcessHistoryController';
import type { CommandHistoryPort, OpenedProjectSession, ProjectSessionPersistencePayload, SelectionReadPort } from './AppShellPorts';
import type { ProjectSessionKernel } from './ProjectSessionKernel';
import { ProjectService } from './ProjectService';
import { buildCanvasPresentationModel } from '@/application/canvasPresentation/CanvasPresentationSelector';
import { createThreePresentationReadPorts } from '@/application/threePresentation/ThreeWorldReadPort';
import { ThreePresentationSelector } from '@/application/threePresentation/ThreePresentationSelector';
import { screenTo3D } from '@/utils/coordinateTransform';
import { FreePoint2D } from '@/domain/world/Point';
import type { CanvasViewPort, ProcessTreeReadPort, ElementsPanelPort, PlaneOption, ThreePresentationPort } from './RuntimeViewPorts';
import { buildPropertiesDialogViewModel } from './readModels/PropertiesDialogReadModel';
import { buildProcessTreeReadModel, countProcessNodeViewModels, getRelatedActionIds } from './readModels/ProcessTreeReadModel';
import { buildElementsPanelReadModel } from './readModels/ElementsPanelReadModel';
import { toggleElementVisibility } from './readModels/ElementVisibilityIntent';
import { RuntimeChangePublisher, type ChangeNotifier } from './RuntimeChangePublisher';
import { registerAllDescriptors } from '@/domain/world/descriptors/registerDescriptors';
import { VisibilityModel } from '@/application/processTree/VisibilityModel';
import type { OperationContext } from '@/commands/operations/OperationContext';

export class RuntimeSession implements ProjectSessionKernel, CommandHistoryPort {
  private readonly domain = new RuntimeDomainContext();
  private readonly world = this.domain.world;
  private readonly visibilityModel = new VisibilityModel();
  private readonly changes = new RuntimeChangePublisher();
  private readonly commandStack = new CommandStack();
  private readonly descriptorRegistry = registerAllDescriptors();
  private readonly operationContext: OperationContext = this.domain.createOperationContext(this.visibilityModel);
  private readonly commandProducer = new RuntimeCommandProducer(this.operationContext, this.commandStack, this.changes);
  private activePlaneIdValue?: string;


  canvasViewPort(): CanvasViewPort {
    return {
      subscribeToChanges: (listener) => this.changes.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.changes.unsubscribeFromChanges(listener),
      getActivePlaneId: () => this.activePlaneId,
      buildPresentationModel: (viewport, options) => buildCanvasPresentationModel(
        this.world,
        viewport,
        {
          hoveredIds: options.hoveredElementId ? new Set([options.hoveredElementId]) : undefined,
          selectedIds: options.selectedIds.length > 0 ? new Set(options.selectedIds) : undefined,
          cascadeHighlightIds: options.cascadeHighlightIds.length > 0 ? new Set(options.cascadeHighlightIds) : undefined,
          activePlaneId: options.activePlaneId,
          showProjectedElements: options.showProjectedElements,
          gridVisible: options.gridVisible,
          visibilityModel: this.visibilityModel,
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
      getTree: () => buildProcessTreeReadModel({ world: this.world, processTree: this.operationContext.processTree, dependencyQuery: this.operationContext.dependencies, descriptorRegistry: this.descriptorRegistry, visibilityModel: this.visibilityModel }),
      getRelatedActionIds: (selectedIds) => getRelatedActionIds(selectedIds, { world: this.world, processTree: this.operationContext.processTree, dependencyQuery: this.operationContext.dependencies, descriptorRegistry: this.descriptorRegistry, visibilityModel: this.visibilityModel }),
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
    const selector = new ThreePresentationSelector();
    return {
      subscribeToChanges: (listener) => this.changes.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.changes.unsubscribeFromChanges(listener),
      buildThreePresentationModel: (displayOptions, selectedIds) => selector.select({ readPorts, displayOptions, selectedIds }),
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
      processTree: this.operationContext.processTree,
      commands: this.commandProducer,
    });
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
        const deletionOrder = this.operationContext.dependencies.getElementsInDeletionOrder([...selectedIds]);
        return deletionOrder.filter((id) => !selectedIds.includes(id));
      },
    };
  }

  selectionDeletionCommandPort(): SelectionDeletionCommandPort {
    return new SelectionDeletionCommandService(this.world, this.visibilityModel, this.commandStack, this.changes, undefined, this.operationContext);
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

  subscribeToChanges(listener: () => void): void {
    this.changes.subscribeToChanges(listener);
  }

  unsubscribeFromChanges(listener: () => void): void {
    this.changes.unsubscribeFromChanges(listener);
  }

  get activePlaneId(): string | undefined {
    return this.ensureActivePlane();
  }

  get activePlaneName(): string {
    const planeId = this.ensureActivePlane();
    return planeId ? (this.world.getProjectionPlaneById(planeId)?.name || planeId) : '';
  }

  get planeOptions(): readonly PlaneOption[] {
    return this.world.getAllProjectionPlanes()
      .filter(plane => typeof plane.id === 'string' && plane.id.length > 0)
      .map(plane => ({ id: plane.id, label: plane.name || plane.id }));
  }

  setActivePlaneId(id: string): void {
    this.activePlaneIdValue = id;
    this.changes.markDirty();
  }

  cycleActivePlane(direction: number): void {
    const planes = this.planeOptions;
    if (planes.length < 2) return;
    const currentId = this.activePlaneId;
    if (!currentId) return;
    const currentIndex = planes.findIndex((plane) => plane.id === currentId);
    if (currentIndex === -1) return;
    let newIndex = (currentIndex + direction) % planes.length;
    if (newIndex < 0) newIndex += planes.length;
    this.setActivePlaneId(planes[newIndex].id);
  }

  initializeDefaultWorldIfNeeded(): void {
    initializeWorld(this.world, this.visibilityModel, this.commandStack, this.changes, this.operationContext);
    this.ensureActivePlane();
  }

  resetToEmptyInitializedWorld(): void {
    this.world.clear();
    this.visibilityModel.clear();
    this.commandStack.clear();
    this.initializeDefaultWorldIfNeeded();
  }

  clear(): void {
    this.world.clear();
    this.visibilityModel.clear();
    this.commandStack.clear();
    this.activePlaneIdValue = undefined;
  }

  getVersion(): number {
    return this.changes.getVersion();
  }

  snapshot(projectName: string): ProjectSessionPersistencePayload {
    return ProjectService.serializeCommands(this.commandStack, this.world.peekNextId(), projectName);
  }

  validateProjectData(data: unknown): OpenedProjectSession {
    ProjectService.validateProjectData(data);
    return {
      projectName: data.name,
      payload: data,
    };
  }

  restoreValidatedProject(openedSession: OpenedProjectSession): void {
    const candidateDomain = new RuntimeDomainContext();
    const candidateWorld = candidateDomain.world;
    const candidateVisibilityModel = new VisibilityModel();
    const candidateCommandStack = new CommandStack();
    const validationNotifier: ChangeNotifier = { notifyChange: () => {} };
    const candidateOperationContext = candidateDomain.createOperationContext(candidateVisibilityModel);
    ProjectService.deserializeCommands(openedSession.payload, candidateWorld, candidateVisibilityModel, candidateCommandStack, validationNotifier, candidateOperationContext);
    if (candidateWorld.getAllProjectionPlanes().length === 0) initializeWorld(candidateWorld, candidateVisibilityModel, candidateCommandStack, validationNotifier, candidateOperationContext);

    this.world.clear();
    this.visibilityModel.clear();
    this.commandStack.clear();
    this.activePlaneIdValue = undefined;
    ProjectService.deserializeCommands(openedSession.payload, this.world, this.visibilityModel, this.commandStack, this.changes, this.operationContext);
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

  private ensureActivePlane(): string | undefined {
    if (this.activePlaneIdValue && this.world.getProjectionPlaneById(this.activePlaneIdValue)) {
      return this.activePlaneIdValue;
    }

    const planes = this.world.getAllProjectionPlanes();
    const defaultPlane = planes.find(plane => plane.id === 'projPlaneH' || plane.name === 'P_H') ?? planes[0];
    this.activePlaneIdValue = defaultPlane?.id;
    return this.activePlaneIdValue;
  }

}
