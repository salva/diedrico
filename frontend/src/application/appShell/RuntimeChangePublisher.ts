export interface ChangeNotifier {
  notifyChange(): void;
}

export class RuntimeChangePublisher implements ChangeNotifier {
  private version = 0;
  private readonly listeners = new Set<() => void>();

  getVersion(): number {
    return this.version;
  }

  subscribeToChanges(listener: () => void): void {
    this.listeners.add(listener);
  }

  unsubscribeFromChanges(listener: () => void): void {
    this.listeners.delete(listener);
  }

  notifyChange(): void {
    this.version++;
    this.listeners.forEach(listener => listener());
  }

  markDirty(): void {
    this.notifyChange();
  }
}
