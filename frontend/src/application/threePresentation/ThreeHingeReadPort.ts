import { Vector3 } from 'three';
import type { World } from '@/domain/world/World';
import { domainDirectionToThreeJS, domainToThreeJS } from '@/utils/threeUtils';
import type { ThreeHingeSourceDto } from './ThreePresentationReadModel';
import { THREE_STYLE, visibleFromDomain } from './ThreeStylePolicy';
import { createThreeRealizationContext } from './ThreeRealizationContext';
import type { Vec3 } from './ThreePresentationModel';

export type { ThreeHingeSourceDto as ThreeHingeReadModel } from './ThreePresentationReadModel';

export interface ThreeHingeReadPort {
  getHingeModels(): ThreeHingeSourceDto[];
}

export function createThreeHingeReadPort(world: World): ThreeHingeReadPort {
  const getHingeLines = () => world.getAllHingeLines();
  const realizationContext = createThreeRealizationContext(world, {
    getProjectionPlanes: () => world.getAllProjectionPlanes(),
    getHingeLines,
  });
  return {
    getHingeModels: () => getHingeLines().flatMap(hingeLine => {
      if (!visibleFromDomain(hingeLine)) return [];
      const realization = hingeLine.realize3D(realizationContext);
      if (!realization?.isFeasible() || !realization.point || !realization.direction) return [];
      const origin = domainToThreeJS(realization.point);
      const direction = domainDirectionToThreeJS(new Vector3(realization.direction.x, realization.direction.y, realization.direction.z)).normalize();
      return [{ id: hingeLine.id, visible: true, style: THREE_STYLE.hinge, start: v(origin.clone().add(direction.clone().multiplyScalar(-THREE_STYLE.infiniteLineExtent / 2))), end: v(origin.clone().add(direction.clone().multiplyScalar(THREE_STYLE.infiniteLineExtent / 2))) }];
    }),
  };
}

function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }
