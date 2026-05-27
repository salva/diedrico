import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeSceneHost, type ThreeSceneHostPlatform } from '@/rendering/threeView/ThreeSceneHost';

function sizedElement(width: number, height: number): HTMLElement {
  const element = document.createElement('div');
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: height });
  return element;
}

function createPlatform() {
  const renderer = {
    domElement: document.createElement('canvas'),
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
  };
  const labelRenderer = {
    domElement: document.createElement('div'),
    setSize: vi.fn(),
    render: vi.fn(),
  };
  const controls = {
    enableDamping: false,
    dampingFactor: 0,
    screenSpacePanning: true,
    minDistance: 0,
    maxDistance: 0,
    maxPolarAngle: 0,
    update: vi.fn(),
    dispose: vi.fn(),
  };
  const frameCallbacks: FrameRequestCallback[] = [];
  const platform: ThreeSceneHostPlatform = {
    createRenderer: vi.fn(() => renderer),
    createLabelRenderer: vi.fn(() => labelRenderer),
    createControls: vi.fn(() => controls),
    requestAnimationFrame: vi.fn(callback => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    }),
    cancelAnimationFrame: vi.fn(),
    pixelRatio: vi.fn(() => 2),
  };
  return { platform, renderer, labelRenderer, controls, frameCallbacks };
}

describe('ThreeSceneHost', () => {
  it('owns renderer, CSS2D DOM, controls, resize, and one animation loop on mount', () => {
    const { platform, renderer, labelRenderer, controls, frameCallbacks } = createPlatform();
    const host = new ThreeSceneHost({ platform });
    const container = sizedElement(640, 480);
    const canvas = document.createElement('canvas');

    host.mount({ container, canvas });

    expect(platform.createRenderer).toHaveBeenCalledWith({ container, canvas });
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(2);
    expect(container.contains(labelRenderer.domElement)).toBe(true);
    expect(labelRenderer.domElement.style.position).toBe('absolute');
    expect(labelRenderer.domElement.style.pointerEvents).toBe('none');
    expect(platform.createControls).toHaveBeenCalledWith(expect.anything(), renderer.domElement);
    expect(controls.enableDamping).toBe(true);
    expect(controls.dampingFactor).toBe(0.05);
    expect(controls.screenSpacePanning).toBe(false);
    expect(controls.minDistance).toBe(2);
    expect(controls.maxDistance).toBe(500);
    expect(controls.maxPolarAngle).toBe(Math.PI);
    expect(renderer.setSize).toHaveBeenLastCalledWith(640, 480);
    expect(labelRenderer.setSize).toHaveBeenLastCalledWith(640, 480);
    expect(platform.requestAnimationFrame).toHaveBeenCalledOnce();
    expect(controls.update).toHaveBeenCalledOnce();
    expect(renderer.render).toHaveBeenCalledWith(host.scene, expect.anything());
    expect(labelRenderer.render).toHaveBeenCalledWith(host.scene, expect.anything());

    frameCallbacks[0](1);

    expect(controls.update).toHaveBeenCalledTimes(2);
    expect(platform.requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it('cancels animation, disposes platform resources and registry-owned objects, and removes label DOM on dispose', () => {
    const { platform, renderer, labelRenderer, controls } = createPlatform();
    const host = new ThreeSceneHost({ platform });
    const container = sizedElement(320, 200);
    host.mount({ container, canvas: document.createElement('canvas') });
    const object = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    const disposeGeometry = vi.spyOn(object.geometry, 'dispose');
    host.registry.replaceGroup('owned', [object]);

    host.dispose();
    host.dispose();

    expect(platform.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(platform.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(controls.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(container.contains(labelRenderer.domElement)).toBe(false);
    expect(host.scene.children).not.toContain(object);
  });

  it('disposes the prior platform lifecycle before remounting', () => {
    const first = createPlatform();
    const host = new ThreeSceneHost({ platform: first.platform });
    const container = sizedElement(100, 100);

    host.mount({ container, canvas: document.createElement('canvas') });
    host.mount({ container, canvas: document.createElement('canvas') });

    expect(first.platform.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(first.controls.dispose).toHaveBeenCalledOnce();
    expect(first.renderer.dispose).toHaveBeenCalledOnce();
  });
});
