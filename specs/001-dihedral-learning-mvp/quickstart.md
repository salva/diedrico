# Quickstart Guide: Diedrico MVP

**Last Updated**: 2025-12-22  
**Audience**: Developers setting up the Diedrico dihedral learning application

---

## Overview

Diedrico is an educational web application for learning dihedral/orthographic projection. The system consists of:

- **Frontend**: Vue.js 3 + TypeScript application (all business logic)
- **Persistence**: Frontend app-shell `ProjectPersistencePort` backed by `ProjectService` and Google Drive/local startup behavior

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

Install frontend dependencies:

```bash
# Frontend
cd frontend
npm install
cd ..

```

---

## Running the Application

Run the frontend development server.

### Run the Frontend Server

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173` (Vite default).
Project startup/open/save behavior uses the app-shell persistence port; no backend project server is required.

Open your browser and navigate to **http://localhost:5173**.

**What You'll See**:
- **2D Workspace**: ALL projection planes (P_H horizontal, P_V vertical) displayed simultaneously in dihedral layout
- All planes visible at once - active plane at full opacity, non-active planes de-emphasized
- Hinge line (HL_HV) visible where planes meet
- Top toolbar with plane selector and drawing tools
- Left panel for Constructive Actions
- Right panel for Elements list

---

## Project Structure

```
diedrico/
├── frontend/
│   ├── src/
│   │   ├── application/  # App-shell use cases and persistence ports
│   │   ├── components/   # Vue components
│   │   ├── commands/     # Command pattern implementations
│   │   ├── domain/       # Domain models (geometry, entities)
│   │   ├── services/     # ProjectService and application services
│   │   └── main.ts       # Entry point
│   ├── tests/
│   │   ├── unit/         # Vitest unit tests
│   │   └── e2e/          # Playwright E2E tests
│   ├── package.json
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

Frontend Google Drive credentials, when used, are configured through frontend environment variables. Do not configure `VITE_API_URL` for project persistence; there is no active backend project API.

### Create a New Project

1. Start the application
2. Click "New Project" button
3. Enter project name
4. Click "Create"

The app-shell creates a new project through the active persistence port with default planes (P_H, P_V) and hinge line (HL_HV).

### Open an Existing Project

1. Click "Open Project"
2. Select from the list of saved projects
3. Project loads with all elements, actions, and view state restored

### Reset to Clean State

Clear the browser/local startup state or remove test Drive files used during development.

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**: Kill the process using the port:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Missing Dependencies

**Error**: `Cannot find module '...'`

**Solution**: Reinstall dependencies:
```bash
cd frontend && npm install
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
