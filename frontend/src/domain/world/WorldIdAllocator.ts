export class WorldIdAllocator {
  private nextId = 1;
  private point3DCounter = 0;
  private line3DCounter = 0;
  private segment3DCounter = 0;
  private plane3DUserCounter = 0;

  constructor(initialNextId = 1) {
    this.restore(initialNextId);
  }

  reset(): void {
    this.nextId = 1;
    this.point3DCounter = 0;
    this.line3DCounter = 0;
    this.segment3DCounter = 0;
    this.plane3DUserCounter = 0;
  }

  /** Reserve persisted reconstruction IDs before issuing new ones after replay. */
  reserve3DId(id: string): void {
    const match = /^(point3d|line3d|segment3d|plane3d)([1-9]\d*)$/.exec(id);
    if (!match) return;
    const value = Number(match[2]);
    if (!Number.isSafeInteger(value)) throw new Error(`Invalid reconstruction ID: ${id}`);
    switch (match[1]) {
      case 'point3d': this.point3DCounter = Math.max(this.point3DCounter, value); break;
      case 'line3d': this.line3DCounter = Math.max(this.line3DCounter, value); break;
      case 'segment3d': this.segment3DCounter = Math.max(this.segment3DCounter, value); break;
      case 'plane3d': this.plane3DUserCounter = Math.max(this.plane3DUserCounter, value); break;
    }
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
