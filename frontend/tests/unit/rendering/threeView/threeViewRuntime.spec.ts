import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeViewRuntime, type ThreeViewSceneAdapter, type ThreeViewRuntimeGroup, type ThreeViewRuntimeHost } from '@/rendering/threeView/ThreeViewRuntime';
import type { ThreePresentationModel } from '@/application/threePresentation/ThreePresentationModel';

function adapter<TDto>(object: THREE.Object3D): ThreeViewSceneAdapter<TDto> {
  return { createObjects: vi.fn(() => [object]) };
}

describe('ThreeViewRuntime', () => {
  it('replaces the owned scene groups from the final presentation model with adapter output', () => {
    const model: ThreePresentationModel = {
      projectionPlanes: [{ id: 'projection-plane', kind: 'projection-plane-grid', visible: true, style: { color: 0 }, renderGroup: 'projectionPlanes', segments: [] }],
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
    const objects = {
      projectionPlanes: new THREE.Object3D(),
      planarElements: new THREE.Object3D(),
      reconstructedElements: new THREE.Object3D(),
      guides: new THREE.Object3D(),
      hinges: new THREE.Object3D(),
    };
    const adapters = {
      projectionPlanes: adapter<typeof model.projectionPlanes[number]>(objects.projectionPlanes),
      planarElements: adapter<typeof model.planarElements[number]>(objects.planarElements),
      reconstructedElements: adapter<typeof model.reconstructedElements[number]>(objects.reconstructedElements),
      guides: adapter<typeof model.guides[number]>(objects.guides),
      hinges: adapter<typeof model.hinges[number]>(objects.hinges),
    };

    new ThreeViewRuntime({ host, adapters }).refresh(model);

    expect(adapters.projectionPlanes.createObjects).toHaveBeenCalledWith(model.projectionPlanes);
    expect(adapters.planarElements.createObjects).toHaveBeenCalledWith(model.planarElements);
    expect(adapters.reconstructedElements.createObjects).toHaveBeenCalledWith(model.reconstructedElements);
    expect(adapters.guides.createObjects).toHaveBeenCalledWith(model.guides);
    expect(adapters.hinges.createObjects).toHaveBeenCalledWith(model.hinges);
    expect(replaced).toEqual([
      { group: 'projectionPlanes', objects: [objects.projectionPlanes] },
      { group: 'planarElements', objects: [objects.planarElements] },
      { group: 'reconstructedElements', objects: [objects.reconstructedElements] },
      { group: 'guides', objects: [objects.guides] },
      { group: 'hinges', objects: [objects.hinges] },
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
