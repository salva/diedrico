import type { ThreePresentationInput, ThreePresentationModel } from './ThreePresentationModel';
import { ThreePresentationSelector } from './ThreePresentationSelector';

export class ThreePresentationController {
  constructor(private readonly selector = new ThreePresentationSelector()) {}
  buildModel(input: ThreePresentationInput): ThreePresentationModel { return this.selector.select(input); }
}
