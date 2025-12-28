# Diedrico MVP - Implementation Pre-Plan

**Status**: Planning Phase  
**Date**: December 29, 2025  
**Purpose**: Delineate implementation strategy before starting development

---

## 1. Context & Prerequisites

### What We Have
- ✅ Complete specification documents (spec.md, ui-spec.md)
- ✅ Data model definition (data-model.md)
- ✅ API contracts (contracts/api.yaml)
- ✅ Technical research (research.md)
- ✅ Task breakdown (tasks.md) - T001-T171 completed, T172-T201 pending
- ✅ Architecture plan (plan.md)
- ✅ Requirements checklist - 100% complete
- ✅ GeoGebra 4 source code analysis (~/src/geogebra-4.0.34.0+dfsg1)

### Key Technical Decisions
- **Framework**: Vue.js 3 (Composition API) + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Storage**: File-based JSON (MVP)
- **Icons**: GeoGebra 4 .ggb construction files (GPL v3+ compatible)
- **License**: GPL 3+

### Critical Discovery: Icon Strategy
GeoGebra 4 toolbar icons are generated from **source construction files (.ggb)**:
- Format: ZIP archives containing `geogebra.xml` (geometric construction definitions)
- License: GPL v3+ (as source code)
- Location: `~/src/geogebra-4.0.34.0+dfsg1/icons/*.ggb` (47 files)
- Strategy: Parse XML constructions → Render to SVG programmatically

---

## 2. Implementation Strategy Options

### Option A: Traditional Sequential Development
**Approach**: Build foundation → Add features → Polish
- Start with core data structures (World, ProcessTree)
- Implement basic canvas rendering
- Add tools one by one
- Add UI panels and interactions
- Polish and optimize

**Pros**:
- Linear, easy to track progress
- Each component fully implemented before moving on
- Traditional waterfall-like approach

**Cons**:
- Long time before seeing working system
- Risk of architecture mismatch discovered late
- Hard to validate user experience early

### Option B: Vertical Slice Development
**Approach**: Implement ONE complete user story end-to-end first
- Pick simplest user story (e.g., US1: Point placement)
- Implement ALL layers (data model, canvas, UI, persistence)
- Validate entire stack works together
- Then add more features

**Pros**:
- Quick validation of architecture
- Early working prototype
- Can demonstrate to users/stakeholders
- Reduces integration risk

**Cons**:
- Some initial duplicate work
- Requires discipline to stay focused on slice

### Option C: Icon-First Development
**Approach**: Start with icon generation tooling
- Parse GeoGebra .ggb files
- Generate SVG icon library
- Build UI framework with icons
- Then add backend/logic

**Pros**:
- Solves critical legal/licensing question early
- Creates reusable icon library
- UI looks professional from start

**Cons**:
- Delays core functionality
- Icon parsing is complex (XML → SVG rendering)

---

## 3. Recommended Approach: Hybrid Vertical + Icon Foundation

### Phase 0: Icon Library Generation (1-2 days)
**Goal**: Create GPL-compatible SVG icon library from GeoGebra 4 source

**Tasks**:
1. Extract and analyze .ggb construction files
2. Build XML parser for `geogebra.xml` format
3. Create SVG renderer for geometric elements (points, segments, circles)
4. Generate SVG icon library for all 47 constructions
5. Document icon attribution and GPL v3+ license

**Outputs**:
- `frontend/src/assets/icons/` - SVG icon library
- `tools/icon-generator/` - Icon generation tool
- `ICONS-LICENSE.md` - Attribution and license documentation

### Phase 1: Minimal Vertical Slice (3-5 days)
**Goal**: One working user story (US1: Point on active plane)

**Implement**:
- **Data Model**: World, ProcessTree, Point action
- **Canvas**: Basic SVG rendering of points
- **UI**: Minimal toolbar with Point tool button
- **Storage**: Save/load to JSON file
- **Backend**: Basic project API

**Success Criteria**:
- User can click Point tool button
- Click on canvas creates point on active plane
- Point appears on canvas
- Save persists point data
- Reload restores point

### Phase 2: Core Geometry Tools (5-7 days)
**Goal**: Add fundamental construction tools

**Implement**:
- Line, Segment, Circle tools (US2)
- Guide creation (perpendicular to hinge) (US3)
- Intersection points
- Basic dependency tracking

### Phase 3: Transport Operations (4-6 days)
**Goal**: Dihedral-specific operations

**Implement**:
- Point transport via guides (US4)
- Distance transport (US5)
- Infeasibility detection
- 3D derivation display

### Phase 4: Polish & UX (3-5 days)
**Goal**: Professional user experience

**Implement**:
- Hover highlighting (US6 - T172-T178)
- Visual style editing (US6 - T179-T186)
- Performance optimization (T187)
- Edge case handling (T188-T197)

### Phase 5: Documentation (2-3 days)
**Goal**: User and developer documentation

**Implement**:
- README with screenshots
- User guide
- Developer onboarding
- Code comments (T198-T201)

---

## 4. Technical Setup Plan

### Development Environment
- **Node.js**: v18+ LTS
- **Package Manager**: npm (already in use)
- **IDE**: VS Code (recommended)
- **Git**: Version control (already initialized)

### Project Structure
```
diedrico/
├── frontend/
│   ├── src/
│   │   ├── assets/icons/          # SVG icons (from GeoGebra .ggb)
│   │   ├── components/            # Vue components
│   │   │   ├── canvas/           # Canvas rendering
│   │   │   ├── panels/           # UI panels
│   │   │   └── toolbars/         # Tool selection
│   │   ├── composables/          # Vue composables
│   │   ├── domain/               # Business logic
│   │   │   ├── world/           # World model
│   │   │   ├── processTree/     # Process tree
│   │   │   └── calculations/    # Geometry calculations
│   │   ├── services/            # Services
│   │   ├── stores/              # Pinia stores
│   │   └── types/               # TypeScript types
│   └── tests/                   # Tests (unit, e2e)
│
├── backend/
│   ├── src/
│   │   ├── api/                 # REST API routes
│   │   ├── models/              # Data models
│   │   └── storage/             # File storage
│   └── tests/                   # Integration tests
│
├── tools/
│   └── icon-generator/          # GeoGebra .ggb → SVG tool
│
└── specs/                       # All specification docs
```

### Dependencies Already Installed
**Frontend**: Vue 3, Vite, TypeScript, Vitest, Playwright  
**Backend**: Express, TypeScript

### Additional Dependencies Needed
**Frontend**:
- Pinia (state management)
- None major - keep minimal

**Backend**:
- fs-extra (file operations)
- None major - keep minimal

**Icon Generator**:
- jszip (for .ggb extraction)
- xml2js or fast-xml-parser (XML parsing)
- (Consider if SVG generation can be done manually first)

---

## 5. Icon Generation Technical Plan

### Step 1: Extract .ggb Files
```bash
# Each .ggb is a ZIP containing geogebra.xml
unzip mode_point.ggb  # → geogebra.xml
```

### Step 2: Parse XML Construction
```xml
<construction>
  <element type="point" label="A">
    <coords x="1.697" y="3.764" z="1.0"/>
    <pointSize val="3"/>
  </element>
  <element type="segment" label="a">
    <lineStyle thickness="2"/>
  </element>
</construction>
```

### Step 3: Render to SVG
- Map GeoGebra coordinates to SVG viewport (e.g., 32×32)
- Render geometric elements:
  - **point**: `<circle cx="..." cy="..." r="3"/>`
  - **segment**: `<line x1="..." y1="..." x2="..." y2="..."/>`
  - **circle**: `<circle cx="..." cy="..." r="..."/>`

### Step 4: Manual Simplification Option
If automatic rendering is complex:
1. Open each .ggb in GeoGebra 4
2. Screenshot/trace the icon
3. Create simplified SVG manually (inspiration only, original artwork)
4. Maintain GPL v3+ license

---

## 6. Testing Strategy

### Unit Tests (Vitest)
- Domain logic (geometry calculations)
- Data model operations
- Utility functions

### Integration Tests (Backend)
- API endpoints
- File storage operations

### E2E Tests (Playwright)
- User workflows
- Canvas interactions
- Persistence scenarios

### Performance Tests
- Canvas rendering (200 elements < 200ms)
- Hover highlighting response time
- Process tree recomputation

---

## 7. Risk Assessment

### High Risk
- **Icon rendering complexity**: Parsing .ggb XML → SVG may be harder than expected
  - **Mitigation**: Start with manual SVG creation if needed
  
- **3D projection calculations**: Complex geometry for dihedral angles
  - **Mitigation**: Research papers already documented, use established formulas

### Medium Risk
- **Performance with 200 elements**: May need optimization
  - **Mitigation**: Profile early, add spatial indexing if needed

- **Infeasibility detection**: Complex dependency tracking
  - **Mitigation**: Implement incrementally, add test cases

### Low Risk
- **File storage**: Simple JSON, proven approach
- **UI framework**: Vue 3 is stable and well-documented

---

## 8. Success Criteria

### Phase 0 Complete When:
- [ ] SVG icon library generated from .ggb files
- [ ] Icons render correctly at 24×24, 32×32, 48×48
- [ ] GPL v3+ license documented with attribution

### Phase 1 Complete When:
- [ ] User can create points on active plane
- [ ] Points persist and reload correctly
- [ ] Basic canvas rendering works
- [ ] Architecture validated end-to-end

### MVP Complete When:
- [ ] All 6 user stories implemented (US1-US6)
- [ ] All acceptance criteria pass
- [ ] Performance criteria met (SC-002)
- [ ] Tests pass (unit, integration, e2e)
- [ ] Documentation complete

---

## 9. Timeline Estimate

| Phase | Duration | Description |
|-------|----------|-------------|
| Phase 0 | 1-2 days | Icon library generation |
| Phase 1 | 3-5 days | Minimal vertical slice |
| Phase 2 | 5-7 days | Core geometry tools |
| Phase 3 | 4-6 days | Transport operations |
| Phase 4 | 3-5 days | Polish & UX |
| Phase 5 | 2-3 days | Documentation |
| **Total** | **18-28 days** | ~4-6 weeks |

**Note**: This is for focused development time. Real calendar time may be longer depending on availability.

---

## 10. Next Steps

### Immediate Actions
1. **Review this pre-plan** - Validate approach with stakeholders
2. **Choose icon strategy** - Decide: Auto-generate or manual creation?
3. **Set up development environment** - Install additional dependencies
4. **Create initial project structure** - Set up directories
5. **Begin Phase 0** - Start with icon library

### Questions to Resolve
- [ ] Manual vs automatic icon generation from .ggb files?
- [ ] Need for Pinia state management or use Vue composables?
- [ ] Backend file storage location and format details?
- [ ] Testing coverage targets (percentage)?

---

## 11. References

- **Specification**: [spec.md](./spec.md)
- **UI Specification**: [ui-spec.md](./ui-spec.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/api.yaml](./contracts/api.yaml)
- **Technical Research**: [research.md](./research.md)
- **Task Breakdown**: [tasks.md](./tasks.md)
- **Architecture**: [plan.md](./plan.md)
- **GeoGebra 4 Source**: `~/src/geogebra-4.0.34.0+dfsg1/`

---

## Appendix: Icon Extraction Commands

```bash
# Extract all .ggb files
cd ~/src/geogebra-4.0.34.0+dfsg1/icons
for file in *.ggb; do
    mkdir -p "/tmp/ggb-extract/$(basename $file .ggb)"
    unzip -q "$file" -d "/tmp/ggb-extract/$(basename $file .ggb)"
done

# List all constructions
find /tmp/ggb-extract -name "geogebra.xml" | wc -l  # Should be 47
```
