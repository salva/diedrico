import { Vector3 } from 'three';
import { domainDirectionToThreeJS, domainToThreeJS } from '@/utils/threeUtils';
import type { HingePresentationDto, Vec3 } from './ThreePresentationModel';
import type { ThreeHingeReadPort } from './ThreeHingeReadPort';
import { THREE_STYLE } from './ThreeStylePolicy';

export class Hinge3DSelector {
  select(readPort: ThreeHingeReadPort, showPlanes: boolean): HingePresentationDto[] {
    if (!showPlanes) return [];
    const items: HingePresentationDto[] = [];
    for (const hingeLine of readPort.getHingeModels()) {
      const realization = hingeLine.realization;
      if (!realization?.isFeasible() || !realization.point || !realization.direction) continue;
      const origin = domainToThreeJS(realization.point);
      const direction = domainDirectionToThreeJS(new Vector3(realization.direction.x, realization.direction.y, realization.direction.z)).normalize();
      items.push({ id: `hinge-line-${hingeLine.id}`, kind: 'hinge-line', sourceEntityId: hingeLine.id, visible: true, style: THREE_STYLE.hinge, renderGroup: 'hinges', start: v(origin.clone().add(direction.clone().multiplyScalar(-THREE_STYLE.infiniteLineExtent / 2))), end: v(origin.clone().add(direction.clone().multiplyScalar(THREE_STYLE.infiniteLineExtent / 2))) });
    }
    return items;
  }
}
function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }
