import { describe, expect, it } from 'vitest';
import source from '../../../../src/components/panels/ThreeView.vue?raw';

describe('ThreeView shell boundary', () => {
  it('delegates scene construction to ThreeViewRuntime through the three-presentation model and avoids low-level Three.js/rendering imports', () => {
    expect(source).toContain("import { ThreeViewRuntime } from '@/rendering/threeView/ThreeViewRuntime'");
    expect(source).toContain("ThreePresentationInjectionKey");
    expect(source).not.toContain('getReadPorts()');
    expect(source).toContain('runtime.mount');
    expect(source).toContain('runtime.refresh(threePresentationPort.buildThreePresentationModel(displayOptions.value, selectedIds()))');
    expect(source).toContain('runtime.resize');
    expect(source).toContain('runtime.dispose');

    expect(source).not.toMatch(/from 'three'/);
    expect(source).not.toMatch(/CSS2DObject|CSS2DRenderer|OrbitControls|WebGLRenderer|Mesh\(|Line\(|PlaneGeometry|SphereGeometry/);
    expect(source).not.toMatch(/scene\.children|scene\.remove|scene\.add/);
    expect(source).not.toMatch(/realize2D\(|realize3D\(|isGuide2D|isSiblingGuide2D/);
    expect(source).not.toContain('Element2DRenderer3D');
  });

  it('requires the app shell overlay to own pointer events instead of allowing clicks to pass through to the SVG canvas', async () => {
    const appSource = await import('../../../../src/App.vue?raw').then(module => module.default as string);
    expect(appSource).toContain('class="three-view-overlay"');
    expect(appSource).toMatch(/\.three-view-overlay\s*\{[\s\S]*pointer-events:\s*auto;/);
    expect(appSource).not.toMatch(/\.three-view-overlay\s*\{[\s\S]*pointer-events:\s*none;/);
  });

});
