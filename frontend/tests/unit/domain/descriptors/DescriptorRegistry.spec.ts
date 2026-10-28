import { describe, expect, it } from 'vitest';
import { DescriptorRegistry } from '@/application/processTree/descriptors/DescriptorRegistry';
import { registerAllDescriptors } from '@/application/processTree/descriptors/registerDescriptors';
import type { ElementDescriptor } from '@/application/processTree/descriptors/ElementDescriptor';
import { Element } from '@/domain/world/Element';
import { FreePoint2D } from '@/domain/world/Point';

class TestElement extends Element {
  clone(): Element {
    return new TestElement(this.id, this.label, this.visualStyle);
  }

  getDependencies(): string[] {
    return [];
  }
}

const descriptor: ElementDescriptor<TestElement> = {
  getTypeName: () => 'Test Element',
  getConstructionDescription: () => [],
};

describe('DescriptorRegistry', () => {
  it('keeps registrations owned by each registry instance', () => {
    const first = new DescriptorRegistry();
    const second = new DescriptorRegistry();

    first.register(TestElement, descriptor);

    expect(first.has(TestElement)).toBe(true);
    expect(first.get(new TestElement('test'))).toBe(descriptor);
    expect(second.has(TestElement)).toBe(false);
    expect(() => second.get(new TestElement('test'))).toThrow(/No descriptor registered/);
  });

  it('creates a populated registry for runtime and test sessions', () => {
    const registry = registerAllDescriptors();

    expect(registry.size()).toBeGreaterThan(0);
    expect(registry.has(FreePoint2D)).toBe(true);
  });
});
