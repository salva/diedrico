export class WorldIdAllocator {
  private nextId = 1;
  private point3DCounter = 0;
  private line3DCounter = 0;
  private segment3DCounter = 0;
  private plane3DUserCounter = 0;

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

  generate3DPointId(): string {
    return `point3d${++this.point3DCounter}`;
  }

  generate3DLineId(): string {
    return `line3d${++this.line3DCounter}`;
  }

  generate3DSegmentId(): string {
    return `segment3d${++this.segment3DCounter}`;
  }

  generate3DPlaneId(): string {
    return `plane3d${++this.plane3DUserCounter}`;
  }

}
