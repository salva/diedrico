export class WorldIdAllocator {
  private nextId = 1;

  constructor(initialNextId = 1) {
    this.restore(initialNextId);
  }

  next(): number {
    return this.nextId++;
  }

  peek(): number {
    return this.nextId;
  }

  restore(nextElementId: number): void {
    if (!Number.isInteger(nextElementId) || nextElementId < 1) {
      throw new Error(`Invalid next element ID: ${nextElementId}`);
    }
    this.nextId = nextElementId;
  }

  prefixed(prefix: string): string {
    return `${prefix}${this.next()}`;
  }
}
