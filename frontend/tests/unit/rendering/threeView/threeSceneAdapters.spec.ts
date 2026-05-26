import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ProjectionPlaneSceneAdapter } from '@/rendering/threeView/ProjectionPlaneSceneAdapter';
import { PlanarElementSceneAdapter } from '@/rendering/threeView/PlanarElementSceneAdapter';
import { ReconstructedElementSceneAdapter } from '@/rendering/threeView/ReconstructedElementSceneAdapter';
import { GuideSceneAdapter } from '@/rendering/threeView/GuideSceneAdapter';
import { HingeSceneAdapter } from '@/rendering/threeView/HingeSceneAdapter';

describe('threeView scene adapters', () => {
  it('creates projection grid, axis, and label objects from DTOs', () => {
    const objects = new ProjectionPlaneSceneAdapter().createObjects([
      { id: 'grid', kind: 'projection-plane-grid', visible: true, style: { color: 0x888888, opacity: 1, transparent: true }, renderGroup: 'projectionPlanes', segments: [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } }] },
      { id: 'axis', kind: 'reference-axis', visible: true, style: { color: 0xff0000 }, renderGroup: 'axes', axis: 'x', origin: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 }, length: 1, label: 'X' },
      { id: 'label', kind: 'axis-label', visible: true, style: { color: 0 }, renderGroup: 'labels', text: 'X', position: { x: 1, y: 0, z: 0 }, className: 'axis-label' },
    ] as any);
    expect(objects[0]).toBeInstanceOf(THREE.LineSegments);
    expect(objects[1].userData.type).toBe('reference-axis');
    expect(objects[2].userData.type).toBe('axis-label');
  });

  it('creates planar, reconstructed, guide, and hinge DTO objects', () => {
    expect(new PlanarElementSceneAdapter().createObjects([{ id: 'p', kind: 'planar-point', visible: true, style: { color: 1, radius: 0.1 }, renderGroup: 'planarElements', position: { x: 0, y: 0, z: 0 } }] as any)[0]).toBeInstanceOf(THREE.Mesh);
    expect(new ReconstructedElementSceneAdapter().createObjects([{ id: 'l', kind: 'reconstructed-line', visible: true, style: { color: 1 }, renderGroup: 'reconstructedElements', start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } }] as any)[0]).toBeInstanceOf(THREE.Line);
    expect(new GuideSceneAdapter().createObjects([{ id: 'g', kind: 'guide-intersection-marker', visible: true, style: { color: 1, radius: 0.1 }, renderGroup: 'guides', position: { x: 0, y: 0, z: 0 } }] as any)[0]).toBeInstanceOf(THREE.Mesh);
    expect(new HingeSceneAdapter().createObjects([{ id: 'h', kind: 'hinge-line', visible: true, style: { color: 1 }, renderGroup: 'hinges', start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } }] as any)[0]).toBeInstanceOf(THREE.Line);
  });
});
