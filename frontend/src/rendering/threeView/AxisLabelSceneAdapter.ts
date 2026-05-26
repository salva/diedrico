import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { AxisDto, LabelDto, Vec3 } from '@/application/threePresentation/ThreePresentationModel';

export class AxisLabelSceneAdapter {
  createAxis(dto: AxisDto): THREE.Object3D {
    const axis = new THREE.ArrowHelper(vec(dto.direction).normalize(), vec(dto.origin), dto.length, dto.style.color as number, 1, 0.5);
    axis.userData = { type: dto.kind, axis: dto.axis, planeId: dto.planeId, sourceEntityId: dto.sourceEntityId };
    return axis;
  }

  createLabel(dto: LabelDto): THREE.Object3D {
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
}
function vec(v: Vec3): THREE.Vector3 { return new THREE.Vector3(v.x, v.y, v.z); }
