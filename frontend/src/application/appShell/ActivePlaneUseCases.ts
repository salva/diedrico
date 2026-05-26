import type { Ref } from 'vue';
import type { World } from '@/domain/world/World';

export interface ActivePlaneState {
  activePlaneId: Ref<string | undefined>;
  activePlaneName: Ref<string>;
}

export class ActivePlaneUseCases {
  private updateHandler: (() => void) | null = null;

  constructor(private readonly world: World, private readonly state: ActivePlaneState) {}

  start(): void {
    if (this.updateHandler) return;
    this.updateHandler = () => this.updateFromWorld();
    this.world.subscribeToChanges(this.updateHandler);
    this.updateFromWorld();
  }

  dispose(): void {
    if (!this.updateHandler) return;
    this.world.unsubscribeFromChanges(this.updateHandler);
    this.updateHandler = null;
  }

  updateActivePlane(planeInfo: { id: string; name: string }): void {
    if (this.world.getActivePlaneId() !== planeInfo.id) {
      this.world.setActivePlaneId(planeInfo.id);
    }
  }

  cycle(direction: number): void {
    const planes = this.world.getAllProjectionPlanes();
    if (planes.length < 2) return;
    const currentId = this.world.getActivePlaneId();
    if (!currentId) return;
    const currentIndex = planes.findIndex((plane) => plane.id === currentId);
    if (currentIndex === -1) return;
    let newIndex = (currentIndex + direction) % planes.length;
    if (newIndex < 0) newIndex += planes.length;
    this.world.setActivePlaneId(planes[newIndex].id);
  }

  private updateFromWorld(): void {
    const newPlaneId = this.world.getActivePlaneId();
    if (newPlaneId !== this.state.activePlaneId.value) {
      this.state.activePlaneId.value = newPlaneId;
    }
    if (!newPlaneId) {
      this.state.activePlaneName.value = '';
      return;
    }
    const plane = this.world.getProjectionPlaneById(newPlaneId);
    this.state.activePlaneName.value = plane?.name || newPlaneId;
  }
}
