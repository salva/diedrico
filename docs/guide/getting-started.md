# Getting Started

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

## Installation

```bash
# Clone the repository
git clone https://github.com/nicosalva/diedrico.git
cd diedrico

# Install all dependencies (frontend + backend)
npm install
```

## Running the Application

```bash
# Start the development server
npm run dev
```

This starts the Vite dev server. Open **http://localhost:5173** in your browser.

## Running Tests

```bash
# Unit + integration tests (Vitest)
npm test

# Run tests with UI
cd frontend && npx vitest --ui

# E2E tests (Playwright — requires the dev server running)
cd frontend && npx playwright test
```

## Building for Production

```bash
npm run build
```

The built files are output to `frontend/dist/`.

## Project Structure

```
diedrico/
├── package.json          # Root workspace config
├── frontend/             # Vue 3 SPA (main application)
│   ├── src/
│   │   ├── domain/       # Core geometry & process tree
│   │   ├── commands/     # Command pattern (operations, factories)
│   │   ├── components/   # Vue components (panels, toolbars, dialogs)
│   │   ├── composables/  # Vue composables (viewport, snapping, etc.)
│   │   ├── config/       # Tool families, rendering constants
│   │   ├── services/     # Services (rendering, persistence, geometry)
│   │   ├── stores/       # Pinia stores (selection, tools, view)
│   │   ├── tools/        # Construction tool implementations
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Math & coordinate utilities
│   └── tests/
│       ├── unit/         # Vitest unit tests
│       ├── integration/  # Vitest integration tests
│       └── e2e/          # Playwright E2E tests
├── backend/              # Express API (minimal, file storage)
├── docs/                 # This documentation (VitePress)
└── specs/                # Detailed specifications
```

## Quick Tour

1. **Create elements** — Select a tool from the toolbar (Point, Line, Circle, etc.) and click on the canvas
2. **Switch planes** — Use the plane selector dropdown to switch between P_H and P_V
3. **Build 3D** — Create corresponding projections on two planes, then use 3D tools to reconstruct the spatial element
4. **Undo/Redo** — Use Ctrl+Z / Ctrl+Shift+Z or the toolbar buttons
5. **Save** — Projects persist to Google Drive (requires setup) or stay in browser memory
