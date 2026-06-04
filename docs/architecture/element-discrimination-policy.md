# Element Discrimination Policy

Date: 2026-06-04

## Decision

Use `instanceof` as the canonical runtime dispatch mechanism for domain element classes.

Existing `kind` fields on 3D element classes are serialization/DTO discriminators only. They should not be used for domain behavior dispatch. Do not add broad `kind` fields to 2D elements.

This is remediation plan Phase 5 Option B. It preserves current working domain and presentation code while removing ambiguity created by historical vestigial fields.

## Inventory

Search command:

```bash
rg --count-matches "instanceof\s+(Element|Element2D|Element3D|Point2D|FreePoint2D|IntersectionPoint2D|SiblingIntersectionPoint2D|Line2D|Circle2D|Segment2D|Guide2D|SiblingGuide2D|HalfHingeLine2D|BrokenHalfHingeLine2D|ProjectionPlane|AuxiliaryProjectionPlane|BrokenHingeLine)" "frontend/src"
```

Current count: 97 domain-element `instanceof` matches in `frontend/src`.

Category summary:

| Category | Count | Main locations |
| --- | ---: | --- |
| Domain model and realization | 35 | `frontend/src/domain/world/**` |
| Presentation, read models, and selection | 40 | `frontend/src/application/**`, `frontend/src/types/SelectionMask.ts` |
| Command operations and factories | 14 | `frontend/src/commands/**` |
| Construction use cases | 8 | `frontend/src/application/construction/ConstructionUseCases.ts` |

Representative dispatch sites:

| Area | Examples |
| --- | --- |
| Domain realization/model navigation | `World.ts`, `ProjectionPlane.ts`, `Point.ts`, `Guide.ts`, `HingeLine.ts` |
| Presentation/read models | `CanvasPresentationContext.ts`, `CanvasStylePolicy.ts`, `ElementsPanelReadModel.ts`, `PropertiesDialogReadModel.ts`, `ThreeProjectionPlaneReadPort.ts` |
| Selection | `SelectionMask.ts` |
| Commands/factories | `DeletionSequenceFactory.ts`, `GuideSequenceFactory.ts`, `ProjectionSetupFactory.ts`, `RemoveElementOps.ts` |

## Existing Discriminators

3D domain element `kind` fields currently exist on:

- `Point3DByCoordinates`
- `Point3DFromProjections`
- `Line3DFromProjections`
- `Segment3DFromProjections`
- `Plane3DFromTraces`

These fields are retained as serialization/DTO discrimination only. Runtime domain dispatch remains class-based via `instanceof`.

Projection plane `type` fields remain on `ProjectionPlane`, `FixedProjectionPlane`, and `AuxiliaryProjectionPlane`; they describe projection plane kind, not Line2D element discrimination.

Line2D vestigial `type` fields from P1.4 are absent. A search for `Line2DType`, `TANGENT_TO_CIRCLE`, `SIBLING_GUIDE`, and `readonly type:` under `frontend/src/domain/world` finds no Line2D discriminator fields.
