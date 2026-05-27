import { watch, type WatchStopHandle } from 'vue';
import type { SelectionDeletionCommandPort } from '@/application/selectionDeletion/SelectionDeletionPorts';
import type { SelectionReadPort, SelectionStorePort } from './AppShellPorts';

export class SelectionUseCases {
  private stopSelectionWatch: WatchStopHandle | null = null;

  constructor(
    private readonly selectionRead: SelectionReadPort,
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
    const selectedIds = this.selectionRead.getSelectableIdsInPlane(activePlaneId);
    if (selectedIds.length > 0) this.selectionStore.selectMultiple([...selectedIds]);
  }

  private updateCascadePreview(selectedIds: string[]): void {
    if (selectedIds.length === 0) {
      this.selectionStore.clearCascadeHighlight();
      return;
    }
    const cascadePreviewIds = this.selectionRead.getCascadePreviewIds(selectedIds);
    this.selectionStore.setCascadeHighlight([...cascadePreviewIds]);
  }
}
