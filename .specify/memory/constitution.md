<!--
SYNC IMPACT REPORT
==================
Version Change: 1.5.0 → 1.6.0
Change Type: MINOR (Added homogeneous coordinates principle)

Changes Made:
- Added Principle IX: Homogeneous Coordinate System
- Established array-based homogeneous coordinates as standard for all geometric data
- Mandated consistent representation: points [x,y,1] or [x,y,z,1], vectors [dx,dy,0] or [dx,dy,dz,0]

Previous Changes (v1.5.0):
- Added Principle VIII: Principle-Based Rendering and Data Handling
- Established that rendering must derive from world data structures using geometric first principles
- Documented exceptions for initial world elements (P_H, P_V, origin O)

Previous Changes (v1.4.0):
- Added Principle VII: Pedagogical Transparency Over Convenience
- Formalized design philosophy prioritizing visible construction process
- Established guidelines for balancing UX automation with learning objectives

Previous Changes (v1.3.0):
- Added "Project Purpose" section explaining educational focus
- Documented that Diedrico is for learning dihedral/orthographic projection
- Emphasized process-oriented learning over final results

Previous Changes (v1.2.0):
- Added Principle VI: English-Only Documentation and UI

Previous Changes (v1.1.0):
- Simplified Development Workflow for one-person project
- Streamlined Governance section
- Made testing requirements more pragmatic for solo dev

Templates Requiring Updates:
- ✅ No template changes needed (templates already flexible)

Follow-up Items: None

Notes:
- Pedagogical transparency principle now guides all feature development
- Educational focus elevated from project purpose to core architectural principle
-->

# Diedrico Constitution

## Project Purpose

Diedrico is an educational web application designed for learning **dihedral projection** (also known as orthographic projection), a fundamental technical drawing discipline commonly taught in engineering programs.

### Educational Focus

- **Process-Oriented Learning**: The primary value is in the constructive process—how students build and understand the projection steps
- **Interactive Construction**: Users learn by doing, constructing projections step-by-step
- **Result Validation**: While the final drawing matters for correctness verification, the journey of construction is equally important
- **Engineering Foundation**: Supports the spatial reasoning and technical drawing skills essential for engineering education

**Design Implication**: Features should emphasize the construction workflow, provide step-by-step guidance, show intermediate states, and help users understand *why* each step works, not just *what* the final result should be.

## Core Principles

### I. Layered Architecture (NON-NEGOTIABLE)

The application MUST maintain clear and inviolable separation of concerns through a strict layered architecture:

- **Presentation Layer**: Vue.js components handling UI/UX (frontend)
- **Application Layer**: Command pattern implementations orchestrating business logic
- **Domain Layer**: Core business logic and domain models (shared)
- **Data Layer**: Storage abstraction and persistence (backend)

**Rules**:
- Upper layers MAY depend on lower layers, but NEVER the reverse
- Each layer MUST communicate through well-defined interfaces
- Cross-layer violations are considered critical defects
- Layer boundaries MUST be verified during development

**Rationale**: Maintaining strict layering ensures testability, maintainability, and allows independent evolution of each layer. This is fundamental to long-term sustainability of the codebase.

### II. Command Pattern (MANDATORY)

All user actions and system operations MUST be implemented using the Command pattern:

- Every user interaction MUST be encapsulated as a command object
- Commands MUST be self-contained with execute(), undo(), and validation methods
- Command history MUST be maintained for undo/redo functionality
- Commands MUST validate state before execution
- Backend operations triggered by frontend MUST also use command pattern

**Rules**:
- No direct manipulation of domain models from presentation layer
- All state changes MUST flow through commands
- Commands MUST be serializable for potential remote execution
- Command execution MUST be atomic where possible

**Rationale**: The command pattern provides a uniform interface for all operations, enables undo/redo, facilitates testing, and creates a clear audit trail of system actions.

### III. Frontend-First with Backend Support

Diedrico is fundamentally a **web frontend application** with backend services for persistence:

- The **frontend** (Vue.js) is the primary user interface and experience
- The **backend** (Node.js) serves primarily for project storage and retrieval
- Frontend MUST be capable of rich interaction without constant backend calls
- Backend MUST provide RESTful APIs for CRUD operations on projects
- State management MUST prioritize frontend performance

**Rules**:
- Frontend MUST handle all presentation logic
- Backend MUST NOT contain business logic that belongs in the frontend
- API contracts MUST be clearly defined and versioned
- Frontend MUST handle offline scenarios gracefully where feasible

**Rationale**: Clear separation between frontend-driven UX and backend-driven persistence ensures proper responsibility distribution and optimal user experience.

### IV. Technology Discipline

The technology stack MUST remain focused and consistent:

- **Frontend**: Vue.js 3+ with Composition API, TypeScript encouraged
- **Backend**: Node.js with Express or Fastify, TypeScript encouraged
- **Storage**: JSON files, SQLite, or PostgreSQL (as needed)
- **Bundler**: Vite for development and production builds
- **Testing**: Vitest for unit tests, Playwright or Cypress for E2E

**Rules**:
- No framework additions without documented justification
- All production dependencies MUST be actively maintained
- TypeScript MUST be used for new modules requiring type safety
- Package updates MUST be tested before merging

**Rationale**: A disciplined tech stack reduces cognitive load and improves long-term maintainability.

### V. Pragmatic Testing

Testing is important but should be balanced with development velocity:

- Unit tests SHOULD be written for complex business logic
- Integration tests for layer boundaries when practical
- E2E tests for critical user journeys
- Write tests when they add value, either before or after implementation

**Rules**:
- Complex commands and business logic MUST have tests
- Simple CRUD operations MAY skip tests if trivial
- Flaky or outdated tests should be fixed or removed promptly
- When bugs occur, add tests to prevent regression

**Rationale**: Testing ensures correctness and prevents regressions, but as a solo developer, focus testing effort where it provides the most value.

### VI. English-Only Documentation and UI

All project artifacts and user-facing content MUST be in English:

- **Code**: Variable names, function names, class names, comments
- **Documentation**: README, specs, plans, tasks, technical docs
- **User Interface**: All UI text, labels, messages, tooltips
- **Git**: Commit messages, branch names, PR descriptions
- **API**: Endpoint names, parameter names, error messages

**Rules**:
- AI interactions MAY be in Spanish for development convenience
- All AI-generated outputs MUST be in English
- Code comments explaining complex logic MUST be in English
- No mixed-language content in any artifact
- English ensures consistency and future maintainability

**Rationale**: English is the universal language for software development. Maintaining English-only artifacts ensures the project remains accessible for potential collaboration, open-source contribution, or future handoff, while also following industry standards.

### VII. Pedagogical Transparency Over Convenience

Diedrico prioritizes making the constructive process visible and traceable over automating or hiding intermediate steps:

- **Explicit Operations**: Users MUST perform deliberate actions; the system does not silently complete constructions or "fix" inputs
- **Visible Process**: All intermediate steps and dependencies MUST be visible in the UI
- **Traceable Decisions**: When the system automates supporting actions (e.g., creating intersection points), these MUST be recorded explicitly as auxiliary actions in the construction history
- **No Hidden Magic**: The application surfaces problems (infeasibility) rather than hiding them; users learn by understanding and resolving constraints

**Rules**:
- Every construction MUST be traceable to explicit user actions
- Automated convenience features (snapping, automatic point creation) MUST record what they create
- The construction history MUST reflect the complete dependency graph
- Error states and infeasibility MUST be surfaced, not silently resolved
- When balancing UX convenience vs educational transparency, choose transparency
- Auxiliary/supporting geometry MAY be created automatically but MUST appear as nested actions in history

**Rationale**: The educational value lies in understanding *how* projections are constructed, not just *what* the final result is. Making every step explicit and traceable ensures students understand the geometric reasoning process. This principle distinguishes Diedrico from productivity CAD tools—we're optimizing for learning, not speed.

### VIII. Principle-Based Rendering and Data Handling

The rendering and manipulation of world data structures MUST be performed according to geometric first principles, NOT using special-case or hard-coded rendering logic:

- **Dynamic Derivation**: All viewport rendering MUST be derived dynamically from the world data structures using geometric principles
- **No Special Cases**: Projection planes, elements, guides, and all geometric entities MUST be rendered using the same geometric computation engine
- **First Principles Only**: Coordinate transformations, projections, intersections, and all geometric operations MUST follow mathematical first principles

**Exceptions (Initial World Elements Only)**:
- The following elements MAY have special handling at initialization time ONLY:
  - Projection planes P_H and P_V (added during world initialization)
  - Origin point O (0, 0, 0)
  - Hinge line HL_HV between P_H and P_V
- After initialization, these elements MUST be treated like any other world element

**Rules**:
- NO hard-coded rendering paths for specific planes or element types (beyond initial setup)
- ALL geometric calculations MUST use general-purpose geometry algorithms
- Coordinate transformations MUST use matrix-based operations consistently
- New projection planes (auxiliary, profile, etc.) MUST work without code changes
- Element rendering MUST derive from element definitions and realization cache

**Rationale**: Hard-coding special cases for specific planes or elements creates brittleness and prevents the system from scaling to arbitrary projections. A principle-based approach ensures that auxiliary planes, custom projections, and future geometric constructions work automatically through the same mathematical foundation. This also serves the educational mission—the code itself embodies the geometric principles being taught.

### IX. Homogeneous Coordinate System

All geometric data manipulations MUST be performed using homogeneous coordinates with array-based representations:

- **Homogeneous Coordinates**: ALL geometric calculations MUST use homogeneous coordinate representation
- **Array-Based Storage**: Points, vectors, and transformations MUST be represented as JavaScript/TypeScript arrays
- **Consistent Convention**:
  - 2D points: `[x, y, 1]` (w=1 for regular points)
  - 2D vectors/directions: `[dx, dy, 0]` (w=0 to distinguish from points)
  - 3D points: `[x, y, z, 1]` (w=1 for regular points)
  - 3D vectors/directions: `[dx, dy, dz, 0]` (w=0 to distinguish from points)
  - 2D transformations: `[a, b, c, d, tx, ty]` (affine 2D matrix, 6 numbers)
  - 3D transformations: 16-element array (Matrix4, column-major order)

**Rules**:
- NO separate x, y, z fields for point storage in geometric computations (use arrays)
- ALL coordinate transformations MUST use matrix multiplication on homogeneous coordinates
- Geometric algorithms (intersection, projection, parallel construction) MUST operate on homogeneous coordinates
- Conversion to Cartesian coordinates (when needed for display) MUST divide by w component
- w=1 is MANDATORY for regular geometric points (not optional or "typically")
- w=0 is MANDATORY for direction vectors and vectors at infinity

**Rationale**: Homogeneous coordinates provide a unified mathematical framework that:
- Simplifies transformations (translation, rotation, projection all use matrix multiplication)
- Enables elegant handling of points at infinity (parallel lines, ideal points)
- Reduces code complexity (single code path for all geometric operations)
- Improves numerical stability in many geometric calculations
- Aligns with computer graphics best practices (Three.js, WebGL use homogeneous coordinates)
- Makes the code more maintainable and mathematically rigorous

**Examples**:
```typescript
// CORRECT: Homogeneous coordinate representation
const point2D: number[] = [100, 200, 1];           // Point at (100, 200)
const direction2D: number[] = [1, 0, 0];           // Unit vector in X direction
const point3D: number[] = [50, 75, 100, 1];        // 3D point at (50, 75, 100)
const transform2D: number[] = [1, 0, 0, 1, 10, 20]; // Translation by (10, 20)

// INCORRECT: Separate coordinate fields
const point = { x: 100, y: 200 };                  // ❌ Not allowed in geometric calculations
```

## Architecture Constraints

### Layer Communication Rules

- Frontend commands → Frontend services → Backend API
- Backend API → Backend commands → Storage layer
- NO direct storage access from frontend
- NO presentation logic in backend

## Development Workflow

### Feature Development (Solo)

1. **Specify**: Write down what you're building (can be brief notes or full spec)
2. **Design**: Sketch out commands and API contracts if needed
3. **Implement**: Build feature following layered architecture
4. **Validate**: Quick check that layers are properly separated
5. **Test**: Add tests for complex logic or critical paths
6. **Commit**: Commit working code with clear message

### Self-Review Checklist (Quick)

Before committing, verify:
- [ ] Layered architecture maintained (no cross-layer violations)
- [ ] Commands used for state changes (execute/undo if needed)
- [ ] Complex logic has tests
- [ ] Code is understandable to future-you

### Breaking Changes

- For API changes, consider versioning if you expect external consumers
- Otherwise, update frontend and backend together in same commit

## Governance

This constitution documents the core architectural principles for Diedrico. Follow these principles to maintain code quality and prevent technical debt.

### Amendment Process

When you need to update this constitution:

1. Document why the change is needed
2. Update the version following semantic versioning:
   - **MAJOR**: Removing or fundamentally changing a principle
   - **MINOR**: Adding new principles or expanding guidance
   - **PATCH**: Clarifications, typos, wording improvements
3. Update relevant templates if needed
4. Update the sync report at the top of this file

### Compliance

- The 9 core principles (Layered Architecture, Command Pattern, Frontend-First, Tech Discipline, Pragmatic Testing, English-Only, Pedagogical Transparency, Principle-Based Rendering, Homogeneous Coordinate System) are the foundation
- If you need to violate a principle, document why in your spec or plan
- When in doubt, prefer simplicity but respect the architecture

### Related Documentation

- Feature templates: `.specify/templates/*.md`
- Agent workflows: `.github/agents/speckit.*.agent.md`

**Version**: 1.6.0 | **Ratified**: 2025-12-22 | **Last Amended**: 2025-12-28
