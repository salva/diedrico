import type { ReconstructedElementPresentationDto } from './ThreePresentationModel';
import type { ThreeReconstructedElementReadPort } from './ThreeReconstructedElementReadPort';
import { isVisible } from './ThreeStylePolicy';

export class ReconstructedElement3DSelector {
  select(readPort: ThreeReconstructedElementReadPort, showPlanes: boolean): ReconstructedElementPresentationDto[] {
    if (!showPlanes) return [];
    const items: ReconstructedElementPresentationDto[] = [];
    const models = readPort.getReconstructedModels();
    for (const point of models.points) {
      if (!isVisible(point)) continue;
      items.push({ id: `reconstructed-point-${point.id}`, kind: 'reconstructed-point', sourceEntityId: point.id, visible: true, style: point.style, renderGroup: 'reconstructedElements', position: point.position });
    }
    for (const line of models.lines) {
      if (!isVisible(line)) continue;
      items.push({ id: `reconstructed-line-${line.id}`, kind: 'reconstructed-line', sourceEntityId: line.id, visible: true, style: line.style, renderGroup: 'reconstructedElements', start: line.start, end: line.end });
    }
    for (const segment of models.segments) {
      if (!isVisible(segment)) continue;
      items.push({ id: `reconstructed-segment-${segment.id}`, kind: 'reconstructed-segment', sourceEntityId: segment.id, visible: true, style: segment.style, renderGroup: 'reconstructedElements', start: segment.start, end: segment.end });
    }
    for (const plane of models.planes) {
      if (!isVisible(plane)) continue;
      items.push({ id: `reconstructed-plane-${plane.id}`, kind: 'reconstructed-plane', sourceEntityId: plane.id, visible: true, style: plane.style, renderGroup: 'reconstructedElements', geometry: plane.geometry });
    }
    return items;
  }
}
