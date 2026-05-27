import type { Line3DRealization3D } from '@/domain/world/Element3DRealization3D';
import type { World } from '@/domain/world/World';
import type { ThreeEntityPresentationData } from './ThreePresentationReadModel';
import { createThreeRealizationContext } from './ThreeRealizationContext';

export interface ThreeHingeReadModel extends ThreeEntityPresentationData { realization: Line3DRealization3D | undefined }

export interface ThreeHingeReadPort {
  getHingeModels(): ThreeHingeReadModel[];
}

export function createThreeHingeReadPort(world: World): ThreeHingeReadPort {
  const getHingeLines = () => world.getAllHingeLines();
  const realizationContext = createThreeRealizationContext(world, {
    getProjectionPlanes: () => world.getAllProjectionPlanes(),
    getHingeLines,
  });
  return {
    getHingeModels: () => getHingeLines().map(hingeLine => ({ id: hingeLine.id, visualStyle: hingeLine.visualStyle, realization: hingeLine.realize3D(realizationContext) })),
  };
}
