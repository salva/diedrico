import { Matrix3, Vector3 } from 'three';
import { Matrix4x3, Matrix3x4 } from '@/utils/threeUtils';

export function computeBackward2DMatrix(planeToPaper: Matrix3): { paperToPlane: Matrix3; feasible: boolean } {
  let feasible = true;
  let paperToPlane: Matrix3;

  try {
    const det = planeToPaper.determinant();

    if (Math.abs(det) < 1e-10) {
      // Matrix is singular (degenerate plane) - mark infeasible
      feasible = false;
      paperToPlane = new Matrix3(); // Identity as fallback
    } else {
      paperToPlane = planeToPaper.clone().invert();
    }
  } catch {
    // Inversion failed - mark infeasible
    feasible = false;
    paperToPlane = new Matrix3(); // Identity as fallback
  }

  return { paperToPlane, feasible };
}

export function computeBackward3DMatrix(planeTo3D: Matrix4x3): Matrix3x4 {
  // planeTo3D is stored ROW-MAJOR: [m11, m12, m13, m21, m22, m23, m31, m32, m33, m41, m42, m43]
  // Matrix layout (4 rows x 3 columns):
  //   [ m11  m12  m13 ]   Row 1: e[0], e[1], e[2]
  //   [ m21  m22  m23 ]   Row 2: e[3], e[4], e[5]
  //   [ m31  m32  m33 ]   Row 3: e[6], e[7], e[8]
  //   [ m41  m42  m43 ]   Row 4: e[9], e[10], e[11]
  //
  // Columns represent: [U-axis in 3D, V-axis in 3D, origin in 3D]
  // For ROW-MAJOR storage, column k elements are at indices: k, k+3, k+6, k+9
  const uAxis = new Vector3(
    planeTo3D.elements[0],
    planeTo3D.elements[3],
    planeTo3D.elements[6]
  ).normalize();

  const vAxis = new Vector3(
    planeTo3D.elements[1],
    planeTo3D.elements[4],
    planeTo3D.elements[7]
  ).normalize();

  const origin = new Vector3(
    planeTo3D.elements[2],
    planeTo3D.elements[5],
    planeTo3D.elements[8]
  );

  // Build projection matrix: (point - origin) dot basis vectors
  const threeDToPlane = new Matrix3x4();
  threeDToPlane.set(
    uAxis.x, uAxis.y, uAxis.z, -origin.dot(uAxis),
    vAxis.x, vAxis.y, vAxis.z, -origin.dot(vAxis),
    0, 0, 0, 1
  );

  return threeDToPlane;
}
