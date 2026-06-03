import type { Ref } from 'vue';
import type { ActivePlanePort } from './AppShellPorts';

export interface ActivePlaneState {
  activePlaneId: Ref<string | undefined>;
  activePlaneName: Ref<string>;
}

export class ActivePlaneUseCases {
  private updateHandler: (() => void) | null = null;

  constructor(private readonly activePlane: ActivePlanePort, private readonly state: ActivePlaneState) {}

  start(): void {
    if (this.updateHandler) return;
    this.updateHandler = () => this.updateFromWorld();
    this.activePlane.subscribeToChanges(this.updateHandler);
    this.updateFromWorld();
  }

  dispose(): void {
    if (!this.updateHandler) return;
    this.activePlane.unsubscribeFromChanges(this.updateHandler);
    this.updateHandler = null;
  }

  cycle(direction: number): void {
    const planes = this.activePlane.getProjectionPlaneSummaries();
    if (planes.length < 2) return;
    const currentId = this.activePlane.getActivePlaneId();
    if (!currentId) return;
    const currentIndex = planes.findIndex((plane) => plane.id === currentId);
    if (currentIndex === -1) return;
    let newIndex = (currentIndex + direction) % planes.length;
    if (newIndex < 0) newIndex += planes.length;
    this.activePlane.setActivePlaneId(planes[newIndex].id);
  }

  private updateFromWorld(): void {
    const newPlaneId = this.activePlane.getActivePlaneId();
    if (newPlaneId !== this.state.activePlaneId.value) {
      this.state.activePlaneId.value = newPlaneId;
    }
    if (!newPlaneId) {
      this.state.activePlaneName.value = '';
      return;
    }
    const planeName = this.activePlane.getProjectionPlaneName(newPlaneId);
    this.state.activePlaneName.value = planeName || newPlaneId;
  }
}
