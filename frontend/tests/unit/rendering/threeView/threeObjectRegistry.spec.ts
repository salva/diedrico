import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { ThreeObjectRegistry } from '@/rendering/threeView/ThreeObjectRegistry';

describe('ThreeObjectRegistry', () => {
  it('replaces grouped objects and disposes geometry/materials', () => {
    const scene = new THREE.Scene();
    const registry = new ThreeObjectRegistry(scene);
    const first = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    const disposeGeometry = vi.spyOn(first.geometry, 'dispose');
    const disposeMaterial = vi.spyOn(first.material, 'dispose');
    registry.replaceGroup('projectionPlanes', [first]);
    expect(scene.children).toContain(first);
    const second = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
    registry.replaceGroup('projectionPlanes', [second]);
    expect(scene.children).not.toContain(first);
    expect(scene.children).toContain(second);
    expect(disposeGeometry).toHaveBeenCalled();
    expect(disposeMaterial).toHaveBeenCalled();
  });

  it('removes CSS2D label elements on replacement', () => {
    const scene = new THREE.Scene();
    const registry = new ThreeObjectRegistry(scene);
    const element = document.createElement('div');
    document.body.appendChild(element);
    const label = new CSS2DObject(element);
    registry.replaceGroup('labels', [label]);
    expect(document.body.contains(element)).toBe(true);
    registry.replaceGroup('labels', []);
    expect(document.body.contains(element)).toBe(false);
  });

  it('disposes descendant geometry and material arrays owned by a group', () => {
    const scene = new THREE.Scene();
    const registry = new ThreeObjectRegistry(scene);
    const parent = new THREE.Group();
    const childGeometry = new THREE.BufferGeometry();
    const firstMaterial = new THREE.MeshBasicMaterial();
    const secondMaterial = new THREE.MeshBasicMaterial();
    const disposeGeometry = vi.spyOn(childGeometry, 'dispose');
    const disposeFirstMaterial = vi.spyOn(firstMaterial, 'dispose');
    const disposeSecondMaterial = vi.spyOn(secondMaterial, 'dispose');
    parent.add(new THREE.Mesh(childGeometry, [firstMaterial, secondMaterial]));

    registry.replaceGroup('nested', [parent]);
    registry.dispose();
    registry.dispose();

    expect(scene.children).not.toContain(parent);
    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeFirstMaterial).toHaveBeenCalledOnce();
    expect(disposeSecondMaterial).toHaveBeenCalledOnce();
  });
});
