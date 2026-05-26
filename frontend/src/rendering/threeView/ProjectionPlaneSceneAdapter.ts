import * as THREE from 'three';
import type { ProjectionPlanePresentationDto, Vec3 } from '@/application/threePresentation/ThreePresentationModel';
import { AxisLabelSceneAdapter } from './AxisLabelSceneAdapter';

export class ProjectionPlaneSceneAdapter {
  private readonly labels = new AxisLabelSceneAdapter();
  createObjects(dtos: ProjectionPlanePresentationDto[]): THREE.Object3D[] {
    return dtos.filter(d => d.visible).map(dto => {
      switch (dto.kind) {
        case 'projection-plane-grid': {
          const geometry = new THREE.BufferGeometry();
          const vertices = dto.segments.flatMap(s => [s.start.x, s.start.y, s.start.z, s.end.x, s.end.y, s.end.z]);
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
          const object = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: dto.style.color as number, opacity: dto.style.opacity, transparent: dto.style.transparent }));
          object.userData = { type: dto.kind, planeId: dto.planeId };
          return object;
        }
        case 'projection-plane-surface': {
          const mesh = new THREE.Mesh(new THREE.PlaneGeometry(dto.geometry.size, dto.geometry.size), new THREE.MeshBasicMaterial({ color: dto.style.color as number, side: THREE.DoubleSide, transparent: true, opacity: dto.style.opacity }));
          mesh.position.copy(vec(dto.geometry.center));
          mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), vec(dto.geometry.normal).normalize());
          mesh.userData = { type: dto.kind, planeId: dto.planeId };
          return mesh;
        }
        case 'reference-axis':
        case 'auxiliary-axis':
          return this.labels.createAxis(dto);
        case 'axis-label':
        case 'projection-plane-label':
          return this.labels.createLabel(dto);
      }
    });
  }
}
function vec(v: Vec3): THREE.Vector3 { return new THREE.Vector3(v.x, v.y, v.z); }
