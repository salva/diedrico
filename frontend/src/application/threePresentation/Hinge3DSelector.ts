import type { HingePresentationDto } from './ThreePresentationModel';
import type { ThreeHingeReadPort } from './ThreeHingeReadPort';
import { isVisible } from './ThreeStylePolicy';

export class Hinge3DSelector {
  select(readPort: ThreeHingeReadPort, showPlanes: boolean): HingePresentationDto[] {
    if (!showPlanes) return [];
    const items: HingePresentationDto[] = [];
    for (const hingeLine of readPort.getHingeModels()) {
      if (!isVisible(hingeLine)) continue;
      items.push({ id: `hinge-line-${hingeLine.id}`, kind: 'hinge-line', sourceEntityId: hingeLine.id, visible: true, style: hingeLine.style, renderGroup: 'hinges', start: hingeLine.start, end: hingeLine.end });
    }
    return items;
  }
}
