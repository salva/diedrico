import * as THREE from 'three';
import type { ProjectionLinePresentationDto, Vec3 } from '@/application/threePresentation/ThreePresentationModel';

export function createProjectionLineSceneObjects(dtos: ProjectionLinePresentationDto[]): THREE.Object3D[] {
  return dtos.filter(dto => dto.visible).map(dto => {
    const geometry = new THREE.BufferGeometry().setFromPoints([vec(dto.start), vec(dto.end)]);
    const material = new THREE.LineDashedMaterial({
      color: dto.style.color as number,
      opacity: dto.style.opacity ?? 1,
      transparent: dto.style.transparent ?? false,
      dashSize: dto.style.dashSize ?? 0.35,
      gapSize: dto.style.gapSize ?? 0.22,
      linewidth: dto.style.lineWidth ?? 1,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    line.userData = { type: dto.kind, elementId: dto.sourceEntityId, planeId: dto.planeId };
    return line;
  });
}

function vec(v: Vec3): THREE.Vector3 { return new THREE.Vector3(v.x, v.y, v.z); }
