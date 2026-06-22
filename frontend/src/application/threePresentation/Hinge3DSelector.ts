import type { HingePresentationDto } from './ThreePresentationModel';
import type { ThreeHingeSourceDto } from './ThreePresentationReadModel';
import { isVisible } from './ThreeStylePolicy';

export class Hinge3DSelector {
  select(hingeLines: ThreeHingeSourceDto[], showPlanes: boolean): HingePresentationDto[] {
    if (!showPlanes) return [];
    const items: HingePresentationDto[] = [];
    for (const hingeLine of hingeLines) {
      if (!isVisible(hingeLine)) continue;
      items.push({ id: `hinge-line-${hingeLine.id}`, kind: 'hinge-line', sourceEntityId: hingeLine.id, visible: true, style: hingeLine.style, renderGroup: 'hinges', start: hingeLine.start, end: hingeLine.end });
    }
    return items;
  }
}
