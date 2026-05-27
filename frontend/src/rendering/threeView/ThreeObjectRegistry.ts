import * as THREE from 'three';

export class ThreeObjectRegistry {
  private readonly groups = new Map<string, THREE.Object3D[]>();
  constructor(private readonly scene: THREE.Scene) {}

  /**
   * Replaces a named group with adapter-created objects whose geometry, materials,
   * descendants, and CSS2D elements are owned by this registry until replacement
   * or disposal.
   */
  replaceGroup(group: string, objects: THREE.Object3D[]): void {
    this.disposeGroup(group);
    for (const object of objects) this.scene.add(object);
    this.groups.set(group, objects);
  }

  dispose(): void {
    for (const group of Array.from(this.groups.keys())) this.disposeGroup(group);
    this.groups.clear();
  }

  disposeGroup(group: string): void {
    const objects = this.groups.get(group) ?? [];
    for (const object of objects) {
      this.scene.remove(object);
      disposeObject(object);
    }
    this.groups.delete(group);
  }
}

export function disposeObject(object: THREE.Object3D): void {
  object.traverse(child => {
    const mesh = child as THREE.Mesh | THREE.Line;
    mesh.geometry?.dispose?.();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach(m => m.dispose());
    else material?.dispose?.();
    const cssObject = child as THREE.Object3D & { element?: HTMLElement };
    cssObject.element?.remove?.();
  });
}
