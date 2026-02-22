# Services API

Reference for Diedrico's service layer.

## PaperService

Converts domain geometry into drawing primitives for SVG rendering.

```typescript
class PaperService {
  generatePrimitives(context: PrimitiveContext): Primitive[]
  generate3DProjectionPrimitives(context: PrimitiveContext): Primitive[]
}
```

**Pipeline**: Iterates all planes → iterates all elements → resolves visibility → generates primitives with resolved styles.

**Primitive generators**: `pointToPrimitive()`, `lineToPrimitive()`, `segmentToPrimitive()`, `circleToPrimitive()`, `halfHingeLineToPrimitive()`, `guideToPrimitive()`.

**Style resolvers**: `resolvePointStyle()`, `resolveLineStyle()` — apply hover, selected, cascade-highlight, snap, and active-plane states.

## SVGRenderer

Converts paper primitives to SVG attributes.

```typescript
class SVGRenderer {
  transformPoint(point: Vector2, viewport: Viewport): Vector2
  inverseTransformPoint(screenPoint: Vector2, viewport: Viewport): Vector2
  renderPoint(primitive: PointPrimitive): SVGAttributes
  renderLine(primitive: LinePrimitive, viewport: Viewport): SVGAttributes
  renderCircle(primitive: CirclePrimitive): SVGAttributes
  renderPath(primitive: PathPrimitive): SVGAttributes
}
```

**Viewport transform**: `(paperCoord + pan) × zoom → screenCoord`

## Element2DRenderer3D

Renders 2D elements in the Three.js 3D scene.

```typescript
class Element2DRenderer3D {
  renderElements(world: World, options: RenderOptions): THREE.Group
  renderPlaneElements(plane: ProjectionPlane, world: World): THREE.Group
}
```

**Transforms**: Uses `applyMatrix4x3()` with plane's `planeTo3D` matrix. Points → spheres, Lines → tubes, Circles → tube rings.

## ProjectService

Handles persistence via command-sourcing.

```typescript
class ProjectService {
  serialize(world: World, commandStack: CommandStack): ProjectData
  deserializeAndReplay(data: ProjectData, world: World, commandStack: CommandStack): void
}
```

**Schema migration**: Automatically upgrades older project files (snake_case → camelCase, flat → hierarchical IDs).

## GoogleDriveService

Browser-to-Drive integration via `gapi.client`.

```typescript
class GoogleDriveService {
  initialize(): Promise<void>
  signIn(): Promise<void>
  signOut(): Promise<void>
  signInSilently(): Promise<boolean>
  fetchUserProfile(): Promise<UserProfile>
  listFiles(): Promise<DriveFile[]>
  getRecentFiles(): Promise<DriveFile[]>
  createFile(name: string, content: string): Promise<string>
  updateFile(fileId: string, content: string): Promise<void>
  readFile(fileId: string): Promise<string>
  deleteFile(fileId: string): Promise<void>
}
```

**Scope**: `drive.file` (app-created files only) + `userinfo.profile` + `userinfo.email`.

## DependencyService

Manages bidirectional element dependency tracking.

```typescript
class DependencyService {
  registerNode(outputId: string, inputIds: string[]): void
  unregisterNode(elementId: string): void
  getDependents(elementId: string): string[]
  getDependencies(elementId: string): string[]
  getAllDependents(elementId: string): string[]  // transitive
  getAllDependencies(elementId: string): string[]  // transitive
}
```

## ValidationService

Validates geometric feasibility and user inputs before operation execution.

## InputService

Handles canvas mouse/touch events, hit-testing, and tool argument routing.

## RenderService

Low-level rendering functions (used primarily in tests): `renderPoint()`, `renderPlane()`, `renderLine()`.
