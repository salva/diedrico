import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { AxisDto, LabelDto, ProjectionPlanePresentationDto, Vec3 } from '@/application/threePresentation/ThreePresentationModel';

export function createProjectionPlaneSceneObjects(dtos: ProjectionPlanePresentationDto[]): THREE.Object3D[] {
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
        return createAxisSceneObject(dto);
      case 'axis-label':
      case 'projection-plane-label':
        return createLabelSceneObject(dto);
    }
  });
}

function createAxisSceneObject(dto: AxisDto): THREE.Object3D {
  const axis = new THREE.ArrowHelper(vec(dto.direction).normalize(), vec(dto.origin), dto.length, dto.style.color as number, 1, 0.5);
  axis.userData = { type: dto.kind, axis: dto.axis, planeId: dto.planeId, sourceEntityId: dto.sourceEntityId };
  return axis;
}

function createLabelSceneObject(dto: LabelDto): THREE.Object3D {
  const div = document.createElement('div');
  div.className = dto.className;
  div.textContent = dto.text;
  div.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  div.style.padding = '3px 5px';
  div.style.border = '1px solid #666';
  div.style.borderRadius = '3px';
  div.style.fontSize = '12px';
  div.style.fontWeight = 'bold';
  div.style.fontFamily = 'sans-serif';
  div.style.color = '#333';
  div.style.userSelect = 'none';
  const label = new CSS2DObject(div);
  label.position.copy(vec(dto.position));
  label.userData = { type: dto.kind, sourceEntityId: dto.sourceEntityId, planeId: dto.planeId };
  return label;
}

function vec(v: Vec3): THREE.Vector3 { return new THREE.Vector3(v.x, v.y, v.z); }
