import * as THREE from 'three';
import type { HingePresentationDto, Vec3 } from '@/application/threePresentation/ThreePresentationModel';

export class HingeSceneAdapter {
  createObjects(dtos: HingePresentationDto[]): THREE.Object3D[] {
    return dtos.filter(d => d.visible).map(dto => {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([vec(dto.start), vec(dto.end)]), new THREE.LineDashedMaterial({ color: dto.style.color as number, dashSize: dto.style.dashSize ?? 0.5, gapSize: dto.style.gapSize ?? 0.3, linewidth: dto.style.lineWidth ?? 2 }));
      line.computeLineDistances();
      line.userData = { type: dto.kind, hingeLineId: dto.sourceEntityId };
      return line;
    });
  }
}
function vec(v: Vec3): THREE.Vector3 { return new THREE.Vector3(v.x, v.y, v.z); }
