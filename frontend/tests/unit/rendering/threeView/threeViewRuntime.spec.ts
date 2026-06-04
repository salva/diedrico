import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeViewRuntime, type ThreeViewRuntimeGroup, type ThreeViewRuntimeHost } from '@/rendering/threeView/ThreeViewRuntime';
import type { ThreePresentationModel } from '@/application/threePresentation/ThreePresentationModel';

describe('ThreeViewRuntime', () => {
  it('replaces the owned scene groups with objects rendered from the final presentation model', () => {
    const model: ThreePresentationModel = {
      projectionPlanes: [{ id: 'projection-plane', kind: 'projection-plane-grid', visible: true, style: { color: 0, opacity: 1, transparent: false }, renderGroup: 'projectionPlanes', segments: [] }],
      planarElements: [{ id: 'planar-point', kind: 'planar-point', visible: true, style: { color: 0 }, renderGroup: 'planarElements', position: { x: 0, y: 0, z: 0 } }],
      reconstructedElements: [{ id: 'reconstructed-point', kind: 'reconstructed-point', visible: true, style: { color: 0 }, renderGroup: 'reconstructedElements', position: { x: 0, y: 0, z: 0 } }],
      guides: [{ id: 'guide', kind: 'guide-intersection-marker', visible: true, style: { color: 0 }, renderGroup: 'guides', position: { x: 0, y: 0, z: 0 } }],
      hinges: [{ id: 'hinge', kind: 'hinge-line', visible: true, style: { color: 0 }, renderGroup: 'hinges', start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } }],
    };
    const replaced: Array<{ group: ThreeViewRuntimeGroup; objects: THREE.Object3D[] }> = [];
    const host: ThreeViewRuntimeHost = {
      registry: { replaceGroup: vi.fn((group, objects) => replaced.push({ group, objects })) },
      mount: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    };

    new ThreeViewRuntime({ host }).refresh(model);

    expect(replaced.map(entry => entry.group)).toEqual(['projectionPlanes', 'planarElements', 'reconstructedElements', 'guides', 'hinges']);
    expect(replaced[0].objects[0]).toBeInstanceOf(THREE.LineSegments);
    expect(replaced[1].objects[0]).toBeInstanceOf(THREE.Mesh);
    expect(replaced[2].objects[0]).toBeInstanceOf(THREE.Mesh);
    expect(replaced[3].objects[0]).toBeInstanceOf(THREE.Mesh);
    expect(replaced[4].objects[0]).toBeInstanceOf(THREE.Line);
    expect(replaced.map(entry => entry.objects[0].userData.type)).toEqual([
      'projection-plane-grid',
      'planar-point',
      'reconstructed-point',
      'guide-intersection-marker',
      'hinge-line',
    ]);
  });

  it('delegates mount, resize, and dispose to the injected scene host', () => {
    const host: ThreeViewRuntimeHost = {
      registry: { replaceGroup: vi.fn() },
      mount: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    };
    const runtime = new ThreeViewRuntime({ host });
    const mount = { container: document.createElement('div'), canvas: document.createElement('canvas') };

    runtime.mount(mount);
    runtime.resize();
    runtime.dispose();

    expect(host.mount).toHaveBeenCalledWith(mount);
    expect(host.resize).toHaveBeenCalledOnce();
    expect(host.dispose).toHaveBeenCalledOnce();
  });
});
