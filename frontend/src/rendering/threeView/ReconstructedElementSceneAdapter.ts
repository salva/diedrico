import * as THREE from 'three';
import type { ReconstructedElementPresentationDto, Vec3 } from '@/application/threePresentation/ThreePresentationModel';

export class ReconstructedElementSceneAdapter {
  createObjects(dtos: ReconstructedElementPresentationDto[]): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    for (const dto of dtos.filter(d => d.visible)) {
      if (dto.kind === 'reconstructed-point') {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(dto.style.radius ?? 0.15, 16, 16), standard(dto.style.color as number));
        mesh.position.copy(vec(dto.position));
        mesh.userData = { type: dto.kind, elementId: dto.sourceEntityId };
        objects.push(mesh);
      } else if (dto.kind === 'reconstructed-plane') {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(dto.geometry.size, dto.geometry.size), new THREE.MeshBasicMaterial({ color: dto.style.color as number, side: THREE.DoubleSide, transparent: true, opacity: dto.style.opacity }));
        mesh.position.copy(vec(dto.geometry.center));
        if (dto.geometry.quaternion) mesh.quaternion.set(dto.geometry.quaternion.x, dto.geometry.quaternion.y, dto.geometry.quaternion.z, dto.geometry.quaternion.w);
        mesh.userData = { type: dto.kind, elementId: dto.sourceEntityId };
        objects.push(mesh);
      } else {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([vec(dto.start), vec(dto.end)]), new THREE.LineBasicMaterial({ color: dto.style.color as number, linewidth: dto.style.lineWidth ?? 3 }));
        line.userData = { type: dto.kind, elementId: dto.sourceEntityId };
        objects.push(line);
        if (dto.kind === 'reconstructed-segment') {
          for (const endpoint of [dto.start, dto.end]) {
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), standard(dto.style.color as number));
            sphere.position.copy(vec(endpoint));
            sphere.userData = { type: `${dto.kind}-endpoint`, elementId: dto.sourceEntityId };
            objects.push(sphere);
          }
        }
      }
    }
    return objects;
  }
}
function standard(color: number) { return new THREE.MeshStandardMaterial({ color, emissive: 0x000000, metalness: 0.3, roughness: 0.7 }); }
function vec(v: Vec3): THREE.Vector3 { return new THREE.Vector3(v.x, v.y, v.z); }
