import type { CanvasPresentationModel, CanvasPresentationState, CanvasViewportModel } from './CanvasPresentationModel';
import { CanvasPresentationSelector } from './CanvasPresentationSelector';
import type { CanvasWorldReadPort } from './CanvasWorldReadPort';

export class CanvasPresentationController {
  constructor(private readonly selector = new CanvasPresentationSelector()) {}
  buildModel(readPort: CanvasWorldReadPort, viewport: CanvasViewportModel, state: CanvasPresentationState): CanvasPresentationModel {
    return this.selector.select(readPort, viewport, state);
  }
}
