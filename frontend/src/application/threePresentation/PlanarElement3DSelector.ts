import type { PlanarElementPresentationDto } from './ThreePresentationModel';
import type { ThreePlanarElementReadPort } from './ThreePlanarElementReadPort';
import { isVisible } from './ThreeStylePolicy';

export class PlanarElement3DSelector {
  select(readPort: ThreePlanarElementReadPort, show2DElementsOnPlanes: boolean): PlanarElementPresentationDto[] {
    if (!show2DElementsOnPlanes) return [];
    const items: PlanarElementPresentationDto[] = [];
    for (const plane of readPort.getPlanarPlaneModels()) {
      for (const element of plane.elements) {
        if (!isVisible(element)) continue;
        switch (element.kind) {
          case 'planar-point':
            items.push({ id: `planar-point-${element.id}`, kind: 'planar-point', sourceEntityId: element.id, planeId: plane.id, visible: true, style: element.style, renderGroup: 'planarElements', position: element.position });
            break;
          case 'planar-line':
          case 'planar-segment':
            items.push({ id: `${element.kind}-${element.id}`, kind: element.kind, sourceEntityId: element.id, planeId: plane.id, visible: true, style: element.style, renderGroup: 'planarElements', start: element.start, end: element.end });
            break;
          case 'planar-circle':
            items.push({ id: `planar-circle-${element.id}`, kind: 'planar-circle', sourceEntityId: element.id, planeId: plane.id, visible: true, style: element.style, renderGroup: 'planarElements', points: element.points });
            break;
        }
      }
    }
    return items;
  }
}
