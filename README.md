# Diedrico

**An educational web application for teaching dihedral (orthographic) projection**

Diedrico helps students learn constructive dihedral projection. It emphasizes the construction process: each visible object is produced by explicit tool use, recorded in undoable commands, and represented in the process tree so dependencies remain inspectable.

## Purpose

- Engineering and technical-drawing students learning horizontal/vertical projection planes.
- Instructors demonstrating construction sequences step by step.
- Self-learners exploring how 2D projections relate to reconstructed 3D geometry.

## Current application

Diedrico is a frontend-only Vue 3 + TypeScript workspace. The runtime source lives under `frontend/`; current product and architecture documentation lives under `docs/`; refactor-wave evidence lives under `architecture-audit/`.

Key capabilities:

- 2D drawing workspace with projection planes, hinge lines, guides, points, lines, segments, circles, and intersections.
- Application-level tool controllers that turn UI interaction into command/use-case intents.
- Undo/redo through committed command history.
- Process tree and dependency graph support for explicit construction history.
- Read-only 3D view assembled from presentation selectors and scene adapters.
- Browser/local and Google Drive project persistence using the current project schema.

## Getting started

### Prerequisites

- Node.js >=20.19.0
- npm >=10.0.0 (see root `package.json` engines)
- A modern desktop browser

### Install and run

```bash
npm install
npm run dev
```

Open the Vite dev server URL printed by npm, normally `http://localhost:5173`.

## Project structure

```text
diedrico/
├── frontend/              # Vue 3 + TypeScript application workspace
│   ├── src/
│   │   ├── application/   # use cases, controllers, presentation selectors
│   │   ├── commands/      # command history and serializable operations
│   │   ├── components/    # Vue UI shells and panels
│   │   ├── domain/        # geometry, process tree, world, projection planes
│   │   ├── rendering/     # Three.js scene adapters/runtime
│   │   ├── infrastructure/ # persistence, input, Drive and SVG adapters
│   │   ├── stores/        # UI/runtime Pinia stores
│   │   └── tools/         # interactive tool argument collectors
│   └── tests/             # Vitest and Playwright tests
├── docs/                  # current guide, architecture, API, contributing docs
├── specs/                 # reserved for current specs; stale MVP specs were removed
└── architecture-audit/    # reviewed refactor-wave artifacts and validation logs
```

There is no active backend workspace in the current project.

## Available scripts

Root scripts are the project cadence surface and delegate to the frontend workspace or VitePress docs where applicable:

```bash
npm run dev
npm run build
npm run test
npm run lint
npm run test:architecture
npm run test:e2e
npm run docs:build
npm run docs:dev
npm run docs:preview
```

Frontend workspace scripts are available with `--workspace=frontend`, for example:

```bash
npm run test --workspace=frontend
npm run test:architecture --workspace=frontend
npm run test:e2e --workspace=frontend
npm run build --workspace=frontend
```

## Documentation

- [Guide](docs/guide/getting-started.md) — user-facing workspace and tool guidance.
- [Architecture overview](docs/architecture/overview.md) — current layering and boundaries.
- [API reference](docs/api/domain-model.md) — current internal module reference.
- [Testing](docs/contributing/testing.md) — validation commands and known residual debt.

## Architecture principles

1. Domain model code owns geometric concepts and calculations.
2. Application use cases/controllers translate UI intents into commands and presentation models.
3. Vue components render state and forward interaction; they do not own geometry mutations.
4. Stores hold UI/runtime state and service instances, not a parallel domain model.
5. Rendering consumes selector DTOs/adapters rather than coupling components directly to rendering engines.
6. Persistence accepts only the current schema and replays serialized operation descriptors through the registry.

## Contributing

Use the current docs and reviewed `architecture-audit/` wave artifacts as project authority. Do not use removed MVP planning/spec files as design authority. Keep documentation changes synchronized with the current source tree and run the validation commands relevant to the change.

## License

This project is licensed under the GNU General Public License v3.0 or later. See [LICENSE](LICENSE).
