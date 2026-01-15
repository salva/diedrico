# Diedrico

**An educational web application for teaching dihedral (orthographic) projection**

Diedrico is an interactive learning tool designed to help engineering students understand and master dihedral projection—the fundamental technical drawing system used in engineering, architecture, and design. Unlike traditional CAD tools that focus on final results, Diedrico emphasizes the **constructive process**, making each geometric operation explicit and traceable.

## 🎯 Purpose

Diedrico is built for:

- **Engineering students** learning orthographic/dihedral projection in technical drawing courses
- **Instructors** who want to demonstrate construction sequences step-by-step
- **Self-learners** exploring geometric principles of multi-view projection

The application focuses on **how** drawings are constructed, not just what they look like. Every element has explicit dependencies, every construction is parametric, and geometric relationships update automatically when inputs change.

## ✨ Key Features

### Educational Focus
- **Explicit construction process**: Every element is created through deliberate user operations
- **Dependency tracking**: See how elements depend on each other through the Process Tree
- **Parametric behavior**: Move points and watch dependent geometry update automatically
- **No implicit entities**: All points, lines, and intersections must be created explicitly

### Geometric Tools
- **Multiple projection planes**: Work with horizontal (P_H) and vertical (P_V) planes simultaneously
- **Rich element types**: Points, lines, segments, circles with multiple construction methods
- **Specialized constructions**: Parallel/perpendicular lines, tangent lines, intersections
- **Guide lines**: Create perpendicular guides for transporting distances between planes
- **Distance transport**: Transfer measurements between projection planes using guides

### Workspace
- **2D primary view**: Main drawing area showing all projection planes in dihedral configuration
- **3D auxiliary view**: Floating overlay for spatial understanding (read-only)
- **Active plane system**: One plane receives new constructions; all planes remain visible
- **Flexible navigation**: Pan (Shift + drag), zoom (mouse wheel), intuitive interactions

### Modern Architecture
- **Undo/Redo system**: Full command history with arbitrary undo depth
- **Process Tree**: Visual representation of construction sequence and dependencies
- **Google Drive integration**: Save and load projects from your Drive account
- **Responsive UI**: Works on desktop browsers with clear visual feedback

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/diedrico.git
   cd diedrico
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:5173`

### Project Structure

```
diedrico/
├── frontend/          # Vue 3 + TypeScript frontend application
│   ├── src/
│   │   ├── commands/     # Command pattern (undo/redo)
│   │   ├── components/   # Vue components (UI)
│   │   ├── domain/       # Core domain model (geometry)
│   │   ├── services/     # Application services
│   │   ├── stores/       # Pinia state management
│   │   └── tools/        # Interactive construction tools
│   └── tests/         # Unit, integration, and E2E tests
├── backend/           # Express backend (optional, for future features)
├── docs/              # Deployment and setup documentation
└── specs/             # Complete feature specifications
    └── 001-dihedral-learning-mvp/
        ├── spec.md           # Functional requirements
        ├── ui-spec.md        # UI/UX specifications
        ├── data-model.md     # Architecture documentation
        └── tasks.md          # Implementation task breakdown
```

## 🛠️ Development

### Available Scripts

**Frontend development**:
```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run Playwright E2E tests
npm run lint             # Lint and fix code
```

**Full workspace**:
```bash
npm run dev              # Start frontend dev server
npm test                 # Run all tests
```

### Technology Stack

**Frontend**:
- **Vue 3** with Composition API for reactive UI
- **TypeScript** for type safety
- **Pinia** for state management
- **Three.js** for 3D visualization
- **D3.js** for 2D geometric operations
- **Vite** for fast development and builds
- **Vitest** for unit testing
- **Playwright** for E2E testing

**Backend** (minimal, planned for future features):
- **Express** for API endpoints
- **TypeScript** for consistency

### Architecture Principles

Diedrico follows strict architectural principles documented in [data-model.md](specs/001-dihedral-learning-mvp/data-model.md):

1. **Parametric by default**: All geometric elements update when dependencies change
2. **Explicit dependencies**: Process Tree tracks all element relationships
3. **Command pattern**: All mutations through undoable commands
4. **No implicit entities**: User must explicitly create all geometric objects
5. **Plane-based organization**: 2D elements belong to specific projection planes
6. **Type-safe domain model**: Comprehensive TypeScript types for all geometry

### Key Concepts

**Process Tree**: Every geometric element is created by an Action that tracks its inputs (dependencies). The Process Tree is the complete history of construction operations, enabling:
- Parametric updates (change inputs, outputs recalculate)
- Dependency visualization (see what depends on what)
- Construction replay (understand the sequence)

**Element Variations**: Each element type (Point, Line, Circle) has multiple construction methods. For example, points can be:
- Free (positioned anywhere)
- Intersection (where two elements cross)
- On-element (constrained to a line or circle)
- Transported (transferred between projection planes)

**Realization**: The actual geometric representation (x, y coordinates, etc.) computed from an element's definition and dependencies. Realizations are cached and invalidated when dependencies change.

## 📚 Documentation

- **[Feature Specification](specs/001-dihedral-learning-mvp/spec.md)**: Complete functional requirements (FR-001 through FR-052)
- **[UI Specification](specs/001-dihedral-learning-mvp/ui-spec.md)**: Detailed UI/UX guidelines and interaction patterns
- **[Data Model](specs/001-dihedral-learning-mvp/data-model.md)**: Architecture documentation with 70+ implementation phases
- **[Tasks](specs/001-dihedral-learning-mvp/tasks.md)**: Detailed task breakdown for all features
- **[Deployment Guide](docs/DEPLOYMENT.md)**: Production deployment instructions
- **[Google Drive Setup](docs/GOOGLE_DRIVE_SETUP.md)**: Configure Drive integration

## 🧪 Testing

Diedrico has comprehensive test coverage across multiple levels:

**Unit Tests** (Vitest):
```bash
npm run test             # Run all unit tests
npm run test:watch       # Watch mode for TDD
```

**Integration Tests**: Test interactions between domain model, commands, and services

**E2E Tests** (Playwright):
```bash
npm run test:e2e         # Run E2E tests headless
npm run test:e2e:headed  # Run with browser UI
```

Test organization:
- `frontend/tests/unit/` - Domain model, calculations, utilities
- `frontend/tests/integration/` - Command execution, tool workflows
- `frontend/tests/e2e/` - Complete user workflows

## 🤝 Contributing

Contributions are welcome! However, please note:

1. **Read the specifications first**: Familiarize yourself with [spec.md](specs/001-dihedral-learning-mvp/spec.md) and [data-model.md](specs/001-dihedral-learning-mvp/data-model.md)
2. **Follow architectural principles**: The codebase has strict conventions (see Architecture Principles above)
3. **Write tests**: All new features require unit tests; complex features need integration tests
4. **Update documentation**: Keep spec.md, data-model.md, and tasks.md in sync with code

### Development Workflow

1. Check [for-planing.md](specs/001-dihedral-learning-mvp/for-planing.md) for planned features
2. Pick a feature and plan it:
   - Add to spec.md (functional requirements)
   - Add to ui-spec.md (if UI changes needed)
   - Document in data-model.md (architecture details)
   - Break down in tasks.md (implementation tasks)
3. Implement following task order
4. Write comprehensive tests
5. Update documentation to reflect completion

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

**In brief**: You are free to use, modify, and distribute this software, but any derivative works must also be licensed under GPL v3.0. This ensures that educational tools remain open and accessible to all.

Key permissions:
- ✅ **Commercial use**: Use in commercial environments
- ✅ **Modification**: Adapt and improve the software
- ✅ **Distribution**: Share with others
- ✅ **Private use**: Use privately without sharing modifications

Key requirements:
- 📋 **Disclose source**: Provide source code when distributing
- 📋 **License and copyright notice**: Include license and copyright
- 📋 **Same license**: Derivative works must use GPL v3.0
- 📋 **State changes**: Document modifications made

## 🙏 Acknowledgments

- Inspired by traditional dihedral projection teaching methods
- Built for engineering education with focus on process over product
- Designed with input from technical drawing instructors and students

## 📧 Contact

[Add contact information here]

---

**Note**: This project is under active development. The current MVP focuses on core dihedral projection features. See [for-planing.md](specs/001-dihedral-learning-mvp/for-planing.md) for upcoming features and improvements.
