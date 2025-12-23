/**
 * World Operations - Operations for modifying the geometric world state
 * These operations manipulate Element2D and Element3D collections
 */

import type { Operation } from '../Command';
import type { OperationResult } from '../../types/CommandTypes';
import type { Element2D, Element3D } from '../../types/ElementTypes';

/**
 * AddElement operation - adds a 2D or 3D element to the world
 */
export class AddElementOp implements Operation {
  id: string;
  type = 'AddElement';
  args: {
    elementPath: string;          // Symbolic path: "/world/elements2D/{id}" or "/world/elements3D/{id}"
    elementData: Element2D | Element3D;
  };

  private worldStore: any;  // Store reference (injected)

  constructor(
    id: string,
    elementPath: string,
    elementData: Element2D | Element3D,
    worldStore: any
  ) {
    this.id = id;
    this.args = { elementPath, elementData };
    this.worldStore = worldStore;
  }

  execute(): OperationResult {
    try {
      const element = this.args.elementData;

      // Determine if 2D or 3D based on path
      if (this.args.elementPath.includes('elements2D')) {
        this.worldStore.addElement2D(element as Element2D);
      } else {
        this.worldStore.addElement3D(element as Element3D);
      }

      return {
        success: true,
        outputs: {
          elementPath: this.args.elementPath,
          elementId: element.id
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to add element'
      };
    }
  }

  rollback(): void {
    const element = this.args.elementData;

    // Remove element from appropriate collection
    if (this.args.elementPath.includes('elements2D')) {
      this.worldStore.removeElement2D(element.id);
    } else {
      this.worldStore.removeElement3D(element.id);
    }
  }
}

/**
 * RemoveElement operation - removes an element from the world
 */
export class RemoveElementOp implements Operation {
  id: string;
  type = 'RemoveElement';
  args: {
    elementPath: string;
    is2D: boolean;
  };

  private worldStore: any;
  private removedElement: Element2D | Element3D | null = null;

  constructor(
    id: string,
    elementPath: string,
    is2D: boolean,
    worldStore: any
  ) {
    this.id = id;
    this.args = { elementPath, is2D };
    this.worldStore = worldStore;
  }

  execute(): OperationResult {
    try {
      // Extract element ID from path
      const elementId = this.args.elementPath.split('/').pop()!;

      // Store element for rollback
      if (this.args.is2D) {
        this.removedElement = this.worldStore.getElement2D(elementId);
        this.worldStore.removeElement2D(elementId);
      } else {
        this.removedElement = this.worldStore.getElement3D(elementId);
        this.worldStore.removeElement3D(elementId);
      }

      return {
        success: true,
        outputs: {
          removedElementId: elementId
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to remove element'
      };
    }
  }

  rollback(): void {
    // Restore removed element
    if (this.removedElement) {
      if (this.args.is2D) {
        this.worldStore.addElement2D(this.removedElement as Element2D);
      } else {
        this.worldStore.addElement3D(this.removedElement as Element3D);
      }
    }
  }
}

/**
 * UpdateElement operation - updates an element's properties
 */
export class UpdateElementOp implements Operation {
  id: string;
  type = 'UpdateElement';
  args: {
    elementPath: string;
    is2D: boolean;
    updates: Partial<Element2D> | Partial<Element3D>;
  };

  private worldStore: any;
  private originalElement: Element2D | Element3D | null = null;

  constructor(
    id: string,
    elementPath: string,
    is2D: boolean,
    updates: Partial<Element2D> | Partial<Element3D>,
    worldStore: any
  ) {
    this.id = id;
    this.args = { elementPath, is2D, updates };
    this.worldStore = worldStore;
  }

  execute(): OperationResult {
    try {
      // Extract element ID from path
      const elementId = this.args.elementPath.split('/').pop()!;

      // Store original for rollback
      if (this.args.is2D) {
        this.originalElement = { ...this.worldStore.getElement2D(elementId) };
        this.worldStore.updateElement2D(elementId, this.args.updates);
      } else {
        this.originalElement = { ...this.worldStore.getElement3D(elementId) };
        this.worldStore.updateElement3D(elementId, this.args.updates);
      }

      return {
        success: true,
        outputs: {
          elementPath: this.args.elementPath,
          updated: true
        }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Failed to update element'
      };
    }
  }

  rollback(): void {
    // Restore original element
    if (this.originalElement) {
      const elementId = this.args.elementPath.split('/').pop()!;

      if (this.args.is2D) {
        this.worldStore.updateElement2D(elementId, this.originalElement);
      } else {
        this.worldStore.updateElement3D(elementId, this.originalElement);
      }
    }
  }
}
