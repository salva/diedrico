import * as THREE from 'three';
import type { PlanarElementPresentationDto, Vec3 } from '@/application/threePresentation/ThreePresentationModel';

export class PlanarElementSceneAdapter {
  createObjects(dtos: PlanarElementPresentationDto[]): THREE.Object3D[] {
    return dtos.filter(d => d.visible).map(dto => {
      if (dto.kind === 'planar-point') {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(dto.style.radius ?? 0.3, 16, 16), material(dto.style.color as number, dto.style.opacity));
        mesh.position.copy(vec(dto.position));
        mesh.userData = { type: dto.kind, elementId: dto.sourceEntityId, planeId: dto.planeId };
        return mesh;
      }
      if (dto.kind === 'planar-circle') {
        const curve = new THREE.CatmullRomCurve3(dto.points.map(vec), true);
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, dto.points.length, dto.style.radius ?? 0.15, 8, true), material(dto.style.color as number, (dto.style.opacity ?? 1) * 0.7));
        mesh.userData = { type: dto.kind, elementId: dto.sourceEntityId, planeId: dto.planeId };
        return mesh;
      }
      const curve = new THREE.LineCurve3(vec(dto.start), vec(dto.end));
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 1, dto.style.radius ?? 0.15, 8, false), material(dto.style.color as number, (dto.style.opacity ?? 1) * 0.7));
      mesh.userData = { type: dto.kind, elementId: dto.sourceEntityId, planeId: dto.planeId };
      return mesh;
    });
  }
}
function material(color: number, opacity = 1) { return new THREE.MeshBasicMaterial({ color, opacity, transparent: opacity < 1, depthTest: true, depthWrite: true }); }
function vec(v: Vec3): THREE.Vector3 { return new THREE.Vector3(v.x, v.y, v.z); }
