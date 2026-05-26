import type { World } from '@/domain/world/World';
import type { CanvasPresentationModel, CanvasPresentationState, CanvasViewportModel } from './CanvasPresentationModel';
import { CanvasPresentationSelector } from './CanvasPresentationSelector';

export class CanvasPresentationController {
  constructor(private readonly selector = new CanvasPresentationSelector()) {}
  buildModel(world: World, viewport: CanvasViewportModel, state: CanvasPresentationState): CanvasPresentationModel {
    return this.selector.select(world, viewport, state);
  }
}
