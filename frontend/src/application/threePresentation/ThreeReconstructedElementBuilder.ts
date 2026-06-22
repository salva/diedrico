import { Quaternion, Vector3, Vector4 } from 'three';
import type { ThreePresentationContext } from './ThreePresentationContext';
import { getPlaneMeshSize } from '@/config/rendering3D';
import { domainDirectionToThreeJS, domainToThreeJS } from '@/utils/threeUtils';
import type { ThreeReconstructedReadModel } from './ThreePresentationReadModel';
import { reconstructedStyleFromDomain, THREE_STYLE, visibleFromDomain } from './ThreeStylePolicy';
import type { Vec3 } from './ThreePresentationModel';

export type { ThreeReconstructedReadModel } from './ThreePresentationReadModel';

export function buildReconstructedModels(context: ThreePresentationContext): ThreeReconstructedReadModel {
  return {
      points: context.get3DPoints().flatMap(point => {
        if (!visibleFromDomain(point) || !context.isElementVisible(point)) return [];
        const realization = context.get3DPointRealization(point.id);
        if (!realization) throw new Error(`Missing 3D point realization for ${point.id}`);
        if (!realization.isFeasible()) return [];
        const [x, y, z] = realization.getCartesian();
        return [{ id: point.id, kind: 'reconstructed-point' as const, visible: true, style: reconstructedStyleFromDomain(point), position: v(domainToThreeJS(new Vector4(x, y, z, 1))) }];
      }),
      lines: context.get3DLines().flatMap(line => {
        if (!visibleFromDomain(line) || !context.isElementVisible(line)) return [];
        const realization = context.get3DLineRealization(line.id);
        if (!realization) throw new Error(`Missing 3D line realization for ${line.id}`);
        if (!realization.isFeasible()) return [];
        const point = domainToThreeJS(realization.point);
        const direction = domainDirectionToThreeJS(new Vector3(realization.getDirection().x, realization.getDirection().y, realization.getDirection().z)).normalize();
        return [{ id: line.id, kind: 'reconstructed-line' as const, visible: true, style: reconstructedStyleFromDomain(line), start: v(point.clone().add(direction.clone().multiplyScalar(-THREE_STYLE.infiniteLineExtent / 2))), end: v(point.clone().add(direction.clone().multiplyScalar(THREE_STYLE.infiniteLineExtent / 2))) }];
      }),
      segments: context.get3DSegments().flatMap(segment => {
        if (!visibleFromDomain(segment) || !context.isElementVisible(segment)) return [];
        const realization = context.get3DSegmentRealization(segment.id);
        if (!realization) throw new Error(`Missing 3D segment realization for ${segment.id}`);
        if (!realization.isFeasible()) return [];
        return [{ id: segment.id, kind: 'reconstructed-segment' as const, visible: true, style: reconstructedStyleFromDomain(segment), start: v(domainToThreeJS(realization.startPoint)), end: v(domainToThreeJS(realization.endPoint)) }];
      }),
      planes: context.get3DPlanes().flatMap(plane => {
        if (!visibleFromDomain(plane) || !context.isElementVisible(plane)) return [];
        const realization = context.get3DPlaneRealization(plane.id);
        if (!realization) throw new Error(`Missing 3D plane realization for ${plane.id}`);
        if (!realization.feasible || !realization.originPoint || !realization.normal) return [];
        const origin = domainToThreeJS(realization.originPoint);
        const normal = domainDirectionToThreeJS(new Vector3(realization.normal.x, realization.normal.y, realization.normal.z)).normalize();
        const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal);
        return [{ id: plane.id, kind: 'reconstructed-plane' as const, visible: true, style: THREE_STYLE.reconstructedPlane, geometry: { center: v(origin), normal: v(normal), size: getPlaneMeshSize(plane.id), quaternion: { x: q.x, y: q.y, z: q.z, w: q.w } } }];
      }),
    };
}

function v(vector: { x: number; y: number; z: number }): Vec3 { return { x: vector.x, y: vector.y, z: vector.z }; }
