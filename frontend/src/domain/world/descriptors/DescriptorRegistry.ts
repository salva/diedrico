/**
 * Phase 98: Dynamic Action Descriptions - Descriptor Pattern
 * 
 * DescriptorRegistry maps element types to their descriptors (like CSS selector matching).
 * This enables clean separation of domain (geometry) and presentation (description) logic.
 */

import type { Element } from '../Element';
import type { ElementDescriptor } from './ElementDescriptor';

/**
 * Registry that maps element constructors to their presentation descriptors
 * 
 * Like a CSS stylesheet that maps HTML elements to their styling rules,
 * this registry maps Element classes to their description logic.
 * 
 * Usage:
 * 1. Register descriptors at app startup: DescriptorRegistry.register(FreePoint2D, new FreePoint2DDescriptor())
 * 2. Get descriptor for an element: const descriptor = DescriptorRegistry.get(element)
 * 3. Use descriptor: descriptor.getConstructionDescription(element, world)
 */
export class DescriptorRegistry {
  private static descriptors = new Map<Function, ElementDescriptor>();
  
  /**
   * Register a descriptor for an element type
   * 
   * Like defining a CSS rule: .myElement { ... }
   * 
   * @param elementClass Element constructor function
   * @param descriptor Descriptor instance for this element type
   */
  static register<T extends Element>(
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
  static get(element: Element): ElementDescriptor {
    const descriptor = this.descriptors.get(element.constructor);
    if (!descriptor) {
      throw new Error(
        `No descriptor registered for ${element.constructor.name}. ` +
        `Did you forget to call registerAllDescriptors()?`
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
  static has(elementClass: Function): boolean {
    return this.descriptors.has(elementClass);
  }
  
  /**
   * Clear all registered descriptors (mainly for testing)
   */
  static clear(): void {
    this.descriptors.clear();
  }
  
  /**
   * Get number of registered descriptors (mainly for testing)
   */
  static size(): number {
    return this.descriptors.size;
  }
}
