# Quickstart Guide: Diedrico MVP

**Last Updated**: 2025-12-22  
**Audience**: Developers setting up the Diedrico dihedral learning application

---

## Overview

Diedrico is an educational web application for learning dihedral/orthographic projection. The system consists of:

- **Frontend**: Vue.js 3 + TypeScript application (all business logic)
- **Backend**: Node.js + Express REST API (persistence only)
- **Storage**: JSON files for project data

This guide will get you from zero to running the application locally in <10 minutes.

---

## Prerequisites

Ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Git**: For cloning the repository

Check versions:
```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/diedrico.git
cd diedrico
```

### 2. Install Dependencies

Install both frontend and backend dependencies:

```bash
# Frontend
cd frontend
npm install
cd ..

# Backend
cd backend
npm install
cd ..
```

---

## Running the Application

You need to run both the backend and frontend servers.

### Option 1: Run Both Servers Manually

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

The backend API will start on `http://localhost:3000`.

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173` (Vite default).

Open your browser and navigate to **http://localhost:5173**.

### Option 2: Run with Concurrently (if configured)

If a root-level `package.json` with `concurrently` is set up:

```bash
npm run dev
```

This will start both servers simultaneously.

---

## Project Structure

```
diedrico/
├── backend/
│   ├── src/
│   │   ├── api/          # Express routes
│   │   ├── storage/      # File-based storage
│   │   └── server.ts     # Entry point
│   ├── data/             # JSON project files (created on first save)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/   # Vue components
│   │   ├── commands/     # Command pattern implementations
│   │   ├── domain/       # Domain models (geometry, entities)
│   │   ├── services/     # Application services
│   │   ├── stores/       # Pinia state management
│   │   └── main.ts       # Entry point
│   ├── tests/
│   │   ├── unit/         # Vitest unit tests
│   │   └── e2e/          # Playwright E2E tests
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── specs/                # Feature specifications and plans
```

---

## Development Workflow

### Frontend Development

**Hot Module Replacement (HMR)**: Vite provides instant feedback on code changes.

```bash
cd frontend
npm run dev
```

Edit files in `frontend/src/` and see changes immediately in the browser.

**Build for Production**:
```bash
npm run build
npm run preview  # Test production build locally
```

### Backend Development

**Watch Mode**: Auto-restarts server on code changes.

```bash
cd backend
npm run dev  # Uses ts-node-dev or nodemon
```

**Manual Restart**: If watch mode isn't configured, restart manually with `npm run dev`.

---

## Testing

### Unit Tests (Frontend)

Run Vitest tests for domain logic, commands, and geometry calculations:

```bash
cd frontend
npm test                # Run tests once
npm test -- --watch     # Run in watch mode
npm test -- --coverage  # Generate coverage report
```

**Test Structure**:
- `tests/unit/domain/geometry/` - Geometry calculations (intersections, perpendiculars)
- `tests/unit/commands/` - Command execute/undo/validate
- `tests/unit/services/` - Validation and dependency services

### E2E Tests (Frontend)

Run Playwright tests for critical user journeys:

```bash
cd frontend
npm run test:e2e
```

**Run E2E tests in headed mode** (see browser):
```bash
npm run test:e2e -- --headed
```

**Run specific test**:
```bash
npm run test:e2e -- tests/e2e/basic-exercise.spec.ts
```

**Test Structure**:
- `tests/e2e/basic-exercise.spec.ts` - SC-001: Create points, segment, guide, transport, 3D point
- `tests/e2e/infeasibility.spec.ts` - FR-011, FR-012: Infeasibility handling
- `tests/e2e/autosave.spec.ts` - FR-027: Autosave and persistence

---

## Configuration

### Environment Variables

Create `.env` files for environment-specific config:

**backend/.env**:
```env
PORT=3000
DATA_DIR=./data
LOG_LEVEL=info
```

**frontend/.env**:
```env
VITE_API_URL=http://localhost:3000/api
```

### Backend Storage

Projects are stored in `backend/data/projects/{projectId}.json`.

The directory is created automatically on first save.

**Manual Inspection**:
```bash
cat backend/data/projects/<some-uuid>.json | jq .
```

---

## Common Tasks

### Create a New Project

1. Start the application
2. Click "New Project" button
3. Enter project name
4. Click "Create"

The backend creates a new project with default planes (P_H, P_V) and hinge line (HL_HV).

### Open an Existing Project

1. Click "Open Project"
2. Select from the list of saved projects
3. Project loads with all elements, actions, and view state restored

### Reset to Clean State

Delete all projects:
```bash
rm -rf backend/data/projects/*.json
```

### View API Logs

Backend logs requests and errors to console. Increase verbosity:

```bash
LOG_LEVEL=debug npm run dev
```

---

## Troubleshooting

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**: Kill the process using the port:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Frontend Can't Reach Backend

**Symptom**: Network errors when creating/loading projects

**Check**:
1. Backend is running: `curl http://localhost:3000/api/health`
2. Frontend API URL is correct in `.env`: `VITE_API_URL=http://localhost:3000/api`
3. CORS is enabled in backend (see `backend/src/server.ts`)

### Missing Dependencies

**Error**: `Cannot find module '...'`

**Solution**: Reinstall dependencies:
```bash
cd frontend && npm install
cd ../backend && npm install
```

### TypeScript Errors

**Symptom**: Red squiggly lines in VS Code, build fails

**Solution**:
1. Ensure `tsconfig.json` is correct
2. Restart TypeScript server in VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
3. Check `@types/*` packages are installed

### Tests Fail

**Check**:
1. Dependencies installed: `npm install`
2. Backend running (for E2E tests): `cd backend && npm run dev`
3. Update snapshots if intentional: `npm test -- -u`

---

## Next Steps

### Explore the Codebase

- **Domain Models**: `frontend/src/domain/` - Core geometry and entities
- **Commands**: `frontend/src/commands/` - All user actions (create point, segment, etc.)
- **Components**: `frontend/src/components/` - Vue UI components
- **Stores**: `frontend/src/stores/` - Pinia state management

### Read the Spec

- **Feature Specification**: `specs/001-dihedral-learning-mvp/spec.md` - Complete feature requirements
- **Data Model**: `specs/001-dihedral-learning-mvp/data-model.md` - Entity definitions
- **API Contract**: `specs/001-dihedral-learning-mvp/contracts/api.yaml` - OpenAPI spec

### Add a New Tool

1. Define command in `frontend/src/commands/` (implement `ICommand` interface)
2. Add tool UI in `frontend/src/components/toolbars/`
3. Register tool in toolbar configuration
4. Add unit tests in `tests/unit/commands/`
5. Update action types in `domain/ConstructiveAction.ts`

### Run the Full Test Suite

```bash
# Frontend unit tests
cd frontend && npm test

# Frontend E2E tests
npm run test:e2e

# Backend integration tests (if implemented)
cd backend && npm test
```

---

## Resources

- **Constitution**: `.specify/memory/constitution.md` - Core architectural principles
- **Research Decisions**: `specs/001-dihedral-learning-mvp/research.md` - Technology choices
- **Implementation Plan**: `specs/001-dihedral-learning-mvp/plan.md` - MVP phasing strategy
- **Vue.js Docs**: https://vuejs.org/
- **Three.js Docs**: https://threejs.org/docs/
- **D3.js Docs**: https://d3js.org/

---

## Getting Help

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Development Logs**: Check terminal output for errors and warnings

---

**Happy coding!** 🎉
