// Quick debug test for Point3D reconstruction
// Run in browser console when app is loaded

console.log('=== Testing Point3D Reconstruction ===');

// Get the world from the Vue app
const app = document.querySelector('#app').__vueParentComponent;
const world = app?.proxy?.$world || window.__world__;

if (!world) {
  console.error('❌ Could not access World instance');
} else {
  console.log('✓ World instance found');
  
  // Check planes
  const planeH = world.getProjectionPlaneById('P_H');
  const planeV = world.getProjectionPlaneById('P_V');
  
  console.log('Planes:', {
    P_H: !!planeH,
    P_V: !!planeV
  });
  
  // Check 3D points
  const points3D = world.getAll3DPoints();
  console.log('3D Points count:', points3D.length);
  
  if (points3D.length > 0) {
    console.log('Testing first 3D point...');
    const point = points3D[0];
    console.log('Point ID:', point.id);
    console.log('Projections:', {
      plane1: point.plane1Id,
      projection1: point.projection1,
      plane2: point.plane2Id,
      projection2: point.projection2
    });
    
    // Try to realize it
    const realization = world.get3DPointRealization(point.id);
    console.log('Realization:', {
      feasible: realization?.isFeasible,
      position: realization?.getCartesian()
    });
  }
}
