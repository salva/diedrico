import * as THREE from 'three';
import type { GuidePresentationDto, Vec3 } from '@/application/threePresentation/ThreePresentationModel';

export class GuideSceneAdapter {
  createObjects(dtos: GuidePresentationDto[]): THREE.Object3D[] {
    return dtos.filter(d => d.visible).map(dto => {
      if (dto.kind === 'guide-perpendicular-plane') {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(dto.geometry.size, dto.geometry.size), new THREE.MeshBasicMaterial({ color: dto.style.color as number, side: THREE.DoubleSide, transparent: true, opacity: dto.style.opacity }));
        mesh.position.copy(vec(dto.geometry.center));
        if (dto.geometry.quaternion) mesh.quaternion.set(dto.geometry.quaternion.x, dto.geometry.quaternion.y, dto.geometry.quaternion.z, dto.geometry.quaternion.w);
        mesh.userData = { type: dto.kind, elementId: dto.sourceEntityId, planeId: dto.planeId };
        return mesh;
      }
      const marker = new THREE.Mesh(new THREE.SphereGeometry(dto.style.radius ?? 0.25, 16, 16), new THREE.MeshStandardMaterial({ color: dto.style.color as number, emissive: 0x886600, metalness: 0.4, roughness: 0.3 }));
      marker.position.copy(vec(dto.position));
      marker.userData = { type: dto.kind, elementId: dto.sourceEntityId };
      return marker;
    });
  }
}
function vec(v: Vec3): THREE.Vector3 { return new THREE.Vector3(v.x, v.y, v.z); }
