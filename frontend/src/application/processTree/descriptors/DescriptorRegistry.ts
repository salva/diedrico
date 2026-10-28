/**
 * Phase 98: Dynamic Action Descriptions - Descriptor Pattern
 * 
 * DescriptorRegistry maps element types to their descriptors (like CSS selector matching).
 * This enables clean separation of domain (geometry) and presentation (description) logic.
 */

import type { Element } from '@/domain/world/Element';
import type { ElementDescriptor } from './ElementDescriptor';

/**
 * Registry that maps element constructors to their presentation descriptors
 * 
 * Like a CSS stylesheet that maps HTML elements to their styling rules,
 * this registry maps Element classes to their description logic.
 * 
 * Usage:
 * 1. Create a registry for the runtime session: const registry = registerAllDescriptors()
 * 2. Get descriptor for an element: const descriptor = registry.get(element)
 * 3. Use descriptor: descriptor.getConstructionDescription(element, world)
 */
export class DescriptorRegistry {
  private readonly descriptors = new Map<Function, ElementDescriptor>();
  
  /**
   * Register a descriptor for an element type
   * 
   * Like defining a CSS rule: .myElement { ... }
   * 
   * @param elementClass Element constructor function
   * @param descriptor Descriptor instance for this element type
   */
  register<T extends Element>(
    elementClass: new (...args: any[]) => T,
    descriptor: ElementDescriptor<T>
  ): void {
    this.descriptors.set(elementClass, descriptor);
  }
  
  /**
   * Get descriptor for an element (like CSS selector matching)
   * 
   * @param element Element instance to describe
   * @returns Descriptor for this element type
   * @throws Error if no descriptor registered for this element type
   */
  get(element: Element): ElementDescriptor {
    const descriptor = this.descriptors.get(element.constructor);
    if (!descriptor) {
      throw new Error(
        `No descriptor registered for ${element.constructor.name}. ` +
        `Did you forget to populate this DescriptorRegistry?`
      );
    }
    return descriptor;
  }
  
  /**
   * Check if a descriptor is registered for an element type
   * 
   * @param elementClass Element constructor function
   * @returns True if descriptor is registered
   */
  has(elementClass: Function): boolean {
    return this.descriptors.has(elementClass);
  }
  
  /**
   * Clear all registered descriptors (mainly for testing)
   */
  clear(): void {
    this.descriptors.clear();
  }
  
  /**
   * Get number of registered descriptors (mainly for testing)
   */
  size(): number {
    return this.descriptors.size;
  }
}
