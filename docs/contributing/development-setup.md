# Development Setup

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

## Clone and Install

```bash
git clone <repo-url> diedrico
cd diedrico
npm install
```

This installs dependencies for both `frontend/` and `backend/` workspaces.

## Running

### Frontend Development Server

```bash
cd frontend
npm run dev
```

Opens at `http://localhost:5173/diedrico/` with HMR.

### Backend Server

```bash
cd backend
npm run dev
```

Runs at `http://localhost:3001` (health check, project API).

### Documentation Site

```bash
npm run docs:dev
```

Opens the VitePress documentation at `http://localhost:5173`.

## Project Structure

```
diedrico/
├── frontend/        # Vue 3 SPA
│   ├── src/
│   │   ├── commands/      # Command pattern + operations
│   │   ├── components/    # Vue components (panels, tools)
│   │   ├── composables/   # Vue composables
│   │   ├── domain/        # Domain model (pure logic)
│   │   ├── services/      # Application services
│   │   ├── stores/        # Pinia state management
│   │   ├── tools/         # Construction tool implementations
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utilities and math
│   └── tests/
│       ├── unit/          # Vitest unit tests
│       ├── integration/   # Vitest integration tests
│       └── e2e/           # Playwright E2E tests
├── backend/         # Express REST API
│   ├── src/
│   └── tests/
├── docs/            # VitePress documentation
└── specs/           # Feature specifications
```

## Build

```bash
cd frontend
npm run build
```

Output goes to `frontend/dist/`.

## IDE Setup

VS Code is recommended. Useful extensions:

- **Vue - Official** (Volar) — Vue 3 language support
- **ESLint** — code linting
- **Vitest** — test runner integration

## Environment Variables

For Google Drive integration, configure:

- `VITE_GOOGLE_CLIENT_ID` — Google OAuth2 client ID
- `VITE_GOOGLE_API_KEY` — Google API key

See [Google Drive Setup](/GOOGLE_DRIVE_SETUP) for details.
