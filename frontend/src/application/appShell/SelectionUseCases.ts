import { watch, type WatchStopHandle } from 'vue';
import type { World } from '@/domain/world/World';
import type { SelectionDeletionCommandPort } from '@/application/selectionDeletion/SelectionDeletionPorts';
import type { SelectionStorePort } from './AppShellPorts';

export class SelectionUseCases {
  private stopSelectionWatch: WatchStopHandle | null = null;

  constructor(
    private readonly world: World,
    private readonly deleteSelectionCommand: SelectionDeletionCommandPort,
    private readonly selectionStore: SelectionStorePort,
    private readonly getActivePlaneId: () => string | undefined,
  ) {}

  start(): void {
    if (this.stopSelectionWatch) return;
    this.stopSelectionWatch = watch(
      () => this.selectionStore.selectedIdsArray,
      (selectedIds) => this.updateCascadePreview(selectedIds),
      { immediate: true },
    );
  }

  dispose(): void {
    this.stopSelectionWatch?.();
    this.stopSelectionWatch = null;
    this.selectionStore.clearCascadeHighlight();
  }

  deleteSelected(): void {
    const selectedIds = this.selectionStore.selectedIdsArray;
    if (selectedIds.length === 0) return;
    this.deleteSelectionCommand.execute(selectedIds);
    this.selectionStore.clearSelection();
  }

  clearSelection(): void {
    this.selectionStore.clearSelection();
  }

  selectAllInActivePlane(): void {
    const activePlaneId = this.getActivePlaneId();
    if (!activePlaneId) return;
    const activePlane = this.world.getProjectionPlaneById(activePlaneId);
    if (!activePlane) return;
    const selectedIds: string[] = [];
    for (const point of activePlane.getAllPoints()) selectedIds.push(point.id);
    for (const line of activePlane.getAllLines()) selectedIds.push(line.id);
    for (const circle of activePlane.getAllCircles()) selectedIds.push(circle.id);
    if (selectedIds.length > 0) this.selectionStore.selectMultiple(selectedIds);
  }

  private updateCascadePreview(selectedIds: string[]): void {
    if (selectedIds.length === 0) {
      this.selectionStore.clearCascadeHighlight();
      return;
    }
    const allElementsToDelete = this.world.getDependencyService().getElementsInDeletionOrder(selectedIds);
    this.selectionStore.setCascadeHighlight(allElementsToDelete.filter((id) => !selectedIds.includes(id)));
  }
}
