export interface SelectionDeletionCommandPort {
  execute(selectedIds: readonly string[]): void;
}
