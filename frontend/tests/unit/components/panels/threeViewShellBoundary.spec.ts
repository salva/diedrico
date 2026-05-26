import { describe, expect, it } from 'vitest';
import source from '../../../../src/components/panels/ThreeView.vue?raw';

describe('ThreeView shell boundary', () => {
  it('delegates scene construction to ThreeViewRuntime and avoids low-level Three.js/rendering imports', () => {
    expect(source).toContain("import { ThreeViewRuntime } from '@/rendering/threeView/ThreeViewRuntime'");
    expect(source).toContain('runtime.mount');
    expect(source).toContain('runtime.refresh({ world, displayOptions: displayOptions.value, selectedIds: selectedIds() })');
    expect(source).toContain('runtime.resize');
    expect(source).toContain('runtime.dispose');

    expect(source).not.toMatch(/from 'three'/);
    expect(source).not.toMatch(/CSS2DObject|CSS2DRenderer|OrbitControls|WebGLRenderer|Mesh\(|Line\(|PlaneGeometry|SphereGeometry/);
    expect(source).not.toMatch(/scene\.children|scene\.remove|scene\.add/);
    expect(source).not.toMatch(/realize2D\(world\)|realize3D\(world\)|isGuide2D|isSiblingGuide2D/);
    expect(source).not.toContain('Element2DRenderer3D');
  });
});
