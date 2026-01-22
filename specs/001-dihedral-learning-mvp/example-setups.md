# Example Setups for Testing

This document describes predefined geometric constructions that can be quickly added to facilitate testing of complex features.

## Projection Plane Setup

**Purpose**: Create T1 (hinge trace), T2 (other trace), and T2' (unfolded position) for testing auxiliary projection plane creation.

**Keyboard Shortcut**: `Alt+E`

### Construction Procedure

This construction follows proper dihedral geometry principles to compute the correct T2' position by geometric unfolding.

#### Phase 1: Create Initial Traces (T1 and T2)

1. **Create free points**: 
   - A1, A2 on P_H (horizontal projection plane)
   - B1 on P_V (vertical projection plane)

2. **Create T1 (hinge trace)**:
   - L1 = line passing through A1 and A2 on P_H
   - This will be the hinge trace

3. **Find ground line crossing**:
   - A3 = intersection point between L1 and HL_HV (hinge line between P_H and P_V)

4. **Create sibling projection**:
   - B2 = A3's sibling point on P_V
   - (Same position on ground line, transferred to P_V)

5. **Create T2 (other trace)**:
   - L2 = line passing through B1 and B2 on P_V
   - This will be the other trace

#### Phase 2: Compute T2' by Geometric Unfolding

The goal is to find where T2 lands on P_H after unfolding the 3D plane 180° around the hinge T1.

6. **Create perpendicular to hinge**:
   - L3 = line perpendicular to L1, passing through A1

7. **Find perpendicular's ground crossing**:
   - C1 = intersection of L3 with HL_HV

8. **Create vertical guide in P_V**:
   - L4 = perpendicular guide on P_V, perpendicular to HL_HV, passing through C1's sibling
   - This is a vertical line that will measure the distance from T2 to the unfolding axis

9. **Measure distance from T2 to unfolding axis**:
   - C2 = intersection of L4 and L2
   - This point represents how far T2 is from the perpendicular plane through L3

10. **Transfer distance to ground line (in P_V)**:
    - D1 = circle in P_V with center at B2 and radius to C2
    - C3 = intersection of D1 with HL_HV
    - This transfers the perpendicular distance to the ground line

11. **Transfer distance to P_H**:
    - D2 = circle in P_H with center at A3 and radius to C3's sibling
    - This is the same radius, now rotated 180° around the hinge

12. **Find unfolded position**:
    - C4 = intersection of D2 with L3
    - This is where the point on T2 lands after unfolding

13. **Create T2' (unfolded position line)**:
    - L5 = line passing through A3 and C4
    - This is the correctly computed T2'

### Result

After this construction:
- **T1** = L1 (hinge trace on P_H) - user selects first
- **T2** = L2 (other trace on P_V) - user selects second  
- **T2'** = L5 (correctly unfolded position of T2 onto P_H) - user selects third

The user can then invoke the CreateProjectionPlaneTool and select these three lines in order to create an auxiliary projection plane.

### Geometric Rationale

The construction in Phase 2 implements the unfolding algorithm:

1. **Steps 6-9**: Measure the perpendicular distance from a point on T2 to the plane containing L3 and perpendicular to both P_H and P_V
2. **Steps 10-12**: Rotate this distance 180° around the hinge line T1 (which passes through A3)
3. **Step 13**: The line through A3 and the unfolded point C4 gives the correct T2'

This ensures that T2' accurately represents where T2 would appear if the 3D plane were folded onto P_H around the hinge T1.

### Implementation Notes

**Current Status**: The `Alt+E` shortcut in Toolbar.vue creates a simplified approximation of T2' with hardcoded coordinates. This works for basic testing but does not follow the proper geometric construction described above.

**Future Enhancement**: Replace the simplified implementation with the full 14-step construction to:
- Demonstrate proper dihedral geometry principles
- Allow users to adjust the initial points (A1, A2, B1) and see T2' update accordingly
- Serve as an educational example of geometric unfolding
- Test the tool with geometrically correct data

### Coordinate Examples

For the simplified version (current implementation):
```
A1: [150, 0]  on P_H
A2: [450, 0]  on P_H
B1: [200, 0]  on P_V
B2: [400, 150] on P_V (approximation)
T2' points: [200, 80] to [400, 120] (approximation)
```

These coordinates provide reasonable geometry for testing but do not follow the exact construction procedure.
