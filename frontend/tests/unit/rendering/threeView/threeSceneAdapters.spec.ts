import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createProjectionPlaneSceneObjects } from '@/rendering/threeView/ProjectionPlaneSceneAdapter';
import { createPlanarElementSceneObjects } from '@/rendering/threeView/PlanarElementSceneAdapter';
import { createReconstructedElementSceneObjects } from '@/rendering/threeView/ReconstructedElementSceneAdapter';
import { createGuideSceneObjects } from '@/rendering/threeView/GuideSceneAdapter';
import { createHingeSceneObjects } from '@/rendering/threeView/HingeSceneAdapter';
import type {
  GuidePresentationDto,
  HingePresentationDto,
  PlanarElementPresentationDto,
  ProjectionPlanePresentationDto,
  ReconstructedElementPresentationDto,
} from '@/application/threePresentation/ThreePresentationModel';

describe('threeView scene object factories', () => {
  it('creates projection grid, axis, and label objects from typed DTOs', () => {
    const projectionPlaneDtos = [
      {
        id: 'grid',
        kind: 'projection-plane-grid',
        visible: true,
        style: { color: 0x888888, opacity: 1, transparent: true },
        renderGroup: 'projectionPlanes',
        segments: [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } }],
      },
      {
        id: 'axis',
        kind: 'reference-axis',
        visible: true,
        style: { color: 0xff0000 },
        renderGroup: 'axes',
        axis: 'x',
        origin: { x: 0, y: 0, z: 0 },
        direction: { x: 1, y: 0, z: 0 },
        length: 1,
        label: 'X',
      },
      {
        id: 'label',
        kind: 'axis-label',
        visible: true,
        style: { color: 0 },
        renderGroup: 'labels',
        text: 'X',
        position: { x: 1, y: 0, z: 0 },
        className: 'axis-label',
      },
    ] satisfies ProjectionPlanePresentationDto[];

    const objects = createProjectionPlaneSceneObjects(projectionPlaneDtos);

    expect(objects[0]).toBeInstanceOf(THREE.LineSegments);
    expect(objects[1].userData.type).toBe('reference-axis');
    expect(objects[2].userData.type).toBe('axis-label');
  });

  it('creates planar, reconstructed, guide, and hinge DTO objects from typed DTOs', () => {
    const planarDtos = [
      {
        id: 'p',
        kind: 'planar-point',
        visible: true,
        style: { color: 1, radius: 0.1 },
        renderGroup: 'planarElements',
        position: { x: 0, y: 0, z: 0 },
      },
    ] satisfies PlanarElementPresentationDto[];
    const reconstructedDtos = [
      {
        id: 'l',
        kind: 'reconstructed-line',
        visible: true,
        style: { color: 1 },
        renderGroup: 'reconstructedElements',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 1, y: 0, z: 0 },
      },
    ] satisfies ReconstructedElementPresentationDto[];
    const guideDtos = [
      {
        id: 'g',
        kind: 'guide-intersection-marker',
        visible: true,
        style: { color: 1, radius: 0.1 },
        renderGroup: 'guides',
        position: { x: 0, y: 0, z: 0 },
      },
    ] satisfies GuidePresentationDto[];
    const hingeDtos = [
      {
        id: 'h',
        kind: 'hinge-line',
        visible: true,
        style: { color: 1 },
        renderGroup: 'hinges',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 1, y: 0, z: 0 },
      },
    ] satisfies HingePresentationDto[];

    expect(createPlanarElementSceneObjects(planarDtos)[0]).toBeInstanceOf(THREE.Mesh);
    expect(createReconstructedElementSceneObjects(reconstructedDtos)[0]).toBeInstanceOf(THREE.Line);
    expect(createGuideSceneObjects(guideDtos)[0]).toBeInstanceOf(THREE.Mesh);
    expect(createHingeSceneObjects(hingeDtos)[0]).toBeInstanceOf(THREE.Line);
  });
});
