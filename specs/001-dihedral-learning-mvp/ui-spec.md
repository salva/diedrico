# User Interface Specification

**Version**: 1.0.0  
**Created**: 2025-12-28  
**Status**: Active

---

## Purpose and Scope

This document specifies the user interface architecture, layout, and interaction patterns for the Diedrico application. It describes the visual structure, component organization, and behavioral patterns that govern how users interact with the system.

**Relationship to Other Documents**:
- **[specs/001-dihedral-learning-mvp/spec.md](spec.md)**: Provides detailed tool behaviors, functional requirements, geometric definitions, and user scenarios. This document references spec.md for functional specifics while focusing on UI structure and interaction patterns.
- **[.specify/memory/constitution.md](/.specify/memory/constitution.md)**: Establishes architectural principles including pedagogical transparency and principle-based rendering, which directly influence UI design decisions.
- **[specs/001-dihedral-learning-mvp/data-model.md](data-model.md)**: Defines world data structures that the UI dynamically renders.

**Key Architectural Principle**: The UI presents a **dynamic view** of the world data structures. All geometric elements, projection planes, guides, and relationships are rendered using geometric first principles derived from the world model. There is NO special-case rendering logic for specific planes or elements (except for initial world elements: P_H, P_V, origin O, which are created during initialization but thereafter treated as regular world elements).

---

## Phase 97: Default Element Labels (UI Specification)

### Overview

All newly created elements are automatically assigned human-readable default labels based on their type. Points are labeled `A_n`, lines as `L_n`, segments as `S_n`, circles as `C_n`, guides as `G_n`; 3D elements receive a `3` suffix (`A3_n`, `L3_n`, `S3_n`, `P3_n`); projection planes as `P_n`; hinge lines as `HL_n`; half-hinge lines as `HHL_n`. Labels are unique per type across the project and use per-type counters starting at 1.

### Label Scheme

**Points (2D and 3D share counter)**:
- Point2D, Point3D: `A_1`, `A_2`, `A_3`, ..., `A_9`, `A_{10}`, `A_{11}`, ..., `A_{45}`, ...
- Rendered as: A₁, A₂, A₃, ..., A₉, A₁₀, A₁₁, ..., A₄₅, ...
- Note: Braces required for n>9 (KaTeX subscript grouping)

**Lines (2D and 3D share counter)**:
- Line2D, Line3D: `L_1`, `L_2`, ..., `L_{10}`, ...

**Segments (2D and 3D share counter)**:
- Segment2D, Segment3D: `S_1`, `S_2`, ..., `S_{10}`, ...

**Circles (2D only)**:
- Circle2D: `C_1`, `C_2`, ..., `C_{10}`, ...

**Guides (2D only)**:
- Guide2D: `G_1`, `G_2`, ..., `G_{10}`, ...

**Planes (3D and Projection Planes share counter)**:
- Plane3D: `P_1`, `P_2`, ..., `P_{10}`, ...
- Projection Planes: `P_H`, `P_V` (fixed custom names), `P_1`, `P_2`, ... (auxiliary)

**Hinge Elements**:
- Hinge Lines: `HL_1`, `HL_2`, ..., `HL_{10}`, ...
- Half-Hinge Lines: `HHL_1`, `HHL_2`, ..., `HHL_{10}`, ...

### Label Display Behavior

**Where Default Labels Appear**:
1. **World Elements Panel**: Shows element list with default labels (e.g., "A₁", "L₂", "S₃")
2. **2D Canvas** (SvgCanvas.vue): Element labels rendered next to geometric objects with subscripts
3. **3D View** (ThreeView.vue): Element labels rendered as text sprites
4. **ProcessTree Panel**: Action descriptions use default labels (e.g., "Point A₁" instead of "Point point2d5")
5. **Properties Dialog**: Shows current label (default or user-customized)

---

## Phase 99: Clickable Labels in Process Tree (UI Specification)

### Overview

Element labels in Process Tree action descriptions are interactive - users can click on any element label (e.g., "A_5", "L_2", "P_H") to select that element. This provides quick navigation from construction history to geometric elements, enabling users to understand dependencies and locate elements referenced in action descriptions.

### Visual Design

**Label Appearance**:
- **Default State**: Element labels rendered with KaTeX formatting (subscripts, superscripts) matching Elements Panel style
- **Hover State**: 
  - Cursor changes to pointer (cursor: pointer)
  - Label shows subtle underline (text-decoration: underline dotted)
  - Tooltip displays element type and full name (e.g., "Point A_5 on P_H")
  - Background highlight: rgba(100, 150, 255, 0.1)
- **Active/Pressed State**: Slight scale effect (transform: scale(0.98))
- **Disabled State**: (when element deleted) Labels fade to gray, cursor: not-allowed, no click handler

**Text vs Label Distinction**:
- **Text parts** ("Point", "in", ", intersection of", etc.): Plain text, not clickable, no hover effects
- **Label parts** ("A_5", "L_2", "P_H", etc.): Interactive, clickable, with hover effects
- Clear visual distinction on hover (only labels react)

### Interaction Behavior

**Click Actions**:
1. **Normal Click** (no modifiers):
   - Selects clicked element (replaces current selection)
   - Element becomes selected in Elements Panel
   - Element highlighted in 2D canvas (active plane)
   - Element highlighted in 3D view (if visible)
   - Process Tree shows element's related actions

2. **Shift+Click**:
   - Adds element to selection (multi-select)
   - Existing selection preserved
   - All selected elements highlighted

3. **Ctrl+Click** (future enhancement, not Phase 99):
   - Toggle element in selection
   - If already selected, deselects
   - If not selected, adds to selection

**Selection Feedback**:
- **Elements Panel**: Clicked element scrolls into view and shows selected state
- **2D Canvas**: Element highlighted with selection color (blue stroke/glow)
- **3D View**: Element highlighted with selection material (if 3D element or has 3D realization)
- **Process Tree**: Action that created element shows selected state, related actions highlighted

### Examples

**Example 1: Simple Point Action**
```
A_5: point in P_H, free point at [0, 1]
    ^       ^^
    |       ||
  Click   Click
```
- Clicking "A_5" → selects point A_5
- Clicking "P_H" → selects projection plane P_H
- Clicking text "point in" or "free point at [0, 1]" → no action (plain text)

**Example 2: Intersection Point Action**
```
A_7: point in P_V, intersection of line L_2 and circle C_1 (first intersection)
    ^       ^^                          ^^            ^^
  Click   Click                       Click         Click
```
- Clicking "A_7" → selects point A_7
- Clicking "P_V" → selects projection plane P_V
- Clicking "L_2" → selects line L_2
- Clicking "C_1" → selects circle C_1

**Example 3: 3D Point from Projections**
```
A_{10}: point from projections A_1 on P_H and A_2 on P_V
        ^                      ^^    ^^       ^^    ^^
      Click                  Click  Click  Click  Click
```
- Clicking "A_{10}" → selects 3D point A_{10}
- Clicking "A_1" → selects 2D point A_1 (projection on P_H)
- Clicking "P_H" → selects projection plane P_H
- Clicking "A_2" → selects 2D point A_2 (projection on P_V)
- Clicking "P_V" → selects projection plane P_V

### Technical Notes

**DescriptionPart Structure** (from Phase 98):
```typescript
export interface DescriptionPart {
  type: 'text' | 'label';
  content: string;              // Display text (e.g., "A_5", "P_H")
  elementId?: string;           // Element ID for label parts (enables click)
}
```

**Implementation Approach**:
- Label parts already have `elementId` field (Phase 98 infrastructure)
- Add click handler to label spans in ProcessTreeNode.vue template
- Handler calls selectionStore.selectSingle(elementId) or addToSelection(elementId)
- No changes to descriptor logic needed (already provides elementIds)

### Accessibility

- **Keyboard Navigation**: Tab key cycles through clickable labels in focused action
- **Screen Readers**: Labels announced as "clickable link" with element type and name
- **Focus Indicator**: Visible focus ring around focused label (outline: 2px solid blue)
- **ARIA Attributes**: role="button", aria-label="Select element {label}"

### Performance Considerations

- **Event Delegation**: Click handler attached at ProcessTreeNode level, not per label (better for long descriptions with many labels)
- **Tooltip Generation**: Lazy - only computed on hover, not pre-rendered
- **Selection Updates**: Batched - selectionStore updates trigger single re-render, not per-element

**Label Rendering**:
- Labels use KaTeX rendering from Phase 96 (subscripts rendered as Unicode: A₁, L₂)
- Font: Sans-serif (matches application font via katex-overrides.css)
- Style: Upright text (not italicized, via `\mathrm{}` wrapper)
- Spacing: Preserved with LaTeX escaped spaces (`\ `)

**Visual Examples**:
```
Element Type         Technical ID       Default Label    Rendered Display
─────────────────────────────────────────────────────────────────────────
Point2D             point2d5           A_5              A₅
Point2D             point2d15          A_{15}           A₁₅
Line2D              line2d3            L_3              L₃
Circle2D            circle2d1          C_1              C₁
Point3D             point3d2           A_2              A₂ (shares counter with Point2D)
Line3D              line3d1            L_1              L₁ (shares counter with Line2D)
Plane3D             plane3d1           P_1              P₁
ProjectionPlane     projPlane3         P_3              P₃ (shares counter with Plane3D)
HingeLine           hingeLine1         HL_1             HL₁
```

### Label Assignment Workflow

**On Element Creation**:
1. User creates element (e.g., Create Point tool on canvas)
2. System generates technical ID using World.nextId: `point2d5`
3. System generates default label from ID: `point2d5` → `A_5` (extract number 5, add prefix A_)
4. Element stored with both ID and label
5. UI displays label (A₅) instead of ID in all views

**Label Number Source**:
- Label numbers extracted from technical ID (not separate counter)
- Same World.nextId counter used for both ID and label number
- Guaranteed unique (IDs are unique, label numbers match ID numbers)
- No separate counter persistence needed (World.nextId already persisted)

**Example Creation Sequence**:
```
Action                  Technical ID       Label (from ID)
────────────────────────────────────────────────────────────
Create Point2D          point2d1           A_1 (from point2d1)
Create Point2D          point2d2           A_2 (from point2d2)
Create Line2D           line2d3            L_3 (from line2d3)
Create Point3D          point3d4           A_4 (from point3d4, shared sequence!)
Create Line2D           line2d5            L_5 (from line2d5)
... (more elements)
Create Point2D          point2d11          A_{11} (braces for n>9)
Create Circle2D         circle2d45         C_{45} (from circle2d45)
```

### Label Editing and Customization

**User Override**:
- Users can override default labels via Element Properties dialog
- Custom labels preserved (not reset to default)
- Label counter unaffected by customization (next element uses next number)

**Properties Dialog Workflow**:
```
┌────────────────────────────────────┐
│ Element Properties                 │
├────────────────────────────────────┤
│ Label: [A_5                   ]   │ ← Shows default or custom label
│                                    │
│ Preview: A₅                        │ ← Live KaTeX preview
├────────────────────────────────────┤
│ [Save]  [Cancel]                   │
└────────────────────────────────────┘
```

1. User opens Properties dialog for element with default label "A_5"
2. User changes label to "P_{H}"
3. Preview updates to show Pₕ
4. User clicks Save → label changed, future points still use A_6, A_7, etc.

### Migration Behavior

**Existing Projects**:
- Projects created before Phase 97 have elements with empty labels
- On first load, system auto-assigns default labels to all existing elements
- Label counters initialized to highest existing count + 1 per type

**Migration Logic**:
```typescript
// Example: Project has 5 points (point2d1 to point2d5)
// On load:
1. Detect unlabeled points
2. Assign labels: A_1, A_2, A_3, A_4, A_5
3. Set pointLabelCounter = 6 (next point will be A_6)
```

### Edge Cases

**Label Conflicts**:
- Default labels are unique per type (A_1 for points, L_1 for lines)
- User can create custom labels that conflict (e.g., rename L_1 to "A_1")
- System does NOT enforce uniqueness for custom labels
- Technical IDs remain unique (conflict-free)

**Empty Label Handling**:
- If user deletes label in Properties dialog → element shows technical ID instead
- Default label NOT re-applied (user's choice to remove label)

**Deleted Elements**:
- Deleting element does NOT reset counter or reuse label
- Example: Create A_1, A_2, A_3 → Delete A_2 → Next point is A_4 (not A_2)

### References

- **Phase 96**: KaTeX label rendering (subscripts, superscripts, Greek letters)
- **FR-064**: Functional requirement for default element labels
- **data-model.md**: Label counter architecture in World class

---

---

## Phase 98: Dynamic Action Descriptions (UI Specification)

### Overview

Process Tree action descriptions are computed dynamically from current element state (labels and construction parameters) rather than stored as static strings. When elements are renamed or dependencies change, descriptions automatically update to reflect the current state.

### Description Format

**General Pattern**: `{ElementType} {CurrentLabel}: {ConstructionMethod}`

**Examples**:

**Free Elements**:
- "Point A_5: Free point"
- "Point A_6: Free point"

**Constructed from Parents**:
- "Point A_7: Intersection of line L_2 and circle C_1 (index 0)"
- "Point A_8: Intersection of circle C_1 and circle C_2 (index 1)"
- "Line L_3: Through points A_1 and A_2"
- "Line L_4: Parallel to line L_1 through point A_3"
- "Line L_5: Perpendicular to line L_1 through point A_4"
- "Line L_6: Tangent to circle C_1 through point A_5"
- "Segment S_1: Between points A_1 and A_2"
- "Circle C_2: Center A_3, radius point A_4"
- "Guide G_1: From segment S_1"

**3D Elements**:
- "Point A_10: From projections on P_H (A_5) and P_V (A_8)"
- "Line L_7: From projections on P_H (L_2) and P_V (L_3)"
- "Segment S_3: From projections on P_H (S_1) and P_V (S_2)"
- "Plane P_1: From traces on P_H (L_4) and P_V (L_5)"

**Auxiliary Planes**:
- "Plane P_2: Auxiliary plane from hinge T_1, trace T_2, position line T'_2"

### Dynamic Behavior

**Label Changes Propagate**:
1. User renames point2d5 from "A_5" to "P" via Element Properties
2. ALL action descriptions referencing that point update immediately:
   - Before: "Line L_2: Through points A_5 and A_6"
   - After: "Line L_2: Through points P and A_6"

**Element Type Lookup**:
- Description generator calls `world.getElementById(elementId)` to get current element
- Extracts `element.label` for display name
- Element type determines description template

**Parent Labels Lookup**:
- Construction parameters store parent element IDs (e.g., `{ point1Id: "point2d5", point2Id: "point2d6" }`)
- Generator looks up each parent: `world.getElementById(parentId).label`
- Substitutes current labels into template

**Missing Elements Handled**:
- If element is deleted, description shows: "{ElementType} {ID}: [Deleted]"
- If parent is missing, description shows: "{ElementType} {Label}: [Invalid - missing parent {parentId}]"
- Red text styling indicates error state

### UI Rendering

**Where Descriptions Appear**:
- Process Tree Panel: Action rows display description as primary text
- Element Properties Dialog: May show "Created by" field with description
- Dependency tooltips: Hover shows full description

**Rendering Architecture** (Selective KaTeX):
- Descriptions returned as structured parts: `DescriptionPart[]`
- Each part tagged as `type: 'text' | 'label'`
- Vue template renders parts separately:
  - Text parts: Plain `<span>{{ part.content }}</span>` (normal spacing)
  - Label parts: `<span v-html="formatElementLabel(part.content)"></span>` (KaTeX rendering)
- **No space handling hack needed**: Text and labels separated, each rendered appropriately

**Example Rendering**:
```
Description parts:
[
  { type: 'text', content: 'Point ' },
  { type: 'label', content: 'A_{12}', elementId: 'point2d12' },
  { type: 'text', content: ': Intersection of line ' },
  { type: 'label', content: 'L_2', elementId: 'line2d2' },
  { type: 'text', content: ' and circle ' },
  { type: 'label', content: 'C_1', elementId: 'circle2d1' }
]

Rendered as:
"Point A₁₂: Intersection of line L₂ and circle C₁"
   ↑   ↑                          ↑           ↑
  text KaTeX                    KaTeX       KaTeX
```

**Interactive Features**:
- Each label part includes `elementId` for hover highlighting
- Hovering label in Process Tree can highlight element in viewport
- Click label to select/focus element (optional future enhancement)

**Performance**:
- Descriptions computed on-demand when Process Tree renders
- Not pre-computed or cached (always reflects current state)
- KaTeX invoked only for label parts (2-4 per description typically)
- Minimal overhead: Map lookups + string formatting

### Interaction Changes

**No Impact on Undo/Redo**:
- Actions store only construction metadata (operation type, parent IDs)
- Description is derived, not stored
- Undo/redo continues to work at operation level (no description changes needed)

**Process Tree Remains Read-Only**:
- Users cannot edit action descriptions directly
- Changes only via Element Properties (rename elements)
- Process Tree automatically reflects those changes

---

## Phase 96: Element Label Mathematical Notation (UI Specification)

### Overview

Element labels (user-visible names) support LaTeX-style mathematical notation for subscripts, superscripts, and Greek letters. Labels are rendered using KaTeX for inline math formatting.

### Notation Support

**Supported LaTeX Constructs**:
- **Subscripts**: `A_1` → A₁, `P_{12}` → P₁₂
- **Superscripts**: `A^2` → A², `P^{\prime}` → P′, `H^{\prime\prime}` → H′′
- **Greek Letters**: `\alpha` → α, `\beta` → β, `\theta` → θ, `\pi` → π, etc.
- **Combined**: `A_{H}^{\prime}` → A′ₕ
- **Special**: `A^*` → A*, `A_{0}` → A₀

**Limitations**:
- Only inline math mode (no display mode equations)
- No multi-line formatting
- No matrices or complex structures
- Focus on geometric notation (subscripts, superscripts, Greek letters)

### Rendering Behavior

**Where Labels Appear**:
1. **2D Canvas** (SvgCanvas.vue): Element labels rendered next to geometric objects
2. **3D View** (ThreeView.vue): Element labels rendered as text sprites
3. **World Elements Panel**: Element list shows formatted labels
4. **ProcessTree Panel**: Action descriptions show formatted element names
5. **Properties Dialog**: Label input field shows raw LaTeX, preview shows rendered output

**Rendering Pipeline**:
```typescript
// Input: element.label = "A_{H}^{\\prime}"
// Step 1: Format utility wraps in KaTeX inline delimiters
const formatted = formatElementLabel(element.label); // Returns KaTeX HTML
// Step 2: Component renders HTML with v-html or textContent
```

**Visual Style**:
- Font: Same as regular element labels (inherit from component)
- Size: Same as regular labels, KaTeX auto-scales to match
- Color: Inherits from element style or component theme
- Positioning: Standard label positioning rules apply

### Label Input and Editing

**Properties Dialog - Label Field**:
```
┌────────────────────────────────────┐
│ Element Properties                 │
├────────────────────────────────────┤
│ Label: [A_{H}^{\prime}        ]  │ ← Raw LaTeX input
│                                    │
│ Preview: A′ₕ                       │ ← Live KaTeX preview
├────────────────────────────────────┤
│ [Save]  [Cancel]                   │
└────────────────────────────────────┘
```

**User Workflow**:
1. User clicks element in World Elements Panel → Properties dialog opens
2. User edits Label field using LaTeX notation (e.g., `P_{H}`, `\alpha`)
3. Preview updates in real-time showing rendered output
4. User clicks Save → UpdateElementLabelOp executed → label updated

**Input Validation**:
- KaTeX parse errors shown in preview area: "Invalid LaTeX: {...}"
- Invalid syntax prevents save (Save button disabled)
- Empty label allowed (element shows ID instead)

### Label Formatting Examples

**Common Geometric Patterns**:
- Points: `A`, `A_1`, `A_{H}`, `A^{\prime}`, `P_{12}^{\prime\prime}`
- Lines: `r`, `r_1`, `t_{H}`, `t^{\prime}`
- Planes: `P_{H}`, `P_{V}`, `P_{\alpha}`, `\Pi`
- Angles: `\alpha`, `\beta`, `\theta`, `\phi`
- Distances: `d`, `d_1`, `h`, `h_{max}`

**Special Cases**:
- Primes: `A^{\prime}` (A′), `A^{\prime\prime}` (A′′)
- Compound subscripts: `P_{H1}`, `P_{V2}`
- Greek with subscripts: `\alpha_1`, `\theta_{max}`

### Implementation Requirements

**Package**: KaTeX (`npm install katex`)
**Import**: `import katex from 'katex'; import 'katex/dist/katex.min.css';`

**Utility Function** (frontend/src/utils/formatUtils.ts):
```typescript
import katex from 'katex';

export function formatElementLabel(label: string): string {
  if (!label || label.trim() === '') return '';
  
  try {
    // Render inline math (no delimiters in input, just raw LaTeX)
    return katex.renderToString(label, {
      displayMode: false,      // Inline mode
      throwOnError: false,     // Return error message instead of throwing
      output: 'html',          // HTML output (not MathML)
      strict: false,           // Allow some non-standard LaTeX
      trust: false             // Security: disable \href, \includegraphics
    });
  } catch (error) {
    // Fallback: show plain text if KaTeX fails
    console.warn('KaTeX rendering failed:', error);
    return label;
  }
}
```

**Component Usage** (SvgCanvas.vue, WorldElementsPanel.vue, etc.):
```vue
<template>
  <!-- SVG text element with formatted label -->
  <text :x="labelX" :y="labelY" v-html="formattedLabel"></text>
</template>

<script setup>
import { computed } from 'vue';
import { formatElementLabel } from '@/utils/formatUtils';

const props = defineProps<{ element: Element }>;

const formattedLabel = computed(() => 
  formatElementLabel(props.element.label || props.element.id)
);
</script>
```

### Edge Cases and Error Handling

**Invalid LaTeX**:
- KaTeX parse error → Show error message in preview
- Example: `A_{unclosed` → Preview: "KaTeX parse error: Expected '}'"
- Fallback: Display raw text if rendering fails in production

**Empty Label**:
- If `element.label` is empty/undefined → Display `element.id` instead
- Formatting NOT applied to IDs (already camelCase like `point2d5`)

**Long Labels**:
- No automatic truncation (user responsible for reasonable length)
- Canvas label positioning may overlap if too long (same as plain text)

**Performance**:
- KaTeX rendering is fast (~1ms per label)
- Labels cached by Vue's computed properties
- No performance concerns for typical diagrams (< 100 labels)

### Migration and Backward Compatibility

**Existing Projects**:
- Old labels without LaTeX remain plain text (no change)
- User can edit any label to add math notation
- No automatic migration needed

**ID vs Label**:
- Element IDs remain camelCase (e.g., `point2d5`, `projPlaneH`)
- Labels are optional user-friendly names (e.g., `A_1`, `P_{H}`)
- If no label set, UI displays ID (no formatting)

---

## Overall Layout Architecture

The application interface is organized into five primary regions:

```
┌─────────────────────────────────────────────────────────────┐
│  Top Toolbars (Tool families, active plane, navigation)     │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│  Left    │                                                   │
│  Panel   │         Main Viewport (2D Drawing Area)          │
│  Stack   │         - All projection planes visible          │
│          │         - Active plane emphasized                 │
│  ┌────┐  │         - Dynamic grid                            │
│  │ W  │  │         - Pan/zoom always available              │
│  │ o  │  │                                                   │
│  │ r  │  │                                          ┌─────┐  │
│  │ l  │  │                                          │     │  │
│  │ d  │  │                                          │ 3D  │  │
│  ├────┤  │                                          │View │  │
│  │ P  │  │                                          │     │  │
│  │ r  │  │                                          └─────┘  │
│  │ o  │  │                                    (resizable,    │
│  │ c  │  │                                     movable)      │
│  │ e  │  │                                                   │
│  │ s  │  │                                                   │
│  │ s  │  │                                                   │
│  └────┘  │                                                   │
│          │                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

### Layout Principles

1. **Fixed Component Positioning**:
   - Top toolbars: Always at top, full width
   - Left panel stack: Fixed to left edge, vertically stacked
   - Main viewport: Fills remaining space (center-right)
   - 3D view: Overlay on bottom-right corner of viewport (default)

2. **Responsive Behavior**:
   - Panels collapse to icons when horizontal space is limited
   - Toolbars may reorganize or use overflow menus on narrow screens
   - 3D view maintains aspect ratio during resize
   - Minimum viewport size enforced to ensure usability

3. **Visual Hierarchy**:
   - Main viewport is the visual focus (largest area)
   - Toolbars provide immediate access to primary actions
   - Left panels provide context and secondary controls
   - 3D view is auxiliary (helps understanding but not required for construction)

---

## Startup Flow and Google Drive Authentication

### Application Launch

When the application is first loaded, the user is guided through authentication and project selection:

**Step 1: Google Sign-In**
- If the user is not authenticated, display a centered modal with "Sign in with Google" button
- Use OAuth2 via Google API client library (gapi.client)
- Required scope: `https://www.googleapis.com/auth/drive.file` (access to app-created files only)
- After successful authentication, proceed to Step 2

**Step 2: Open Existing Project Dialog**

If the user has existing projects, a dialog displays the project list:

```
┌─────────────────────────────────────────────────┐
│   Diedrico - Project Selection                  │
├─────────────────────────────────────────────────┤
│                                                  │
│   ┌───────────────────────────────────────┐    │
│   │  Open Existing Project                │    │
│   │                                        │    │
│   │  Select from your Google Drive:       │    │
│   │  ┌─────────────────────────────┐      │    │
│   │  │ ▶ untitled 1.diedrico       │      │    │
│   │  │ ▶ untitled 2.diedrico       │      │    │
│   │  │ ▶ MyConstruction.diedrico   │      │    │
│   │  └─────────────────────────────┘      │    │
│   │                                        │    │
│   │  [Open]                               │    │
│   └───────────────────────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Open Existing Project**:
1. Application lists all `.diedrico` files from the "diedrico" folder in user's Google Drive
2. User selects a project from the list
3. Click "Open" button (or double-click a file)
4. Project is loaded and workspace is restored with all geometry, action history, and UI state

**Create New Project**:
- No dialog is shown for project creation
- User clicks the "New" button in the toolbar (Ctrl+N) to create a new project
- Project is created instantly with auto-generated name "untitled N" (where N is the first available number, filling gaps)
- Application loads with default workspace (P_H, P_V, HL_HV, origin O)
- User can rename the project at any time by double-clicking the project name in the header (or Ctrl+R)
- First auto-save occurs after initial user action

**Error Handling**:
- If Google Drive API is unavailable, display error with retry option
- If "diedrico" folder access fails, attempt to create it
- If project file is corrupted, display error and return to startup dialog
- If user cancels sign-in, display "Sign in required to use Diedrico" message
- If no projects exist on first load, user sees a hint to use the "New" button (Ctrl+N)

**Auto-Save Behavior** (after project is loaded):
- Changes are automatically saved to Google Drive 2 seconds after the last modification
- Debouncing prevents excessive API calls during rapid construction
- Status indicator shows "Saving..." and "All changes saved" in the status bar
- No explicit "Save" button in the toolbar

---

## Left Panel Stack

The left side of the interface contains a vertical stack of two panels. These panels provide access to the world state and construction history.

### Panel Management

- **Stacking**: Panels are arranged vertically, one above the other
- **Resizing**: A horizontal splitter between panels allows adjusting relative heights
- **Collapsing**: Each panel can be collapsed to a minimal state (title bar only) via a collapse button
- **Minimum Sizes**: Collapsed panel: ~30px height. Expanded panel: minimum 150px height
- **State Persistence**: Panel sizes and collapse states are saved per project

### World Elements Panel

**Purpose**: Lists all geometric entities in the world, organized by type and dimensionality.

**Naming Convention Note**: Throughout this document, underscores in element names indicate subscript notation. For example:
- `a_H` represents "a subscript H" (point a on horizontal plane)
- `P_V` represents "P subscript V" (vertical projection plane)
- `HL_HV` represents "HL subscript HV" (hinge line between H and V planes)

**Tree Structure**:
```
▼ 2D Elements
  ▼ P_H (Horizontal Projection Plane)
    ▼ Points (3)
      • a_H, b_H, c_H
    ▼ Lines (2)
      • r1, r2
    ▼ Segments (1)
      • s1
    ▼ Hinge Lines (1)
      • HL_HV (shared with P_V)
  ▼ P_V (Vertical Projection Plane)
    ▼ Points (2)
      • d_V, e_V
    ▼ Lines (1)
      • r3
    ▼ Guides (2)
      • g1, g2
    ▼ Hinge Lines (1)
      • HL_HV (shared with P_H)
▼ 3D Elements
  ▼ Points (2)
    • A, B
  ▼ Lines (1)
    • L1
  ▼ Segments (1)
    • S1
  ▼ Planes (4)
    • P_H [Projection Plane]        ← Tag indicating this is also a projection plane
    • P_V [Projection Plane]
    • P_1
    • P_2
```

**Organization Rules**:
- **Two Main Sections**: 2D Elements, 3D Elements
- **2D Elements Grouping**:
  - **Dynamic Plane Listing**: The panel MUST dynamically list ALL projection planes present in the World, not just P_H and P_V.
  - **Ordering**: 
    1. Fixed planes: P_H, then P_V.
    2. Auxiliary planes: Sorted by creation order (or alphabetically).
  - **First level**: Grouped by projection plane.
  - **Second level**: Within each plane, grouped by element type (points, lines, segments, circles, arcs, guides, hinge lines)
  - **Hinge Lines**: Appear under BOTH planes they connect (with indicator showing shared status)
  - **BHLs (Broken Hinge Lines)**: Also appear as projections under the planes they intersect
- **3D Elements Grouping**: 
  - Grouped by type (points, lines, segments, planes)
  - ALL planes appear here (they are 3D geometric entities)
  - Projection planes tagged/marked to distinguish them from regular 3D planes
- **Dynamic Counts**: Each group shows element count in parentheses
- **Alphabetical/Creation Order**: Within each group, elements sorted by creation time or alphabetically by name

**Interactions**:
- **Click**: Opens element properties dialog (see Dialogs section)
- **Hover**: Triggers unified hover highlighting (see Visual Feedback section below)
- **Right-Click** (future): Context menu for element operations
- **Drag** (future): Reorder or organize elements

**Visual Indicators**:
- **Infeasible elements**: Red icon
- **Hidden elements**: Lighter/grayed text.
- **Active plane elements**: May be marked with subtle badge or emphasis
- **Shared elements**: May include clickable references to other elements.
- **Projection planes**: Tag or badge "[Projection Plane]" in 3D Planes section

**Rendering Principle**: This panel reflects the current state of the world. All elements are displayed dynamically based on their existence in the world model.

---

## Grid Coordinate Labels (Phase 78)

**Purpose**: Display plane-local (u,v) coordinate values at viewport borders to provide numerical spatial orientation without requiring users to mentally calculate positions.

**Positioning and Layout**:
- Labels appear at the intersections of **major grid lines** with viewport edges
- **Top edge**: U-coordinate labels (horizontal axis values)
- **Bottom edge**: U-coordinate labels (horizontal axis values)
- **Left edge**: V-coordinate labels (vertical axis values)
- **Right edge**: V-coordinate labels (vertical axis values)
- Labels positioned in small margin area at viewport borders

**Label Content**:
- Display actual plane-local coordinate values in current units (e.g., "0", "50", "100", "-50")
- Format: Plain numbers without units suffix (implicit units understood by user)
- Precision: Integer values for grid intersections (no decimal places unless grid spacing < 1)
- Origin (0, 0) clearly marked when visible in viewport

**Visual Styling**:
- **Font**: Sans-serif, 11px size, medium weight
- **Color**: Dark gray (#333333) with sufficient contrast against white/light backgrounds
- **Background**: White stroke outline (stroke-width 3px, paint-order stroke fill) for legibility over complex geometry
- **Positioning offset**: 8px from viewport edge
- **Alignment**: Top/bottom labels centered horizontally over grid line; left/right labels aligned start/end alongside grid line

**Dynamic Behavior**:
- Labels update automatically during pan operations (new coordinates appear/disappear as viewport moves)
- Labels update automatically during zoom operations (spacing adjusts with grid density, values recalculated)
- Only labels for grid lines **currently intersecting viewport edges** are displayed (no off-screen labels)
- When grid spacing changes due to zoom (10 → 20 → 50 unit transitions), labels adjust to new grid line positions
- Labels respect grid visibility toggle: when grid hidden, labels also hidden

**Layout Integration**:
- Labels rendered as **SVG text elements** within the same SVG canvas as the grid and geometry
- Z-order: Labels above grid lines but below geometric elements (layer order: grid → labels → geometry)

**Responsive Design**:
- At very high zoom (grid spacing > 200px on screen), labels remain readable and properly spaced
- At very low zoom (grid spacing < 20px on screen), labels may be omitted to avoid overcrowding (only show every 2nd or 3rd major grid line)
- On small viewports (< 800px width), consider reducing label font size to 10px

**Accessibility**:
- Labels use semantic SVG `<text>` elements
- Color contrast meets WCAG AA standards (minimum 4.5:1 ratio)
- Text remains readable at all zoom levels within practical range (0.1x - 10x)

**Example Layout** (ASCII representation):
```
┌─────────────────────────────────────────────────────────┐
│  -50    0    50   100   150   200   250   300   350    │ ← Top U-coordinates
├─────────────────────────────────────────────────────────┤
│     |     |     |     |     |     |     |     |        │
│ -50 ┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼────    │
│     |     |     |     |     |     |     |     |        │
│   0 ┼─────┼─────O─────┼─────┼─────┼─────┼─────┼────    │ ← V-coords on left
│     |     |     |     |     |     |     |     |        │
│  50 ┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼────    │
│     |     |     |     |     |     |     |     |        │
│ 100 ┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼────    │
│     |     |     |     |     |     |     |     |        │
├─────────────────────────────────────────────────────────┤
│  -50    0    50   100   150   200   250   300   350    │ ← Bottom U-coordinates
└─────────────────────────────────────────────────────────┘
                                                   ↑
                                         V-coords on right
```

**Benefits**:
- Users immediately know their position in coordinate space
- Enables precise placement without mental calculation
- Reinforces understanding of plane-local coordinate systems
- Reduces cognitive load when working with specific numeric positions
- Particularly useful for exercises with prescribed coordinates

---

## Element ID Display Format (Phase 95)

**Purpose**: Display element identifiers in UI components (labels, tooltips, ProcessTree, World Elements panel) using camelCase format to prevent subscript interpretation and ensure clean, readable presentation.

**Problem Solved**: Prior to Phase 95, element IDs used underscores (e.g., `point2d_5`, `proj_plane_H`, `hinge_line_3`) which were misinterpreted by text rendering systems as subscript delimiters, causing display corruption: "point2d₅", "projPlane₍H₎" (Unicode subscript artifacts).

**ID Format Specification** (Schema 6.0.0):

Single-word types use lowercase + number:
- Points: `point2d5`, `point2d12`, `point3d8`
- Lines: `line2d3`, `line2d45`, `line3d2`
- Segments: `segment2d7`, `segment2d10`, `segment3d4`
- Circles: `circle2d6`, `circle2d23`
- Guides: `guide2d9`, `guide2d14`
- Planes (3D): `plane3d2`, `plane3d7`

Multi-word types use camelCase:
- Projection planes: `projPlaneH`, `projPlaneV`, `projPlane1`, `projPlane2`
- Hinge lines: `hingeLine1`, `hingeLine2`, `hingeLine5`
- ProcessTree: `subprocess1`, `actionGroup2`, `action5`

Hierarchical IDs combine containerId/localId (both camelCase):
- `projPlaneH/point2d1` (point on horizontal projection plane)
- `projPlaneV/line2d5` (line on vertical projection plane)
- `projPlane2/circle2d3` (circle on auxiliary plane)

**UI Display Examples**:

World Elements Panel:
```
📍 Points (3)
  ├─ Point A                 [projPlaneH/point2d1]
  ├─ Point B                 [projPlaneH/point2d2]
  └─ Intersection Point      [projPlaneV/point2d7]

📏 Lines (2)
  ├─ Baseline                [projPlaneH/line2d1]
  └─ hingeLine5              [hingeLine5]
```

ProcessTree:
```
🏗️ Initialization (subprocess1)
  └─ Create projection planes (actionGroup1)
      ├─ Create P_H (action1) → planePH
      ├─ Create P_V (action2) → planePV
      └─ Create hinge line (action3) → hingeLine5

✏️ User Actions (subprocess2)
  └─ Drawing (actionGroup5)
      ├─ Create point A (action12) → projPlaneH/point2d1
      └─ Create line AB (action13) → projPlaneH/line2d1
```

Tooltips (on hover):
- "Point A (projPlaneH/point2d1)" - shows label with ID in parentheses
- "hingeLine5" - hinge lines show ID as label (no separate label)
- "projPlaneH" - projection planes show ID as label

Error messages:
```
[INTERNAL ERROR] Point projPlaneH/point2d5 not found. Dependency graph corrupted.
[INTERNAL ERROR] Plane projPlane2 not found when looking up element projPlane2/line2d3.
```

**Benefits**:
- Clean, professional appearance without Unicode corruption
- More readable than underscore format (less visual noise)
- Aligns with TypeScript/JavaScript naming conventions
- No special character interpretation issues in any UI context
- Self-documenting hierarchical structure remains clear

**Migration**: Old project files (schema 4.0.0, 5.0.0) with underscore IDs are automatically migrated to camelCase format on load (schema version bumped to 6.0.0). New projects use camelCase exclusively.

---

## Plane-Based Grid Rendering (Phase 79)

**Purpose**: Render grid using active projection plane's intrinsic coordinate system (u, v) with adaptive spacing and subdivisions to ensure grid remains visually useful across all zoom levels.

**Architectural Principle**: Grid is NOT derived from arbitrary paper/canvas coordinates—it is generated from the plane's origin (0, 0) and intrinsic basis vectors, then transformed through planeToPaper2D matrix to screen space.

**Coordinate System Transformation**:
1. Define grid lines in plane intrinsic coordinates: u = {..., -100, -50, 0, 50, 100, ...}, v = {..., -100, -50, 0, 50, 100, ...}
2. Transform each grid line endpoint from (u, v) → paper (x, y) using `plane.planeToPaper2D.applyToVector()`
3. Apply viewport transform (pan, zoom) to get final screen coordinates
4. Grid labels display actual (u, v) values, NOT transformed paper/canvas pixel values

**Adaptive Grid Spacing** (Powers of 10):
- **Major grid lines** always positioned at multiples of powers of 10: 10^n (where n is any integer)
  - Examples: 0.01, 0.1, 1, 10, 100, 1000, 10000
  - Specific power (n) chosen dynamically based on zoom level to maintain visual clarity
- **Minor grid lines** divide each major interval using subdivision factor (2, 5, or 10)
  - Minor spacing = 10^n / subdivision
  - Possible values: 10^n/10, 10^n/5, 10^n/2
  - Examples: ..., 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, ...
- Spacing is in **plane intrinsic (u, v) units**, not paper/canvas pixels

**Adaptive Subdivisions** (Pixel Density-Based):
- Subdivision count (2, 5, or 10) adapts to prevent grid line overcrowding:
  - Algorithm:
    1. Calculate minimum spacing: `minSpacing = minPixelsPerCell / zoom` (where minPixelsPerCell = 15)
    2. For each power of 10 starting from floor(log₁₀(minSpacing)):
       - Try subdivisions in order: 10, 5, 2 (preference for smallest cells)
       - Calculate: `spacing = 10^n / subdivision`
       - If `spacing ≥ minSpacing`, use this combination
    3. Result: `{ spacing, subdivision, majorSpacing: 10^n }`
- Examples:
  - At zoom=1.0: minSpacing=15 → chooses 20 (=100/5) → major=100, subdivision=5
  - At zoom=0.1: minSpacing=150 → chooses 200 (=1000/5) → major=1000, subdivision=5
  - At zoom=10.0: minSpacing=1.5 → chooses 2 (=10/5) → major=10, subdivision=5
  - At zoom=0.01: minSpacing=1500 → chooses 2000 (=10000/5) → major=10000, subdivision=5

**Visual Styling**:
- **Minor grid lines**: Light gray (#E0E0E0), 1px stroke width
- **Major grid lines**: Darker gray (#C0C0C0), 1px stroke width, emphasized for orientation
- **Origin lines** (u=0, v=0): Same as major lines but intersect at origin (0, 0)
- **Hinge line alignment**: On default planes (P_H, P_V), hinge line at v=0 naturally aligns with horizontal major grid lines
- Z-order: Grid below all geometric elements and coordinate labels

**Grid Line Rendering**:
- **U-lines** (vertical in default planes): For each u = uMin to uMax (step = spacing):
  - Start point: (u, vMin) in plane coordinates
  - End point: (u, vMax) in plane coordinates  
  - Transform both through planeToPaper2D, then viewport
  - Determine if major: `Math.abs(u % majorSpacing) < 0.01` (where majorSpacing = 10^n)
- **V-lines** (horizontal in default planes): For each v = vMin to vMax (step = spacing):
  - Start point: (uMin, v) in plane coordinates
  - End point: (uMax, v) in plane coordinates
  - Transform both through planeToPaper2D, then viewport
  - Determine if major: `Math.abs(v % majorSpacing) < 0.01` (where majorSpacing = 10^n)

**Viewport Bounds Calculation**:
- Transform canvas corners to plane coordinates to find visible range:
  ```typescript
  const topLeft_paper = new Vector3(-viewport.panX, -viewport.panY, 1);
  const bottomRight_paper = new Vector3(
    (-viewport.panX + canvasWidth / zoom),
    (-viewport.panY + canvasHeight / zoom), 
    1
  );
  const topLeft_plane = plane.paperToPlane2D.applyToVector(topLeft_paper);
  const bottomRight_plane = plane.paperToPlane2D.applyToVector(bottomRight_paper);
  const uMin = Math.floor(topLeft_plane.x / spacing) * spacing;
  const uMax = Math.ceil(bottomRight_plane.x / spacing) * spacing;
  const vMin = Math.floor(topLeft_plane.y / spacing) * spacing;
  const vMax = Math.ceil(bottomRight_plane.y / spacing) * spacing;
  ```

**Dynamic Behavior**:
- Grid updates automatically during pan operations (new grid lines appear/disappear)
- Grid updates automatically during zoom operations:
  - Spacing transitions occur at zoom thresholds (0.5, 2.0, 5.0)
  - Subdivision adjusts to maintain minimum pixel density (15px per major line spacing)
- Grid responds to active plane changes:
  - Different planes may have different coordinate system orientations
  - Grid always derived from active plane's transformation matrices
- Grid respects visibility toggle: when hidden, no grid lines or labels rendered

**Per-Plane Grids**:
- Each projection plane shows its own grid when active
- Different planes may have different u, v vector orientations (future non-orthogonal planes)
- Grid rendering logic identical for all planes—uses plane's planeToPaper2D transformation
- No special-case logic for default planes (P_H, P_V) vs auxiliary planes

**Future Consideration** (Non-Orthogonal Planes):
- Current default planes (P_H, P_V) have orthogonal u, v vectors aligned with paper axes
- Future auxiliary planes may have u, v vectors at arbitrary angles in paper space
- Grid rendering already supports this: u-lines and v-lines appear as arbitrary directions after planeToPaper2D transformation
- Coordinate labels positioned relative to actual grid line orientations
- Architecture transparent: transformation matrices handle all orientation complexity

**Layout Integration**:
- Grid rendered as **SVG line elements** within main 2D viewport canvas
- Grid generation occurs in computed property `gridLines` in SvgCanvas.vue
- Reactively updates based on: viewport state (panX, panY, zoom), active plane, grid visibility toggle

**Benefits**:
- **Correct coordinates**: Grid shows actual plane (u, v) values, not arbitrary paper offsets
- **Origin visible**: (0, 0) clearly marked when in viewport (intersection of u=0 and v=0 lines)
- **Hinge line alignment**: HL at v=0 aligns with grid horizontal lines on default planes
- **Per-plane consistency**: Each plane's grid derived from its unique coordinate system
- **Architectural generality**: Supports future non-orthogonal planes without code changes
- **Visual clarity**: Adaptive spacing/subdivisions keep grid useful across all zoom levels
- **Educational value**: Reinforces understanding that planes have intrinsic coordinate systems

**Example Grid at Different Zoom Levels**:
```
Zoom 0.3 (very zoomed out):
- Spacing: 50u
- Subdivision: 2 (15 pixels/cell × 2 ≥ 15px threshold)
- Major lines every 100u: -200, -100, 0, 100, 200, 300...
- Minor lines every 50u: -150, -50, 50, 150, 250...

Zoom 1.0 (default):
- Spacing: 20u
- Subdivision: 5 (20 pixels/cell × 5 = 100px ≥ 15px threshold)
- Major lines every 100u: -200, -100, 0, 100, 200, 300...
- Minor lines every 20u: -80, -60, -40, -20, 20, 40, 60, 80...

Zoom 4.0 (zoomed in):
- Spacing: 5u
- Subdivision: 10 (20 pixels/cell × 10 = 200px ≥ 15px threshold)
- Major lines every 50u: -100, -50, 0, 50, 100, 150...
- Minor lines every 5u: -45, -40, -35, -30, -25, -20...
```

---

###Process Tree Panel (Constructive Actions)

**Purpose**: Shows the hierarchical construction history—the sequence of actions that built the current world state.

#### Empty Action Group Filtering (Phase 100)

**Behavior**: Action groups with no visible children are completely hidden from the Process Tree view.

**Empty Detection**: An action group is considered empty when `allChildren.length === 0` (all children are null tombstones from deleted actions).

**Rendering**: Empty action groups do not render at all - no header, no spacing, no visual gap in the tree structure.

**Benefits**:
- Clean visual hierarchy (no empty containers cluttering the view)
- Automatic cleanup as actions are deleted
- Users see only meaningful construction history

**Implementation**: Template v-if condition checks `allChildren.length > 0` before rendering action group node.

**Scope**: This panel contains **constructive actions only**. Pure presentation/UI state changes are excluded (they do not create geometry and must not appear in the ProcessTree), for example:
- Active plane selection
- 2D viewport navigation (pan/zoom/fit)
- Hover highlighting and cursor feedback
- Current selection set (selected elements)
- Active tool + in-progress tool arguments
- Panel collapse/expand state

**Tree Structure** (example):
```
▼ 👁 Root Process
  ▼ 👁 Construction Phase 1
    ┌─────────────────────────────┐
    │ ○ Create segment s1         │  ← Regular ActionGroup (visual box)
    └─────────────────────────────┘
    ┌─────────────────────────────┐
    │ ⚙ ⋅ Create free point a     │  ← Auxiliary ActionGroup (gear icon, lighter color)
    │   ⋅ Create free point b     │
    └─────────────────────────────┘
    ┌─────────────────────────────┐
    │ ○ Create circle c1          │
    └─────────────────────────────┘
  ▼ 👁 Guide Setup
    ┌─────────────────────────────┐
    │ ○ Create guide g1           │
    └─────────────────────────────┘
    ┌─────────────────────────────┐
    │ ○ Transport point via guide │
    └─────────────────────────────┘
  ▼ 👁 3D Elements
    ┌─────────────────────────────┐
    │ ○ Create 3D point A         │
    └─────────────────────────────┘
    ┌─────────────────────────────┐
    │ ○ Create 3D line L1         │
    └─────────────────────────────┘
```

**Node Types**:

1. **Subprocess** (container with name):
   - Has 👁 visibility toggle icon (controls drawing visibility of all descendant elements)
   - Can contain other Subprocesses or ActionGroups (mixed)
   - Has collapse/expand triangle (controls panel visibility)
   - Can be renamed by user
   - Defines default visual style inherited by contained elements

2. **ActionGroup** (visual grouping container, NO name):
   - **No text label or name**: ActionGroups are purely visual grouping elements
   - Displayed as boxes, borders, vertical lines, or background shading around contained actions
   - NO visibility toggle (inherits visibility from parent Subprocess)
   - Can contain only Actions (at least one)
   - May have collapse/expand control (triangle or +/- on the box border)
   - Two variants:
     - **Regular**: Normal visual treatment (simple box or line grouping)
     - **Auxiliary**: Special visual treatment - gear icon (⚙), lighter background color, distinct border style
   - When collapsed, may show count: Box with "⚙ (2 actions)" or similar indicator

3. **Action** (leaf node):
   - Represents single user operation or automatically-created supporting action
   - Displayed as single line with action description (e.g., "Create segment s1")
   - Bullet style may vary (○ for regular, ⋅ for auxiliary actions)
   - Cannot contain children

**Visual Treatment**:

- **Regular Subprocess**: 
  - Normal font weight
  - Eye icon for visibility toggle
  - Collapse triangle
  - User-editable name
  
- **ActionGroup (Regular)**:
  - NO text label - purely visual container
  - Box border or vertical line grouping actions
  - May have collapse control on border
  - Actions inside use normal styling
  
- **ActionGroup (Auxiliary)**:
  - NO text label - purely visual container
  - Lighter background color (#F5F5F5 or similar)
  - Gear icon (⚙) in corner or on border
  - Distinct border style (dashed or lighter color)
  - Actions inside use lighter text color (#666)
  - When collapsed: Shows gear icon with action count "⚙ (2)"
  - Properties locked (cannot edit or reorganize)

  - Properties locked (cannot edit or reorganize)

**Two Types of Visibility**:

1. **Drawing Visibility** (in the 2D/3D workspace):
   - Controlled by Subprocess eye icon (👁) only
   - Toggles whether geometric elements appear in viewport
   - Cascades down tree (hiding subprocess hides all descendant elements)
   - ActionGroups have NO independent control (inherit from parent)
   - State stored in: `subprocess.visible` field

2. **Panel Visibility** (in this panel UI):
   - Controlled by collapse/expand control (for ActionGroups: +/- on box border, or similar)
   - Shows/hides nested content in this panel only
   - Independent from drawing visibility
   - Both Subprocesses and ActionGroups can collapse/expand
   - State stored in: `ViewState.panelCollapseState`

**Interactions**:
- **Click eye icon**: Toggle drawing visibility (Subprocess only)
- **Click collapse control**: Toggle panel collapse/expand (triangle for Subprocess, +/- or similar for ActionGroup box)
- **Click name/description**: Select/focus that node
- **Hover**: Triggers unified hover highlighting
- **Double-click** (future): Rename Subprocess
- **Drag** (future): Reorganize tree structure

**Rendering Principle**: This panel reflects the current state of `world.processTree`. The tree structure is rendered dynamically by traversing the ProcessTree data structure. There is no hard-coded layout for specific subprocesses or actions.

**Subprocess Stack Management UI (Phase 86)**:

The Process Tree Panel header provides explicit controls for managing the subprocess stack:

**Visual Layout**:
```
┌────────────────────────────────────────────────────────┐
│  Process Tree                    [<] [>]  [depth 2/5]  │
├────────────────────────────────────────────────────────┤
│  ▼ 👁 Root Process                                     │
│    ▼ 👁 Construction Phase 1    ◄── current level    │
│      ┌─────────────────────────────┐                   │
│      │ ○ Create segment s1         │                   │
│      └─────────────────────────────┘                   │
└────────────────────────────────────────────────────────┘
```

**Controls**:

1. **Pop Level Button** ("<" or "Out" or "↑"):
   - **Action**: Pops the current subprocess from the stack (closes it)
   - **Effect**: Parent subprocess becomes the new active target for subsequent actions
   - **Visual**: Left button in the pair, arrow pointing left/up/out
   - **State**: Disabled when root subprocess is active (cannot pop root)
   - **Tooltip**: "Close current subprocess (move up one level)"
   - **Keyboard**: Ctrl+Shift+[ or Ctrl+Left

2. **Push Level Button** (">" or "In" or "↓"):
   - **Action**: Creates a new subprocess as a child of current active subprocess, pushes to stack
   - **Effect**: New subprocess becomes active target for subsequent actions
   - **Visual**: Right button in the pair, arrow pointing right/down/in
   - **State**: Always enabled
   - **Tooltip**: "Create new subprocess (move in one level)"
   - **Keyboard**: Ctrl+Shift+] or Ctrl+Right
   - **Behavior**: Opens a quick name input dialog or uses auto-generated name "Subprocess N"

3. **Depth Indicator** (optional, informational):
   - **Display**: Shows current depth in hierarchy (e.g., "2/5" = depth 2, total 5 subprocesses)
   - **Format**: Small text label or breadcrumb trail
   - **Example**: "Root > Construction > Guide Setup" (breadcrumb)
   - **Alternative**: Simple depth number "Depth: 2"

**Process Tree Columns (Phase 87)**:
The Process Tree uses a column-based layout to manage encapsulation logic ("Black Box" model). This replaces the single master visibility checkbox.

**Column Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│  Name                         │ 📦(Encaps) │ ★(Output)     │
├──────────────────────────────────────────────────────────────┤
│  ▼ Subprocess A               │     [ ]    │      [★]      │ 
│    ▼ Subprocess B             │     [x]    │      [☆]      │
│      Action 1                 │            │      [☆]      │
└──────────────────────────────────────────────────────────────┘
```

1.  **Encapsulate Column** (Subprocesses Only):
    -   **Icon**: Box 📦 / Eye-Slash 
    -   **Left Indent**: Positioned left of the Output column.
    -   **Behavior**: Toggles `hideIntermediates` state.
    -   **State**: 
        -   Unchecked (Glass Box): All children are visible (default).
        -   Checked (Black Box): Hides all children *except* those marked as Output.

2.  **Output Column** (All Rows):
    -   **Icon**: Star ★ / ☆
    -   **Position**: Right-aligned.
    -   **Behavior**: Toggles `isOutput` flag.
    -   **State**:
        -   Filled (★): This item is an Output. It remains visible even if its parent is Encapsulated.
        -   Empty (☆): This is an internal detail. It is hidden if the parent is Encapsulated.

**Visual Feedback**:
-   **Encapsulated Parent**: When checked, immediate visual feedback in the tree:
    -   Internal items (non-stars) fade out (opacity 0.5) to indicate they are logically hidden.
    -   Output items (stars) remain fully opaque.
    -   Canvas updates immediately to hide elements generated by internal actions.

**Button Styling**:
- **Size**: Compact (24-32px square buttons)
- **Placement**: Panel header, right side or center
- **Visual**: Use arrow symbols (< >) or text labels (Out/In)
- **Color**: 
  - Enabled: Normal theme color (#2196F3 or similar)
  - Disabled: Gray (#CCCCCC)
  - Hover: Slightly darker/highlighted
- **Spacing**: 4-8px gap between buttons, visually paired

**Active Subprocess Visual Feedback**:
- **Highlight**: Current active subprocess has subtle background color (#E3F2FD or similar)
- **Icon**: Optional "►" or dot indicator next to active subprocess name
- **Font**: Active subprocess name may be bold or slightly larger
- **Border**: Optional left border accent line (2-3px, theme color)

**Behavior**:

1. **Push (Create Subprocess)**:
   ```typescript
   // User clicks ">" button
   const cmd = new Command('Push Subprocess', world);
   cmd.addAndExecute(new PushSubprocessOp('User Subprocess'));
   cmd.commit();
   commandStack.push(cmd);
   // UI updates: tree expands, new subprocess highlighted
   ```

2. **Pop (Close Subprocess)**:
   ```typescript
   // User clicks "<" button
   if (world.getProcessTree().getStackDepth() <= 1) {
     // Disable button, cannot pop root
     return;
   }
   const cmd = new Command('Pop Subprocess', world);
   cmd.addAndExecute(new PopSubprocessOp());
   cmd.commit();
   commandStack.push(cmd);
   // UI updates: parent subprocess highlighted
   ```

3. **Undo Push**:
   - Undoing PushSubprocessOp removes the subprocess from the tree and pops the stack
   - Any actions added to that subprocess are also removed (cascade)

4. **Undo Pop**:
   - Undoing PopSubprocessOp pushes the subprocess back onto the stack
   - Subprocess remains in tree (it was never removed, just deactivated)

**Edge Cases**:
- **Cannot pop root**: Pop button disabled when stack depth = 1
- **Auto-naming**: If user doesn't provide a name, use "Subprocess N" where N is sequential
- **Empty subprocess**: User can pop immediately after push (creates empty subprocess node)
- **Multiple actions**: After pop, subsequent user actions go to parent subprocess
- **Sibling creation**: After pop, user can immediately push to create sibling subprocess

**Keyboard Shortcuts**:
- `Ctrl+Shift+]` or `Ctrl+Right`: Push subprocess (same as ">" button)
- `Ctrl+Shift+[` or `Ctrl+Left`: Pop subprocess (same as "<" button)
- `Ctrl+Shift+N`: Push subprocess with name input dialog

**Accessibility**:
- Buttons have proper ARIA labels
- Keyboard navigation works
- Screen readers announce "Push subprocess" / "Pop subprocess"
- Visual focus indicators on buttons

**Migration from Old UI**:
- **REMOVE**: Large "+ Create Subprocess" button (if it exists)
- **REPLACE WITH**: Compact paired buttons (< >) in panel header
- **BENEFIT**: Clearer mental model (in/out navigation vs single creation action)

### Unified Hover Highlighting

When hovering over items in EITHER panel (World Elements or Process Tree), the system provides **unified visual feedback** across the entire UI:

**Highlighting Categories**:
1. **Focus Element**: The hovered item itself (bold highlight)
2. **Direct Ancestors**: Elements/actions that this item depends on (subtle highlight, upstream indicators)
3. **Direct Descendants**: Elements/actions that depend on this item (subtle highlight, downstream indicators)
4. **Infeasible Elements**: If focus is infeasible, show propagation of infeasibility

**Visual Indicators**:
- Highlighted in both panels simultaneously
- Highlighted in viewport (geometry rendered with highlight color/thickness)
- Dependency lines or arrows may appear in panels (optional)
- Color coding: Focus (bright), ancestors (blue tint), descendants (green tint), infeasible (red)

**Behavior**:
- Immediate (no delay)
- Temporary (clears on mouse-out)
- Non-destructive (does not affect selection state)

---

## Top Toolbar System

The toolbar region at the top of the application provides access to all primary construction and manipulation tools.

### Application Header

The header displays the current project name at the top-left, always visible:

```
┌──────────────────────────────────────────────────────────────┐
│  untitled 1                                                   │
└──────────────────────────────────────────────────────────────┘
```

**Project Name Display**:
- **Location**: Top-left corner of the application, above the toolbar
- **Display**: Shows current project name (without .diedrico extension)
- **Default**: "Untitled Project" if no project is loaded
- **Visual Cue**: Dashed underline on hover indicates editability

**Inline Editing**:
- **Activation Methods**:
  - Double-click the project name
  - Press Ctrl+R keyboard shortcut
  - Click not supported (prevents accidental edits)
  
- **Edit Mode UI**:
  ```
  [Project Name Input Field] [✓] [✕]
  ```
  - Text input with current name pre-selected
  - Checkmark button (✓) to save
  - X button (✕) to cancel
  - Input limited to 100 characters
  
- **Saving**:
  - Press **Enter** key → Save changes
  - Click **✓ button** → Save changes
  - File is immediately renamed in Google Drive (updates .diedrico file name)
  - Display updates to show new name
  - Save indicator (💾) appears briefly during the rename operation
  
- **Canceling**:
  - Press **Escape** key → Cancel and revert to original name
  - Click **✕ button** → Cancel and revert to original name
  
- **Validation**:
  - Name must not be empty (trimmed)
  - Length: 1-100 characters
  - No file system reserved characters: `/ \ : * ? " < > |`
  - Invalid names disable the save button (✓)
  - Validation occurs in real-time as user types
  
- **Behavior Notes**:
  - Cannot edit while a rename operation is in progress (prevents race conditions)
  - .diedrico extension is automatically handled (user only edits the display name)
  - Changes are saved to both Google Drive metadata and localStorage
  - No confirmation dialog - changes are immediate (but can be undone by renaming again)

**Error Handling**:
- Network errors: Error logged to console (TODO: show user feedback)
- Invalid characters: Save button disabled, no error message shown
- Empty name: Save button disabled
- Rename in progress: Double-click/Ctrl+R are ignored until operation completes

### Toolbar Organization

The toolbars are organized into distinct groups, each focused on a specific category of operations:

```
┌──────────────────────────────────────────────────────────────┐
│ [+] [📁] [Undo] [Redo] │ [Active Plane: P_H ▼] │            │
│                         │ [Point▼] [Segment▼] [Line▼]       │
│                         │ [Circle▼] [Arc▼]                   │
│                         │ [Guide▼] [Transport▼]              │
│                         │ [3D Point▼] [3D Line▼] [...]      │
│                         │ [Pan] [Zoom] [Fit]                 │
└──────────────────────────────────────────────────────────────┘
```

**Groups** (left to right):

1. **Selection Tool**: 
   - [↖] Selection/Pointer Tool: Activates selection mode for picking, moving, and editing objects
   - Icon: Pointer/arrow cursor
   - Default active tool when no construction tool is selected
   - Double-click object → Opens properties dialog
   - Drag free point → Moves point (live parametric update)
   - Drag empty space → Pans viewport
   - Shift+drag always pans (navigation override)

2. **File Operations**: 
   - [+] New Project (Ctrl+N): Creates a new project instantly with auto-generated name "untitled N"
   - [📁] Open Project (Ctrl+O): Shows dialog to open existing projects from Google Drive
   - Note: Projects auto-save to Google Drive, no explicit save button needed
   
3. **History Controls**: Undo (Ctrl+Z), Redo (Ctrl+Y) for command history

4. **Active Plane Selector**: Dropdown showing current active plane and list of all available planes

5. **2D Drawing Tools**: Point, Segment, Line, Circle, Arc tools (each with sub-tool dropdowns)

6. **Dihedral Tools**: Guide, Transport tools (specific to multi-plane operations)

7. **3D Creation Tools**: 3D Point, 3D Line, 3D Segment, 3D Plane (derive 3D from 2D projections)

8. **Navigation Tools**: Pan, Zoom, Fit View (explicit navigation controls)

**Layout Behavior**:
- Single horizontal row on wide screens
- May wrap or use overflow menu ("More ⋮") on narrow screens
- Separators (│) between groups for visual organization
- Tool groups may collapse to single icon + dropdown on very narrow screens

### Google Drive Login Status Widget

Located at the **far right of the top toolbar**, the login status widget provides persistent visibility of the user's authentication state and profile information.

**Visual States**:

1. **Not Authenticated**:
   ```
   [Sign in with Google]
   ```
   - Text button with Google branding colors
   - Clicking opens Google Sign-In flow
   
2. **Authenticated - Compact**:
   ```
   [👤 User Name ▼]
   ```
   - User avatar (circular, 32×32px) if available from Google profile
   - Fallback to generic user icon if no avatar
   - User's display name (truncated if too long: "John D...")
   - Small dropdown arrow indicating menu availability
   
3. **Authenticated - Menu Open**:
   ```
   [👤 User Name ▼]
      ├─ user@example.com
      ├─ [Sign Out]
      └─ [Account Settings] (future)
   ```

**User Profile Data** (fetched from Google Identity Services):
- `name`: Display name (e.g., "John Doe")
- `email`: Email address for identification
- `picture`: Avatar image URL (if available)
- Profile data fetched once after successful authentication
- Cached in application state for session duration
- Refreshed on page reload or re-authentication

**Interaction Behavior**:
- Click widget → Opens dropdown menu
- Menu shows:
  - User email (non-interactive, for confirmation)
  - "Sign Out" button → Revokes token and returns to sign-in state
  - Future: "Account Settings" → Opens account preferences dialog
- Click outside menu → Closes menu
- ESC key → Closes menu

**Visual Design**:
- Contrasts with toolbar background for visibility
- Maintains consistent branding with Google colors where appropriate
- Avatar circular with subtle border
- Hover state: Slight background highlight
- Active (menu open): Darker background

**Responsive Behavior**:
- On wide screens: Show avatar + full name + dropdown
- On medium screens: Show avatar + first name + dropdown
- On narrow screens: Show avatar only + dropdown (name in menu header)
- Minimum size: 40px width (avatar + padding)

**State Persistence**:
- Authentication state persists across page reloads via session token
- Profile data cached in browser session storage
- On startup: Check for existing valid token
  - If valid: Restore session and display authenticated state
  - If invalid/expired: Show "Sign in with Google" button

**Technical Integration**:
- Profile data fetched via Google Identity Services tokeninfo endpoint
- Stored in application state (likely viewStore or dedicated authStore)
- Widget component reactively updates based on auth state changes
- Sign out: Calls GoogleDriveService.signOut() and clears cached profile

**Benefits**:
- Users always know their authentication status
- Quick access to sign out without navigating away
- Visual confirmation of active account (important for multi-account users)
- Reinforces cloud storage connection (files saved to this account)

### Toolbar Interaction Model

The toolbar system follows a structured interaction pattern designed to make geometric reasoning explicit and unambiguous. This model is detailed in the sections below and expanded further in spec.md.

#### Single Active Tool

At any moment, **exactly one tool is active**.

- The active tool determines:
  - How mouse clicks are interpreted in the viewport
  - Which element types can be selected
  - Which actions are allowed
- While a tool is active, clicks are **not interpreted as generic selection**, but as inputs to complete the tool's operation.

**Visual Indication**:
- Active tool button: Pressed/highlighted state (e.g., darker background, border, or check mark)
- Status bar message: "Step 1: Select first point" or similar
- Cursor change: May change to indicate expected input
- Valid elements: May be highlighted or have hover glow when tool expects them

**State Persistence**:
- Active tool state persists until:
  - Tool operation completes successfully
  - User explicitly cancels (ESC key or Cancel button)
  - User selects a different tool
- Tool does NOT deactivate when user navigates (pan/zoom)

#### Tool Families and Sub-Tools

**Concept**: Tools are grouped into **functional families**, each represented by a primary button with a dropdown menu. This pattern is inspired by GeoGebra Classic's toolbar organization.

**Example: Point Tool Family**
```
[Point ▼]
  ├─ Free Point
  └─ Intersection Point
```

**Example: Line Tool Family**
```
[Line ▼]
  ├─ Line by Two Points
  ├─ Parallel Line
  ├─ Perpendicular Line
  ├─ Tangent to Circle (Through Point)
  └─ Tangent to Circle (Parallel to Line)
```

**Example: Circle Tool Family**
```
[Circle ▼]
  └─ Circle by Center and Point
```

**Example: Other Tool Families**
```
[Segment ▼]
  └─ Segment by Two Points

[Guide ▼]
  └─ Guide (Perpendicular to Hinge Line)

[Transport ▼]
  └─ Transport Point via Guide
```

**Toolbar Button Behavior**:

1. **Initial State**: Button shows default sub-tool (typically the first/most common)
   - Example: Point button initially shows "Free Point" icon + label
   
2. **Click Button (Main Area)**: Activates the last-used sub-tool from that family
   - If user previously used "Parallel Line", clicking Line button activates Parallel Line
   - If no sub-tool used yet, activates the default (first in list)
   
3. **Click Dropdown Arrow**: Shows menu of all sub-tools in family
   - Menu displays all available construction variants
   - Current sub-tool highlighted/checked in menu
   
4. **Select Sub-Tool from Menu**: Activates that sub-tool and updates button face
   - Button icon changes to selected sub-tool's icon
   - Button label updates (if labels shown)
   - Selected sub-tool becomes the new "last-used" for this family

**Last-Used Sub-Tool Memory**:

- System remembers the last-used sub-tool for EACH family independently
- Memory persists across tool switches (selecting different family, then returning)
- Memory persists across sessions (saved to localStorage or preferences)
- Clicking a family button always activates its last-used sub-tool for efficiency

**Example User Workflow**:

1. User clicks "Line" button → activates "Line by Two Points" (default)
2. User creates several lines using two points
3. User opens Line dropdown, selects "Parallel Line"
4. User creates a parallel line
5. User switches to Point tool to add more points
6. User clicks "Line" button again → activates "Parallel Line" (last-used)
7. User doesn't need to re-select Parallel Line from dropdown

**Benefits**:

- **Compact toolbar**: Fewer top-level buttons (6-8 families vs 20+ individual tools)
- **Groups conceptually related operations**: All line variants together, all point variants together
- **Makes user intent explicit**: User chooses specific construction variant, not inferred
- **Last-used memory reduces clicks**: Most common workflows don't require dropdown navigation
- **Scalable**: Easy to add new sub-tools without cluttering toolbar

**Visual Design Requirements**:

- Button face MUST show currently active sub-tool icon
- Dropdown arrow MUST be visually distinct from main button area
- Active sub-tool MUST be highlighted/checked in dropdown menu
- Button MUST have active state when any sub-tool from family is active
- Tooltip MUST show currently active sub-tool name (not just family name)

#### Sequential Interaction Flow
#### Element Variations and Tool Architecture

**Principle**: Different construction methods require different tools, even for the same element type.

**Tool Creation Per Variation**:

Each element variation (see spec.md "Element Construction Methods") has its own dedicated tool:

- **Free Point Tool**: Creates FreePoint2D by clicking to position
- **Line-Line Intersection Tool**: Creates Point2DLineLineIntersection from two lines
- **Line-Circle Intersection Tool**: Creates Point2DLineCircleIntersection from line + circle
- **Circle-Circle Intersection Tool**: Creates Point2DCircleCircleIntersection from two circles
- **Free Line Tool**: Creates Line2D from two selected points
- **Parallel Line Tool** (planned): Creates ParallelLine2D from point + reference line
- **Perpendicular Line Tool** (planned): Creates PerpendicularLine2D from point + reference line
- **Plane by Traces Tool** (planned): Creates Plane3DByTraces from two trace lines

**Why Separate Tools Matter for UI**:

1. **Different input sequences**:
   - Free Point: Click position → done
   - Line-Line Intersection: Select line 1 → select line 2 → done
   - Line-Circle Intersection: Select line → select circle → choose index (0 or 1) → done

2. **Different selection masks**:
   - Free Point Tool: No mask (clicks canvas directly)
   - Intersection Tools: mask=['line', 'circle'] (depending on step)
   - Parallel Line Tool: mask=['line'] (step 1), mask=['point'] (step 2)

3. **Different preview behavior**:
   - Free Point: Shows point at cursor position
   - Line-Line Intersection: Shows intersection point(s) when cursor hovers over second line
   - Line-Circle Intersection: Shows 0, 1, or 2 intersection points, highlights selected index

4. **Different validation requirements**:
   - Free Point: Position must be within canvas bounds
   - Intersections: Selected elements must actually intersect (validation at execution)
   - Parallel Line: Reference line and through-point cannot be coincident

5. **Different feedback requirements**:
   - Intersections: "No intersection" message if elements don't intersect
   - Index selection: Visual indicators showing which solution is selected (0 or 1)
   - Infeasibility: If later edits make intersection infeasible, element becomes infeasible

**Tool Family Organization by Variation**:

Tool families group variations of the same element type:

```
[Point ▼]
  └─ Free Point              (creates FreePoint2D)

[Line ▼]
  └─ Free Line              (creates Line2D)
```

**Note**: Additional variations (intersection points, parallel/perpendicular lines, auxiliary planes) will be added when 3D manipulation support is implemented.

NOTE: The Plane tool family does NOT include "Fixed Plane" - Plane3DFixed (P_H, P_V) 
are initialization-only elements that users CANNOT create via UI. Only Plane3DByTraces 
is user-creatable.
```

**CRITICAL - Initialization-Only Elements Have No Tools**:

Some element variations exist only for world initialization and CANNOT be created by users:

- **Plane3DFixed**: Only for P_H and P_V during world setup
  - No tool in toolbar
  - No way for users to create additional fixed planes
  - Purpose: Represent the fundamental horizontal and vertical projection planes
  
- **Origin Points**: O_H and O_V created during initialization
  - No special tool (just FreePoint2D with locked=true)
  - Users can create other free points, but origins are pre-existing

All other variations are user-creatable and have corresponding tools.

**Visual Differentiation in Canvas**:

Elements created by different construction methods have visual differences:

- **Free elements** (user-positioned):
  - Full opacity/saturation
  - Standard colors (black for lines, blue for points)
  - Always shown when visible
  
- **Derived elements** (computed from dependencies):
  - Slightly de-emphasized (80% opacity or lighter color)
  - Labeled automatically with construction info (e.g., "P₁ ∩ L₂")
  - Can become infeasible (shown with dashed outline + red tint)

- **Fixed elements** (initialization only - P_H, P_V, O_H, O_V):
  - Always locked (cannot be moved)
  - Displayed with special visual treatment (heavier weight, distinctive color)
  - No creation tool (created during world initialization)

**Interaction Behavior Differences**:

- **Free elements**: 
  - Can be moved by dragging
  - Can be deleted
  - Cannot become infeasible
  
- **Derived elements**:
  - Cannot be moved directly (move parent elements instead)
  - Can be deleted (breaks dependency chain)
  - Can become infeasible (when parent positions make computation invalid)
  
- **Fixed elements**:
  - Cannot be moved (locked permanently)
  - Cannot be deleted (structural elements)
  - Never infeasible (hard-coded values)

Each tool defines an **explicit sequential flow** of steps:

1. **Tool Activation**: User selects tool from toolbar
2. **Step 1**: System prompts for first input (e.g., "Select first point")
3. **User Input**: User provides input (click, type value, select element)
4. **Validation**: System validates input
5. **Step 2**: If valid, system prompts for next input
6. **Repeat**: Continue until all steps completed
7. **Execution**: Create element, record action, provide feedback

**Key Characteristics**:
- Each step expects a **specific type of input** (point, line, numeric value, etc.)
- User **cannot skip steps** (must complete each in order)
- System always knows:
  - Current step number and total steps
  - What input type is expected
  - What inputs are valid at current step

**Visual Feedback During Flow**:
- Step indicator: "Step 2 of 3: Select second point"
- Preview: Dynamic preview of result (e.g., line following cursor after first point selected)
- Valid elements: Highlighted when cursor hovers (if applicable)
- Snap indicators: Visual feedback when cursor near valid snap targets

#### Valid Input Restriction

While a tool is active:
- **Only valid elements** for the current step can be selected
- Valid elements are visually indicated (hover glow, highlight outline)
- Invalid elements are **ignored** (no hover effect, click has no effect)
- This **prevents errors** and **reinforces learning** (users understand what inputs are geometrically valid)

**Selection Mask System**:

Each tool maintains a **selection mask** that defines which element types can be highlighted and selected. This mask:
- Filters hit testing: `Paper.hitTest()` only returns elements matching the current mask
- Controls hover highlighting: Only masked element types highlight on hover
- Updates as the tool progresses through its steps

**Example: Line Tool**
```
Step 1: Select first point
  mask: ['point']
Step 2: Select second point
  mask: ['point']
```

**Example: Guide Tool**
```
Initial state:
  mask: ['half-hinge-line', 'point']

User picks HHL:
  mask: ['point']  (now only points can be selected)

OR user picks point first:
  mask: ['half-hinge-line']  (now only HHLs can be selected)
```
The mask enforces the constraint: guide requires exactly one HHL and one point, in any order.

**Example: Parallel Line Tool**
```
Step 1: Select reference line
  mask: ['line', 'segment']
Step 2: Select point
  mask: ['point']
```

**Implementation**:
- Each tool defines `getSelectionMask(currentStep): ElementType[]`
- Before hit testing, query active tool for current mask
- Filter hit test results to match mask
- Filter hover highlights to match mask

#### Tool Argument Collection Framework (Phase 64)

**Purpose**: Provide consistent UI feedback and interaction patterns for tools that collect multiple geometric arguments, supporting both single-method and multi-method construction tools.

**Scope**: Tools using ArgumentCollectorTool base class (see data-model.md §Tool Argument Collection Framework)

**UI Feedback Components**:

1. **Status Bar Message**:
   - Shows current construction method and progress
   - Updates dynamically as arguments are collected
   - Examples:
     - Initial: `"Tangent Line: Select circle, point, or line"`
     - After circle selected: `"Tangent Line (2 options): Select point or line"`
     - After circle + point: `"Creating tangent line through point..."`

2. **Visual Element Highlighting**:
   - Elements matching current selection mask highlight on hover
   - Selection mask automatically computed as union of all viable next arguments
   - Highlighting reflects viability (elements that would eliminate all options are NOT highlighted)

3. **Cursor Feedback**:
   - Standard cursor for valid selections
   - No special cursor needed (highlighting provides sufficient feedback)

**Status Message Format**:

```
[Tool Name]: [Action Description]
[Tool Name] ([N] options): [Action Description]
Creating [element type]...
```

**Examples by Construction Method Count**:

**Single Method** (e.g., Circle by Center + Circumference Point):
```
Initial: "Circle: Select center point"
After center: "Circle: Select circumference point"
On completion: "Creating circle..."
```

**Two Methods** (e.g., Tangent Line):
```
Initial: "Tangent Line: Select circle, point, or line"
After circle: "Tangent Line (2 options): Select point or line"
  → After circle + point: "Creating tangent line through point..."
  → After circle + line: "Creating tangent line parallel to line..."
```

**Mutually Exclusive Arguments** (framework constraint):
- Only argument combinations that differ by element TYPE are supported
- Tools requiring same-type arguments (e.g., "2 points" vs "3 points") use SEPARATE tools
- UI never needs to disambiguate between same-type combinations

**Dynamic Selection Mask**:

The selection mask updates automatically as arguments are collected:

1. **Initial mask** = union of all possible first arguments
2. **After first argument** = union of valid next arguments for remaining viable sets
3. **Mask narrows** as options are eliminated

**Example: Tangent Line Tool**
```
Argument Sets:
  Set 0: [circle, point]
  Set 1: [circle, line]

State 1 (no args):
  Viable sets: [0, 1]
  Selection mask: union(circle, point, line) = circle | point | line
  All three element types highlighted on hover

State 2 (circle selected):
  Viable sets: [0, 1]
  Selection mask: union(point, line) = point | line
  Only points and lines highlighted on hover

State 3 (circle + point selected):
  Viable sets: [0]
  Construction executes immediately (set 0 complete)
```

**User Interaction Flow**:

1. User activates tool
2. Status bar shows initial prompt with all options
3. User clicks valid element (highlighted on hover)
4. System:
   - Adds argument to collection
   - Updates viable argument sets
   - Updates selection mask
   - Updates status bar message
5. Repeat until exactly one argument set is complete
6. Tool executes construction automatically

**Cancellation**:
- ESC key: Cancels argument collection, resets tool
- Status bar shows initial prompt again
- Already-collected arguments are discarded

**Error Handling**:
- Invalid combinations detected before construction
- Set-level validators check argument compatibility
- Non-modal error message if all sets become invalid
- Tool stays active for retry

**Design Principles**:
- **No modal dialogs**: All feedback through status bar and highlighting
- **Immediate feedback**: Status updates on every argument addition
- **Progressive disclosure**: Show only viable options at each step
- **Automatic execution**: No "OK" button needed when arguments complete
- **Forgiving workflow**: Any-order collection, cancel anytime with ESC

**Accessibility**:
- Status messages are screen-reader friendly
- Keyboard navigation supported (tab to cycle through valid elements)
- High-contrast highlighting for visual clarity

**Performance**:
- Mask updates must be < 50ms (imperceptible to user)
- Highlighting must be < 100ms (smooth hover feedback)
- Status message updates must be synchronous with argument addition

#### Create Projection Plane Tool

**Purpose**: Allow users to create new projection planes by "unfolding" a 3D plane onto the paper using a trace line as the hinge.

**Pedagogical Goal**: This tool teaches users how to construct auxiliary projection planes in dihedral projection. Users must:
1. Understand that a 3D plane Q is defined by two trace lines (T1 on P1, T2 on P2)
2. Determine where trace T2 should appear when plane Q is unfolded using T1 as the hinge
3. Manually construct the position of T2' (the image of T2 in the new projection plane)

**Nomenclature**:
- **Q**: The 3D plane to be projected (defined by two trace lines)
- **T1**: Trace of Q on projection plane P1 (becomes the **hinge line**)
- **T2**: Trace of Q on projection plane P2 (defines Q's geometry)
- **T2'**: User-constructed line on P1 showing where T2 should appear in the new projection plane
- **P1**: The existing projection plane that Q will be folded onto
- **P2**: Another existing projection plane where T2 exists

**User Workflow**:

```
[Projection Plane ▼]
  └─ Create Projection Plane by Hinge
```

**Three-Step Sequential Tool**:

1. **Step 1: Select T1 (Hinge Line)**
   - Status: `"Projection Plane: Select hinge line (trace on folding plane)"`
   - Selection mask: `['line']` (only 2D lines selectable)
   - User clicks T1 (a line on projection plane P1)
   - T1 is highlighted to indicate it's selected
   
2. **Step 2: Select T2 (Other Trace)**
   - Status: `"Projection Plane: Select other trace (defines 3D plane)"`
   - Selection mask: `['line']` (only 2D lines on different planes)
   - Constraint: T2 must be on a DIFFERENT projection plane than T1
   - User clicks T2 (a line on projection plane P2)
   - Both T1 and T2 are highlighted
   
3. **Step 3: Select T2' (Position of T2 in New Plane)**
   - Status: `"Projection Plane: Select position of trace T2 in new plane"`
   - Selection mask: `['line']` (only 2D lines on same plane as T1)
   - Constraint: T2' must be on the SAME projection plane as T1 (P1)
   - User clicks T2' (a line on projection plane P1)
   - All three lines are highlighted
   - Tool executes immediately upon selection

**What T2' Represents (Two Purposes)**:

1. **Orientation Constraint**: 
   - T2' specifies which way Q unfolds relative to the hinge T1
   - Without T2', the system wouldn't know if Q should fold "up" or "down" (180° ambiguity)
   - T2' breaks this degeneracy by defining the expected position

2. **Educational Requirement (CRITICAL)**:
   - **The user must geometrically determine where T2' should be**
   - This is the core learning exercise in dihedral projection
   - Users must apply their understanding of:
     - How planes fold along hinge lines
     - How traces relate to each other when a plane is unfolded
     - Geometric construction techniques (perpendiculars, parallels, measurements)
   - **The application does NOT compute T2' - the user constructs it manually**

**Visual Feedback**:

- **During Selection**:
  - Step indicator: `"Step 1 of 3"`, `"Step 2 of 3"`, `"Step 3 of 3"`
  - Selected lines highlighted with emphasis color
  - Hover preview shows which line would be selected
  
- **After Completion**:
  - New projection plane appears on the canvas
  - Plane positioned so T1 is the shared hinge with P1
  - Grid for the new plane rendered
  - Plane added to active plane selector
  - Success message: `"Projection plane created"`

**Validation**:

1. **T1 and T2 must define a 3D plane**:
   - T1 and T2 must be traces of the same 3D plane Q
   - System verifies via 3D plane reconstruction (T1 on P1, T2 on P2 → plane Q)
   - If not coplanar: `"Error: Selected traces do not define a plane"`

2. **T2' must be geometrically consistent**:
   - System computes expected position of T2 in the new projection plane
   - Compares with user-provided T2'
   - If position differs beyond tolerance (e.g., > 1 pixel): `"Warning: T2' position may be incorrect"`
   - Tool still executes (educational - user sees the consequence)
   - **Note**: This is a WARNING, not an error (learning tool)

3. **Plane selection constraints**:
   - T1 and T2 must be on DIFFERENT projection planes
   - T1 and T2' must be on the SAME projection plane
   - If violated: `"Error: Invalid plane selection"`

**System Computation**:

From T1, T2, T2', the system computes:
1. **3D plane Q**: Reconstructed from traces T1 (on P1) and T2 (on P2)
2. **Transformation matrices**:
   - `planeToPaper`: Maps plane Q's (u,v) coordinates to paper (x',y')
   - `planeTo3D`: Maps plane Q's (u,v) to 3D world coordinates (x,y,z)
   - `threeDToPlane`: Maps 3D coordinates to plane Q's (u,v)
3. **Hinge line geometry**: T1 becomes the HingeLine connecting P1 and the new plane
4. **Paper positioning**: New plane positioned on canvas adjacent to P1 along T1

**Matrix Derivation**:
- T1 defines the fold axis (hinge direction and position)
- T2' defines the orientation (which side Q unfolds to)
- System computes rotation/translation to position Q on paper
- Matrices ensure T2 maps exactly to T2' in the new plane

**Tool Completion**:
- Creates new ProjectionPlane domain object
- Creates HingeLine between P1 and new plane
- Adds HalfHingeLine representations on both planes
- Records construction in ProcessTree
- New plane becomes available in active plane selector

**Cancellation**:
- ESC key at any step cancels and resets
- Already-selected lines are de-selected

**Error Messages**:

- `"Error: Selected traces do not define a plane"` - T1 and T2 are not coplanar in 3D
- `"Error: T1 and T2 must be on different planes"` - Both traces on same projection plane
- `"Error: T2' must be on same plane as T1"` - T2' on wrong projection plane
- `"Warning: T2' position may be incorrect (expected at [coordinates])"` - T2' doesn't match computed position
- `"Error: Cannot create plane - hinge line is degenerate"` - T1 has zero length

**Future Enhancements**:
- Visual preview showing how the plane will unfold
- Snap guides to help user position T2' correctly
- Measurement tools to verify T2' position
- Option to auto-compute T2' (with warning that this defeats learning purpose)

---

### Broken Hinge Lines (BHL) and Distance Transport (Phase 101)

#### Overview

When an auxiliary projection plane is created by folding a 3D plane Q using trace T1 as the hinge, the other trace T2 (on plane P2) appears at position T2' (on plane P1) after folding. **T2 and T2' are projections of the same 3D line** - they form what is called a **Broken Hinge Line (BHL)**.

Unlike regular hinge lines where guides are perpendicular, **guides for BHL must be parallel to the main hinge T1**. This is geometrically correct because lines parallel to T1 represent intersections of plane Q with planes containing T1, preserving distance relationships.

#### Visual Representation

**Broken Hinge Line Traces (T2 and T2')**:
- Rendered as regular lines on their respective planes
- Optional: Visual indicator that they are sibling traces (matching line style/color)
- Labels: "T2" on P2, "T2'" on P1 (using KaTeX primes: `T2\prime`)

**Guides on BHL**:
- **Direction**: Parallel to main hinge T1, NOT perpendicular to T2/T2'
- **Style**: Same as regular guides (dashed lines, distinct color)
- **Automatic Sibling**: Creating guide on T2 automatically creates sibling guide on T2'
- **Behavior**: Both guides parallel to T1, pass through corresponding points

**Arc Visualization** (Distance Transport):
- **Appearance**: Dashed arc connecting point on primary guide to point on sibling guide
- **Path**: Drawn in paper coordinates (not plane-specific)
- **Color**: Light gray (#999999)
- **Opacity**: 0.5 (semi-transparent)
- **Line Width**: 1.5px
- **Dash Pattern**: "5,5" (5px dash, 5px gap)
- **Purpose**: Shows distance transport path (like compass arc on paper)
- **Toggle**: "Show Distance Arcs" checkbox in settings (default: ON)

**Example Visual**:
```
Plane P2 (contains T2):          Plane P1 (contains T1 and T2'):
                                   
  T2 (BHHL)                        T1 (main hinge)    T2' (BHHL)
  |                                |                   |
  |   P (point)                    |                   |   P' (transported point)
  |   |                            |                   |   |
  ----+-------- guide              +--------           ----+-------- sibling guide
      |        (parallel to T1)    |                       |        (parallel to T1)
      |                            |                       |
       `~~~~~~~~~ arc ~~~~~~~~~~~~'
        (shows distance transport)
```

#### Guide Creation on BHL

**Tool Workflow**:
1. Activate Guide Tool (or Guide Perpendicular to Line Tool)
2. Select a BrokenHalfHingeLine2D (T2 or T2')
3. Select a point P on that plane
4. **System automatically**:
   - Creates primary guide through P, parallel to main hinge T1
   - Creates sibling guide on the other plane (T2' or T2), also parallel to T1
   - Computes arc geometry connecting P on primary to P' on sibling
   - Renders arc on paper overlay

**User Feedback**:
- Status bar: "Guide created on T2 (parallel to T1). Sibling guide created on T2'."
- Arc appears immediately, showing distance transport path
- Both guides highlighted briefly (animation feedback)

#### Distance Transport Operation

**Classical Paper Method (For Reference)**:
1. Point P exists on T2
2. User draws guide through P (parallel to T1 in their head)
3. User measures distance d from P along T2
4. User opens compass to distance d
5. User draws arc from P to T2', maintaining distance d
6. Intersection of arc with T2' gives transported point P'

**Digital Implementation**:
1. Point P exists on T2 (or user creates it)
2. User creates guide on T2 through P → sibling guide auto-created on T2'
3. System renders arc showing the transport path
4. User can:
   - Create point at intersection of sibling guide with T2' (transported point P')
   - Measure distance along T2, transfer to T2' using guides
   - Use intersection tool to find P' automatically

#### Settings and Toggles

**Show Distance Arcs**:
- Location: Settings panel or view options
- Control: Checkbox (☑/☐)
- Default: ON (checked)
- Effect: Shows/hides all arc visualizations for BHL sibling guides
- Persistence: Saved in user preferences

**Visual States**:
- **Arcs Visible**: Dashed gray arcs connect all sibling guide pairs
- **Arcs Hidden**: Only guides visible (no connecting arcs)
- **Hover State**: Arc brightens slightly when hovering over related guide

---

#### Continuous Visual Feedback

The system provides **constant feedback** during tool operation:

1. **Cursor Feedback**:
   - Changes shape based on context (crosshair, pointer, hand, etc.)
   - Snaps to valid targets within snap radius
   - Shows preview of action result

2. **Element Highlighting**:
   - Valid elements: Glow or outline on hover
   - Snap targets: Bright highlight when within snap radius
   - Intersection markers: Small circle/crosshair at intersection points

3. **Dynamic Preview**:
   - After first input: Show preview of final result following cursor
   - Preview updates in real-time as cursor moves
   - Preview snaps to valid targets (e.g., line preview snaps to existing points)

4. **Status Messages**:
   - Top of viewport or bottom status bar
   - Clear, brief instruction: "Step 2: Click to place second endpoint"
   - Updates immediately after each step

5. **Snap Indicators** (detailed):
   - **Point Snap**: When cursor within snap radius of existing point:
     - Cursor jumps to exact point location
     - Point highlighted with bright outline or glow
     - Color: #FF6B35 (orange) per spec
   - **Intersection Snap**: When cursor near intersection:
     - Both intersecting elements highlighted
     - Small marker (circle/crosshair) at intersection point
     - Clicking creates intersection point automatically
   - **Empty Space**: When cursor over empty area:
     - Normal crosshair cursor
     - Clicking creates free point at cursor location

6. **Distance-Adjusted Hit-Testing**:
   When multiple elements fall within the snap radius, the system uses distance-adjusted selection:
   - **Points**: adjusted_distance = actual_distance - POINT_VISUAL_RADIUS (5 pixels)
   - **Other elements** (lines, circles, etc.): adjusted_distance = actual_distance
   - System selects the element with the smallest adjusted_distance
   
   **Rationale**: Distance adjustment reflects geometric intuition. Points are rendered as small circles (~5px radius), creating a "capture zone". Subtracting this radius from the distance naturally gives points preference when they're nearby, while still allowing other elements to win if they're significantly closer.
   
   **Examples**:
   - Cursor 3px from point, 8px from line → Point wins (3-5=-2 < 8)
   - Cursor 10px from point, 3px from line → Line wins (10-5=5 > 3)
   - Cursor 7px from point, 6px from line → Point wins (7-5=2 < 6)
   
   **Implementation**: Distance adjustment applies AFTER the active tool's selection mask filters available elements. For example, if a tool's mask excludes points, lines will be selected even if points are present (mask overrides distance).
   
   **Visual Feedback**: Only the element with smallest adjusted distance within snap radius receives highlighting and snap indicator. Other elements remain visible but unhighlighted.

**Pedagogical Value**: Feedback guides the user without making decisions for them. Users learn what inputs are valid and why.

#### Explicit Result Creation

Upon completing all tool steps successfully:

1. **Element Creation**: New element(s) created in world model
2. **Action Recording**: Action recorded in ProcessTree with all parameters and dependencies
3. **Auxiliary Actions**: Any auto-created supporting elements (intersection points, free points) recorded as nested auxiliary actions within ActionGroup
4. **Visual Confirmation**: New element(s) appear in viewport and panels
5. **Tool State**: Tool may remain active (for repetition) or return to neutral state (depending on tool design)

**No Implicit Entities**: The system never creates hidden or implicit elements. Every element exists explicitly in the world model and appears in the World Elements panel.

#### Completion and Repetition

After successful operation completion, tools follow one of two consistent behavior patterns:

**Option A: Tool Remains Active** (for frequently repeated operations):

- **When to Use**: Primitives and common constructions (Point, Line, Segment, Circle)
- **Behavior**:
  - Tool stays active with same settings after completion
  - User can immediately perform same operation again
  - Tool state resets (e.g., LineTool returns to "waiting for first point")
  - Explicit deactivation required: ESC key, click different tool, or click Selection Tool
- **User Experience**: Efficient for repetitive work (e.g., adding many points, creating multiple segments)
- **Examples**:
  - **Free Point Tool**: After creating point at (100, 50), tool remains active; user can immediately click to create another point
  - **Line Tool**: After creating line between A and B, tool returns to "waiting for first point"; user can immediately start next line
  - **Circle Tool**: After creating circle, tool returns to "waiting for center"; user can immediately create another circle
  - **Segment Tool**: After creating segment, tool remains active for next segment

**Option B: Tool Returns to Selection** (for infrequent or complex operations):

- **When to Use**: Complex constructions, one-off operations (Tangent, Intersection, Transport, Perpendicular/Parallel)
- **Behavior**:
  - Tool automatically deactivates after successful completion
  - Selection Tool becomes active (cursor returns to selection mode)
  - User must explicitly reactivate tool for another operation
- **User Experience**: Prevents accidental repeated operations, returns to neutral state
- **Examples**:
  - **Intersection Tool**: After creating intersection point, tool deactivates; user typically selects/moves result rather than creating another intersection
  - **Tangent Line Tools**: After creating tangent line, tool deactivates; tangent construction is usually one-off
  - **Transport Tool**: After transporting point via guide, tool deactivates; transport is typically followed by other operations
  - **Parallel/Perpendicular Line Tools**: After creating constrained line, tool deactivates; user typically continues with different construction

**Consistency Rule**: All tools within the same **conceptual family** MUST follow the same pattern:

- **Point Family**: Option A (stays active) - all point tools remain active after creation
- **Line Family (Basic)**: Option A (stays active) - Line by Two Points remains active
- **Line Family (Constrained)**: Option B (returns to selection) - Parallel, Perpendicular, Tangent deactivate
- **Segment Family**: Option A (stays active) - remains active for repetitive use
- **Circle Family**: Option A (stays active) - remains active for multiple circles
- **Guide Family**: Option B (returns to selection) - guides are typically one-off
- **Intersection Family**: Option B (returns to selection) - intersections are derived, not repeated
- **Transport Family**: Option B (returns to selection) - transport followed by other work

**Rationale for Split**:

- **Basic primitives** (Point, Line, Segment, Circle): Users often create many in succession → stay active
- **Constrained constructions** (Parallel, Perpendicular, Tangent): Usually one-off operations → return to selection
- **Derived elements** (Intersection): Created from existing geometry, then manipulated → return to selection
- **Transport operations**: Multi-step operations typically followed by different work → return to selection

**UI Indication**:

- Tool tooltips MUST indicate completion behavior:
  - Option A: "Point Tool (P) - Stays active after creation"
  - Option B: "Tangent Line Tool - Returns to selection after creation"
- Status bar MAY show hint: "Press ESC to deselect tool" for Option A tools
- Tool button remains highlighted for Option A, deselects for Option B

#### Operation Cancellation

User can cancel active tool at any time:

**Cancel Methods**:
- Press `ESC` key (primary method)
- Click "Cancel" button in toolbar/status area (if visible)
- Click different tool (switches to new tool, cancels previous)

**Cancel Behavior**:
- Partial selections discarded
- No elements created
- No action recorded in history
- System returns to coherent state (previous tool or neutral state)
- Any preview graphics removed

**No Undo Needed**: Since no action was recorded, cancellation doesn't affect undo/redo stack.

#### Separation of Navigation and Construction

Navigation actions (pan, zoom, fit) are **conceptually separate** from construction tools:

**Always Available**:
- `Shift + Drag`: Pan
- `Mouse Wheel`: Zoom
- These work **even when a tool is active**

**Non-Interrupting**:
- Using navigation does NOT cancel active tool
- Tool state is preserved (current step, previous selections retained)
- After navigation, user continues where they left off

**Explicit Navigation Tools** (toolbar buttons):
- Provide same functionality for users who prefer buttons over shortcuts
- Also do not cancel active tool
- "Fit View" button resets zoom/pan to show all content

**Pedagogical Value**: Allows working on complex drawings without constant tool reactivation. Reduces frustration, maintains flow.

#### Absence of Hidden Inferences

The toolbar system **does not introduce implicit inferences**:

**What is NOT allowed**:
- Automatically creating points from approximate clicks near elements (unless at intersection)
- Combining arbitrary positions with geometric constraints silently
- "Fixing" user input to match geometric requirements
- Creating construction geometry without user awareness

**What IS allowed** (explicit exceptions, recorded as auxiliary actions):
1. **Intersection Point Auto-Creation**: Clicking visible intersection automatically creates intersection point (recorded in history)
2. **Free Point Auto-Creation**: Clicking empty space during point-expecting step automatically creates free point (recorded in history)

**Requirement**: All automatically created elements MUST appear as auxiliary actions in the ProcessTree, clearly distinguishing them from manually created primary elements.

**Pedagogical Value**: Every entity used as input must exist explicitly. Each construction reflects exactly the user's decisions. Students understand the complete dependency chain.

---

## Main Viewport (2D Drawing Area)

The main viewport is the primary work surface where all geometric constructions are performed and visualized.

### Dynamic Rendering Architecture

**Core Principle**: All viewport content is **dynamically derived** from the world data structures using geometric first principles. There is NO special-case rendering code for specific planes or elements.

**Rendering Pipeline**:
1. **World State**: Read current state from `world.planes[]`, `world.elements2D[]`, `world.elements3D[]`, `world.hingeLines[]`, `world.guides[]`
2. **Realization Computation**: For each element, compute current geometric realization using:
   - Element's defining relations (dependencies, construction parameters)
   - Realization cache (if valid) or recompute (if stale)
   - Geometric algorithms: intersection calculation, parallel construction, circle through points, etc.
3. **Coordinate Transformation**: Transform from plane intrinsic coordinates (u,v) to canvas pixel coordinates:
   - Apply `plane.transform_to_canvas` (2D affine matrix)
   - Apply `viewport_transform` (global pan/zoom)
4. **Rendering**: Create SVG primitives (paths, circles, points) from transformed coordinates
5. **Styling**: Apply visual styles based on:
   - Element's explicit style override (if any)
   - Inherited style from containing subprocess (if no override)
   - Default style (if no inheritance)
   - Active plane emphasis (full opacity vs. reduced opacity)

**Special Cases** (initial elements only):
- Projection planes `P_H` and `P_V`: Created during world initialization as `Plane3D` entities
- Origin point `O`: Created during world initialization as `Point3D` entity at (0, 0, 0)
- Hinge line `HL_HV`: Created during world initialization as intersection of P_H and P_V

**After initialization, these are treated like any other element**: same rendering pipeline, same geometric computations, no hard-coded paths.

**Scalability**: When additional planes, profile planes, or custom projection planes are added, they work automatically through this architecture. No code changes required.

### Projection Plane Layout

**Multi-Plane Display**:
- **All projection planes are displayed simultaneously** in the viewport
- Default layout positions planes to represent dihedral (unfolded) configuration
- Planes arranged around shared hinge lines to create recognizable Monge layout

**Example Default Layout** (for P_H and P_V):
```
 ─────────────────── HL_HV (hinge line, horizontal)
         P_V                    P_H elements render here
      (vertical)                (coordinates transformed
      elements                   from plane's u,v space)
      render here
```

**Layout Properties** (stored in `ProjectionPlane.transform_to_canvas`):
- P_H positioned above hinge line (unfolded upward)
- P_V positioned below hinge line (unfolded downward)
- Transforms ensure proper spacing and prevent overlap
- Additional planes positioned according to their geometric relationships

**Dynamic Addition of Planes**:
- When new projection plane created (auxiliary, profile), system computes `transform_to_canvas` based on:
  - Plane's geometric definition (`Plane3D`)
  - Plane's trace intersections with existing planes
  - Avoidance of overlap with existing planes
- No manual layout positioning required (derived from geometry)

### Active Plane System

**Active Plane Purpose**: Determines where new 2D elements are created.

**Visual Emphasis**:
- **Active plane elements**: Rendered at full intensity/opacity (100%)
- **Non-active plane elements**: Rendered with reduced opacity (50%) and potentially lighter colors
- **Hinge lines**: Always rendered at full intensity (they belong to multiple planes)
- **Plane surfaces** (in 3D view): Active plane may have subtle highlight

**Changing Active Plane**:
- Method: Click plane in Active Plane Selector dropdown (toolbar)
- Effect:
  - Previous active plane elements de-emphasized (opacity reduced)
  - New active plane elements emphasized (opacity increased)
  - No geometry modified
  - No planes hidden (all remain visible)
- Animation: Brief transition animation (opacity fade) for visual continuity

**Important**: Active plane affects ONLY visual emphasis and creation target. It does NOT control visibility (all planes always visible in MVP).

**Classification**: Active plane is **ViewState** (presentation state). Switching the active plane is **not** a constructive action, is **not** recorded in the ProcessTree, and is **not** part of undo/redo.

---

### PlaneSelector Component (Phase 103)

**Purpose**: Dropdown button in toolbar for selecting the active projection plane. Displays plane labels with mathematical notation.

**Visual Design**:
- **Layout**: Single compact button with dropdown (no caption text)
- **Selected Plane Display**: Shows current plane label formatted with KaTeX (e.g., P_H, P_V, P₁₂)
- **Dropdown Options**: List of all projection planes, each with KaTeX-formatted label
- **Size**: 40px height (consistent with toolbar buttons), auto-width based on label
- **Styling**: 
  - Border: 1px solid #ccc (hover: #999)
  - Background: white (hover: #e8e8e8)
  - Font: 12px weight 600 for plane labels
  - Chevron icon: Downward arrow (12×12px) to indicate dropdown

**Label Formatting** (Phase 96 Integration):
- **Subscripts**: `P_H` → P_H (horizontal plane), `P_V` → P_V (vertical plane)
- **Multi-digit subscripts**: `P_{12}` → P₁₂ (auxiliary plane 12)
- **Greek letters**: `P_{\alpha}` → P_α
- **Rendering**: Uses `formatElementLabel()` utility from Phase 96
- **Display**: KaTeX HTML injected via `v-html` directive

**Removed Elements** (Phase 103):
- **"Plane" Caption**: Previously displayed below dropdown, removed to reduce clutter
  - Old height: 50px (dropdown + caption)
  - New height: 40px (dropdown only)
  - Space savings: 10px vertical, cleaner toolbar appearance

**Interaction**:
- Click button → Open dropdown menu
- Click option → Set active plane (calls `world.setActivePlaneId()`)
- Dropdown closes automatically after selection
- Current active plane shown in button face

**Accessibility**:
- ARIA label: "Active plane selector"
- Keyboard navigation: Tab to focus, Enter/Space to open, Arrow keys to navigate, Enter to select
- Screen reader: Announces current plane and available options

**Responsive Behavior**:
- Label width adapts to longest plane name in project
- Dropdown menu width matches button width (minimum 80px)
- Z-index: 1000 (appears above canvas, below dialogs)

**Example Appearance**:
```
Before (Phase 102):                After (Phase 103):
┌──────────────┐                   ┌──────────────┐
│   P_H    ▼   │                   │   P_H    ▼   │  ← KaTeX formatted
│              │                   └──────────────┘
│    Plane     │  ← Removed
└──────────────┘
     50px                               40px
```

**Implementation Notes**:
- Replace plain text `{{ plane.label }}` with `v-html="formatElementLabel(plane.label)"`
- Remove `<span class="caption">Plane</span>` element
- Adjust container height CSS from ~50px to 40px
- Import `formatElementLabel` from `@/utils/formatUtils`

---

### Infinite 3D Line Rendering (Phase 104)

**Purpose**: Render 3D lines with sufficient length to appear as infinite lines extending far beyond typical viewport bounds, providing proper spatial understanding of line geometry.

**Problem Statement**:
- **Before**: 3D lines rendered as short segments (50 units total length), appearing disconnected and making spatial relationships unclear
- **After**: 3D lines extend far beyond viewport (≥2000 units), appearing infinite like 2D lines on projection planes

**Affected Line Types**:
- `Line3DFromProjections` (user-created 3D lines from two 2D projections)
- `HingeLine` (traces between projection planes)
- `BrokenHingeLine` (traces on auxiliary planes)
- All future `Line3D` subclasses

**Visual Design**:

**Line Extension**:
- **Total length**: 2000 units minimum (±1000 units from a point on the line)
- **Computation**: Given line defined by point P and direction D:
  - Start point: `P - 1000 * D`
  - End point: `P + 1000 * D`
- **Rationale**: Matches 2D line extension used in `Element2DRenderer3D` (lines extend ±1000 units in plane coordinates)

**Rendering Consistency**:
- **Style**: Same as before (LineBasicMaterial, orange #FF6B35 for Line3DFromProjections)
- **Thickness**: Same as before (linewidth: 3, note: may not work on all platforms)
- **Opacity**: Same as before (no changes to transparency)
- **Selection**: Same as before (userData properties for picking)

**User-Visible Changes**:
- 3D lines appear to extend "to infinity" when camera navigates
- Lines remain fully visible even when zooming out to see entire construction
- Spatial relationships between lines, planes, and points become clear
- Consistent with user expectations from 2D view (where lines extend far)

**Example Scenarios**:
- **Line3DFromProjections**: User creates 3D line from two 2D projections → Line extends far in both directions, clearly showing 3D orientation
- **HingeLine**: Trace between P_H and P_V → Line extends beyond plane boundaries, showing full spatial relationship
- **BrokenHingeLine**: Trace on auxiliary plane → Both halves extend far, making folding relationship clear

**Implementation Approach**:
- Update line rendering in `ThreeView.vue` (3D line rendering section)
- Change `lineLength` constant from `50` to `2000` (or larger)
- No changes to line geometry computation (still uses point + direction)
- No changes to realization layer (Line3DRealization3D unchanged)

**Performance Considerations**:
- Negligible performance impact (Three.js renders long lines efficiently)
- No increase in vertex count (still 2 vertices per line)
- No change to realization computation frequency

**Testing Verification**:
- Visual inspection: Lines should extend far beyond viewport at default zoom
- Navigation test: Zoom out far → lines still extend beyond visible area
- Multiple lines: Create several 3D lines → all appear infinite, not segmented

**Known Limitations**:
- Lines still finite (not truly infinite), but length sufficient for all practical constructions
- LineBasicMaterial `linewidth` property may not work on all WebGL platforms (browser limitation)
- Very large line lengths (>10000) might cause floating-point precision issues, but 2000 is well within safe range

---

### Quick 3D Line Example Tool (Phase 105)

**Purpose**: Provide a one-click example tool that automatically creates a complete 3D line from two 2D line projections, useful for quick testing and demonstrating the 3D line creation workflow.

**Tool Behavior**:
- **Activation**: Executes immediately when toolbar button is clicked (no canvas interaction needed)
- **Auto-construction**: Creates complete setup without requiring user input:
  1. Creates 4 points: 2 on P_H, 2 on P_V (predefined positions)
  2. Creates 2 lines: Line L_H on P_H (horizontal), Line L_V on P_V (vertical)
  3. Creates Line3DFromProjections from L_H and L_V
  4. Returns to selection tool automatically
- **Completion**: Single undoable command containing all operations

**Predefined Geometry**:
- **P_H projection** (horizontal plane):
  - Point P1: (-40, 15) 
  - Point P2: (40, 15)
  - Line L_H: From P1 to P2 (horizontal line at y=15)
- **P_V projection** (vertical plane):
  - Point P3: (0, -20)
  - Point P4: (0, 40)
  - Line L_V: From P3 to P4 (vertical line at x=0)
- **3D Line**: Reconstructed from L_H and L_V projections

**Geometric Result**:
- 3D line passes through origin region
- Line direction: Roughly along X-axis with slight Y/Z components
- Visible in 3D view immediately after creation
- Projections clearly visible on both P_H and P_V

**Toolbar Button**:
- **Family**: Examples family (alongside Folding Plane Setup)
- **Label**: "Quick 3D Line"
- **Icon**: 3D line with projection indicators (or reuse 3D line icon)
- **Tooltip**: "Quick 3D line setup - Creates example 3D line from two projections"

**Label Rename**:
- **Previous**: "Quick Setup" → **New**: "Folding Plane Setup"
- **Rationale**: More descriptive of actual purpose (creates traces for auxiliary projection plane testing)
- **Tooltip**: "Folding plane setup - Creates T1, T2, T2' traces for auxiliary plane testing"

**Use Cases**:
- **Quick testing**: Test 3D view rendering without manual construction
- **Demonstration**: Show students how 3D lines appear from projections
- **Workflow verification**: Verify 3D line creation pipeline works correctly
- **Debugging**: Consistent test case for 3D geometry issues

**Comparison with Interactive Tool**:
- **Interactive Create 3D Line Tool**: User selects two existing 2D lines → Creates 3D line
- **Quick 3D Line Tool**: Automatically creates both projections AND 3D line → Faster testing

**Implementation Notes**:
- Similar structure to QuickProjectionSetupTool
- Immediate execution on activate()
- Uses PointSequenceFactory and LineSequenceFactory for 2D geometry
- Uses Add3DLineOp for 3D line creation
- All operations wrapped in single ProcessTree action group

**Visual Feedback**:
- Status bar message: "Quick 3D line created"
- 3D view automatically shows new line
- Elements Panel updates with new points, lines, and 3D line
- ProcessTree shows complete construction sequence

### Background Grid (Optional)

**Purpose**: Provides measurable visual reference for geometric construction.

**Grid Properties**:
- **Toggle**: Can be enabled/disabled (checkbox in view menu or toolbar)

**Grid Properties**:
- **Toggle**: Can be enabled/disabled (checkbox in view menu or toolbar)
- **Spacing**: Adapts to zoom level (e.g., 10 units at low zoom, 50 units at high zoom)
- **Visual Style**: Light gray lines (#E0E0E0 or similar), subtle to avoid interfering with geometry
- **Major Lines**: Every 5th or 10th line slightly emphasized (darker gray)
- **Coordinate Labels**: Optional tick marks or labels at regular intervals showing coordinate values
- **Axes**: Optional origin axes (X, Y) with arrow indicators

**Grid Behavior**:
- **Visual reference only**: Does NOT affect snapping or geometric computations
- **Dynamic**: Grid updates automatically during pan/zoom to maintain readable spacing
- **Per-Project**: Grid visibility preference saved with project
- **Coordinate System**: Grid aligned with active plane's intrinsic (u,v) coordinate system

**Rendering**: Grid is rendered as bottom-most SVG layer (drawn first, elements drawn on top).

### Navigation Controls

**Always-Available Shortcuts**:
- **Pan**: `Shift + Left Drag` (hold Shift, drag mouse)
- **Zoom**: `Mouse Wheel` (scroll up = zoom in, scroll down = zoom out)
- **Next Active Plane**: `Tab` (Cycles active projection plane forward)
- **Previous Active Plane**: `Shift + Tab` (Cycles active projection plane backward)

**Toolbar Buttons** (for users who prefer explicit controls):
- **Pan Tool**: Click to activate, then drag without Shift key
- **Zoom In**: Click to zoom in one step
- **Zoom Out**: Click to zoom out one step
- **Fit View**: Click to reset zoom/pan to show all content

**Navigation Behavior**:
- Does NOT cancel active tool (construction continues after navigation)
- Does NOT modify geometry
- Affects only viewport transform (global pan/zoom matrix)
- Center of zoom: Mouse cursor position (zoom toward cursor)

**Zoom Limits**:
- Minimum zoom: Show all planes and elements (auto-computed)
- Maximum zoom: Close inspection level (e.g., 10,000% of default scale)

### Viewport Interaction Modes

The viewport has distinct interaction behaviors depending on which tool is active. Mouse cursor changes provide constant visual feedback about the current interaction mode.

#### Mode 1: Selection Tool Active (Selection/Edit/Navigation Mode)

When the **Selection Tool** is active (pointer/arrow icon in toolbar), the viewport operates in **selection, editing, and navigation mode**:

**Click on Empty Area**:
- **Behavior**: Pan/drag the viewport
- **Cursor**: Open hand (before drag) → Closed hand (during drag)
- **Action**: Click and drag to move the entire view
- **Effect**: Updates viewport transform, all content moves together

**Click on Directly-Defined Point**:
- **Behavior**: Move the point (if the point is directly defined, not derived)
- **Cursor**: Four-way arrow or crosshair when hovering over movable point
- **Action**: Click and drag to reposition the point
- **Effect**: Point's coordinates updated, dependent elements recalculated automatically
- **Restriction**: Only **directly-defined points** can be moved (free points, not intersection points or other derived points). Points with `locked=true` MUST NOT be movable.
- **Visual Feedback**: Point highlights on hover to indicate it's movable
- **Drag Threshold**: The system SHOULD treat a gesture as a “move” only after the pointer travels a small distance threshold (e.g., 3–5 px) to avoid accidental moves from clicks.
- **Continuous Feedback**: While dragging, the point’s position and all dependent geometry MUST update continuously so the user sees the full parametric impact of the move in real time.
- **Commit/Undo**: Releasing the mouse button commits the move as a single undoable action. `Ctrl+Z` reverts the point to its pre-drag position and recomputes dependents.
- **Cancel**: Pressing `Esc` during an in-progress drag MUST cancel the move and restore the original coordinates (no new action recorded).
- **Post-Drag Click Suppression**: After a drag-commit, the immediate mouse-up MUST NOT additionally trigger a “click” selection toggle.

**Click on Other Elements**:
- **Behavior**: Select the element
- **Cursor**: Default pointer arrow
- **Action**: Single click selects, Shift+click adds to selection
- **Effect**: Element highlights, properties panel updates

**Shift + Click/Drag (Override)**:
- **Behavior**: Always pans the viewport, even if clicking on element
- **Cursor**: Open/closed hand
- **Action**: Shift+drag anywhere pans the view
- **Effect**: Provides guaranteed way to navigate without accidental selection

#### Mode 2: Tool Active (Construction Input Mode)

When a construction tool is active, the viewport operates in **construction input mode**:

**General Behavior**:
- All clicks are interpreted as **input for the active tool**
- System provides **automatic snapping** and **smart point creation**
- Cursor changes to reflect expected input type and snap state

**Click on or Near Existing Point**:
- **Behavior**: Snap to the existing point, use as tool input
- **Cursor**: Crosshair with snap indicator (orange circle around point)
- **Action**: Click selects the snapped point as input
- **Effect**: Tool advances to next step using the snapped point
- **Snap Radius**: Small radius around point (e.g., 10-15 pixels)

**Click on or Near Intersection**:
- **Behavior**: Snap to intersection, automatically create intersection point, use as tool input
- **Cursor**: Crosshair with intersection marker (orange crosshair or circle)
- **Action**: Click selects the intersection point
- **Effect**: 
  - Intersection point created automatically as **auxiliary action** (if not already existing)
  - Tool advances to next step using the intersection point
  - Auxiliary action recorded in ProcessTree under current action's ActionGroup
- **Snap Radius**: Small radius around intersection (e.g., 10-15 pixels)

**Click on Empty Area (Tool Expects 2D Point)**:
- **Behavior**: Create new free point at cursor location, use as tool input
- **Cursor**: Crosshair (no snap indicator)
- **Action**: Click creates a new free point at the exact cursor coordinates
- **Effect**: 
  - Free point created automatically as **auxiliary action**
  - Tool advances to next step using the new point
  - Auxiliary action recorded in ProcessTree under current action's ActionGroup
- **Coordinates**: Uses active plane's intrinsic (u,v) coordinate system

**Click on Empty Area (Tool Does NOT Expect 2D Point)**:
- **Behavior**: Invalid input, show error feedback
- **Cursor**: Crosshair with error indicator (red circle with slash, or similar)
- **Action**: Click is ignored or brief error animation shown
- **Effect**: 
  - Tool remains at current step
  - Status message: "This tool requires [expected input type]. Click a [valid element type]."
  - Optional: Brief shake animation or red flash on viewport border

**Click on Valid Element (for current tool step)**:
- **Behavior**: Select the element as tool input
- **Cursor**: Crosshair or pointer with valid indicator (green highlight on element)
- **Action**: Click selects the element
- **Effect**: Tool advances to next step using the element

**Click on Invalid Element (for current tool step)**:
- **Behavior**: Element is ignored, no effect
- **Cursor**: Crosshair with no highlight on element (element doesn't respond to hover)
- **Action**: Click has no effect on the tool
- **Effect**: Tool remains at current step, click treated like clicking empty area

**Shift + Click/Drag (Navigation Override)**:
- **Behavior**: Always pans the viewport, **even during active tool operation**
- **Cursor**: Open/closed hand
- **Action**: Shift+drag anywhere pans the view
- **Effect**: 
  - Navigation does NOT cancel the active tool
  - Tool state preserved (current step, previous inputs retained)
  - After navigation, user continues construction where they left off
- **Pedagogical Value**: Allows adjusting view during complex multi-step constructions without losing progress

#### Cursor Feedback Reference

The system uses distinct cursor styles to provide constant feedback about the current interaction mode:

| Context | Cursor | Meaning |
|---------|--------|---------|
| No tool, empty area | Open hand | Can pan viewport by dragging |
| No tool, panning | Closed hand | Currently panning viewport |
| No tool, movable point | Four-way arrow/crosshair | Can drag to move point |
| No tool, selectable element | Default pointer | Can click to select |
| Tool active, empty (valid) | Crosshair | Can click to create free point |
| Tool active, empty (invalid) | Crosshair + error indicator | Invalid input location |
| Tool active, snap to point | Crosshair + snap circle | Will snap to existing point |
| Tool active, snap to intersection | Crosshair + intersection marker | Will snap to intersection |
| Tool active, valid element hover | Crosshair + green highlight | Valid element for tool |
| Tool active, invalid element hover | Crosshair (no highlight) | Element ignored by tool |
| Shift held (any mode) | Open/closed hand | Navigation override active |
| Zoom operation | Magnifying glass | Zoom in/out mode |

**Implementation Note**: Cursor changes should be instantaneous (no delay) to provide immediate feedback. CSS cursor properties are sufficient for most cases. Custom cursor images may be used for snap indicators and special states.

#### Circle Tool: Point Snapping Behavior (Phase 56)

The Circle Tool creates circles defined by two points (center and circumference). Both point selection steps MUST support consistent snapping behavior:

**First Click (Center Point)**:
- **Behavior**: Uses `Paper.hitTest()` to detect nearby points within snap radius
- **If point found**: Snaps to existing point, uses as center
- **If no point found**: Shows error message "No point found at click position. Please click near an existing point for the circle center."
- **Selection mask**: `['point']` (only points are valid)

**Second Click (Circumference/Radius Point)**:
- **Behavior**: MUST use `Paper.hitTest()` to detect nearby points within snap radius (consistent with first click)
- **If point found**: Snaps to existing point, uses as circumference point, creates circle
- **If no point found**: Creates new free point at click location, uses as circumference point, creates circle
- **Selection mask**: `['point']` (only points are valid)
- **Minimum radius validation**: If resulting radius < 1e-3, command is rolled back with error "Radius too small. Please click farther from center."

**Rationale**: Consistent snapping behavior across both clicks prevents accidental point duplication. The second click should preferentially use existing geometry (snap to point) but fall back to creating a new point if no existing point is nearby. This matches the behavior of other construction tools (Line, Segment, Intersection) and follows FR-041.

**User Experience**:
- User sees orange snap circle when hovering near existing points (both clicks)
- Creating circles between existing points is easy (both snap automatically)
- Creating circles with new radius points is still supported (click away from existing points)
- Reduces clutter from duplicate points at same location

### Element Interaction

**Selection** (when no tool active):
- Click element: Select (highlight, properties panel updates)
- Click + Shift: Add to selection (multi-select)
- Click empty space: Deselect all
- Drag rectangle: Area selection (select all elements within rectangle)

**Hover Highlighting** (dependency mode):
- Enable via checkbox or toggle button
- Hover element: Triggers unified hover highlighting (see Left Panel section)
- Shows element's dependencies in panels and viewport
- Non-destructive (doesn't change selection)

**Element Properties**:
- Double-click element: Open properties dialog (quick access)
- Right-click element: Context menu with common actions

**During Tool Operation**:
- Selection behavior determined by active tool (see Viewport Interaction Modes above)
- Valid elements highlighted on hover
- Invalid elements ignored
- Snap feedback provided with distinct cursor states

### Status and Feedback Overlays

**Status Bar** (bottom of viewport or top, depending on design):
- Current tool and step: "Segment Tool: Step 2 of 2 - Click second endpoint"
- Cursor coordinates: "u=125.3, v=84.7 (Plane: P_H)"
- Selection info: "3 elements selected"
- Warnings: "Element s1 is infeasible (check dependencies)"

**Snap Indicators** (overlaid on viewport):
- Point snap: Orange circle (#FF6B35) around snapped point
- Intersection marker: Orange crosshair or circle at intersection
- Snap target distance: Optional small label showing distance

**Infeasibility Indicators** (overlaid on elements):
- Infeasible elements: Rendered with red tint, dashed stroke, or icon overlay
- Propagation: Descendants of infeasible elements also marked
- Hover: Tooltip or status message explaining infeasibility cause

---

## 3D View Overlay

The 3D view is a **read-only auxiliary visualization** that helps users understand the spatial relationships of the dihedral construction.

### Positioning and Layout

**Default Position**: Bottom-right corner of main viewport

**Overlay Properties**:
- Rendered as HTML `<div>` with CSS absolute positioning overlaid on viewport canvas
- Default size: ~300×300px (or 20% of viewport width/height, whichever is smaller)
- Semi-transparent title bar with minimize/close buttons
- Contains Three.js canvas for 3D rendering

**Visual Appearance**:
- Subtle border to distinguish from 2D viewport
- Semi-transparent background or solid depending on user preference
- Title bar: "3D View" with control icons
- Optional coordinate axes indicator (XYZ axes in corner)

### Resizing and Movement

**Resize**:
- Drag handles on corners and edges (standard window resize pattern)
- Minimum size: 150×150px
- Maximum size: 80% of main viewport dimensions
- Maintains aspect ratio: Optional (can be square or rectangular)
- Resize state saved per project

**Movement**:
- Drag from title bar to move
- Can be positioned anywhere over main viewport
- Snaps to corners/edges when close (magnetic snapping)
- Cannot be moved outside viewport bounds
- Position saved per project

**Collapse/Minimize**:
- Minimize button: Collapses to small icon in corner (title bar only visible)
- Click icon to restore
- Close button: Hides 3D view entirely (can be reopened from menu)

### Camera Controls

**Rotation** (primary interaction):
- **Left Drag**: Rotate camera around center (orbiting)
- Uses Three.js OrbitControls
- Center of rotation: Computed from visible elements (or origin if empty)
- Auto-updates when elements added/removed

**Pan**:
- **Shift + Left Drag**: Pan camera (translate view)
- Middle mouse drag: Alternative pan method

**Zoom**:
- **Mouse Wheel**: Zoom in/out
- Pinch gesture (if touchpad): Zoom
- Zoom limits: Prevent too close (clipping) or too far (elements too small)

**Reset View**:
- Button in 3D view controls or double-click canvas
- Resets camera to default position (isometric or similar)
- Auto-frames all visible elements

### Reference Coordinate Axes (Phase 82)

**Purpose**: Display labeled coordinate axes at scene origin (0, 0, 0) to provide clear spatial orientation for users.

---

### Auxiliary Projection Plane Grid Alignment (Phase 82.1)

**Purpose**: Ensure auxiliary projection plane grids are geometrically correct with properly computed coordinate systems.

**User-Visible Change**:
- Grids on auxiliary projection planes now align correctly with the 3D plane geometry
- Grid lines are perpendicular (U-axis along hinge, V-axis perpendicular in-plane)
- Grid origin is at the natural intersection of the two defining trace lines

**Technical Fix**:
- Coordinate system computation uses stable double cross product for V-axis: `v = normalize(t1 × (t1 × t2))`
- Origin positioned at geometric intersection of T1 and T2 in 3D space
- No orientation ambiguity or visual artifacts

**Before vs After**:
- **Before**: Grid orientation could be incorrect, origin arbitrary, axes not properly perpendicular
- **After**: Grid geometrically correct, axes orthogonal, origin at trace intersection

**Visibility**: This fix only affects auxiliary projection planes created with the Create Projection Plane Tool. Default planes (P_H, P_V) are unchanged.

---

### Reference Coordinate Axes (Phase 82) - Original Content

**Purpose**: Display labeled coordinate axes (i, j, k vectors) at the scene origin to provide clear spatial orientation and facilitate debugging of coordinate system transformations.

**Visual Representation**:
- **Three arrows** originating from (0, 0, 0) in Three.js world coordinates
- **Arrow style**: Three.js ArrowHelper objects with visible head cones
- **Arrow length**: 15 units (scaled appropriately for scene visibility)
- **Standard colors** (X/Y/Z convention):
  - **X-axis (i)**: Red (#FF0000) - points in +X direction
  - **Y-axis (j)**: Green (#00FF00) - points in +Y direction (upward in Three.js right-handed system)
  - **Z-axis (k)**: Blue (#0000FF) - points in +Z direction (toward viewer)

**Text Labels**:
- **Implementation**: CSS2DRenderer for HTML overlay labels
- **Label content**: "X (i)", "Y (j)", "Z (k)"
- **Label positioning**: At arrow tips (+16 units from origin to clear arrow heads)
- **Label styling**:
  - White background with subtle border
  - Padding: 2-4px
  - Font: 12px sans-serif, bold
  - Always face camera (billboard behavior via CSS2DRenderer)
- **Visibility**: Labels remain readable during camera rotation

**Display Toggle**:
- Checkbox in 3D View Controls panel: "☑ Show Reference Axes"
- Default state: **Enabled** (visible by default for debugging and orientation)
- Saved in viewStore.threeViewOptions.showReferenceAxes

**Coordinate System Clarification**:
- **Three.js coordinate system**: RIGHT-HANDED (standard WebGL)
  - +X: Right
  - +Y: Up
  - +Z: Toward viewer (out of screen)
- **Domain coordinate system**: LEFT-HANDED (Monge projection)
  - +X: Right (same as Three.js)
  - +Y: Away from viewer (into screen) - viewer at (0, -∞, 0)
  - +Z: Up
- **Conversion rule**: `threeY = -domainY` (Y-axis inversion only)

**Use Cases**:
- **User orientation**: Understand current view angle relative to world axes
- **Debugging**: Verify coordinate transformations are correct
- **Learning**: Reinforce understanding of right-handed Three.js vs left-handed domain coordinates
- **Troubleshooting**: Diagnose misalignment between 2D and 3D representations

**Implementation Details**:
- Rendered in `renderReferenceAxes()` function in ThreeView.vue
- Uses THREE.ArrowHelper for each axis (origin, direction, length, color)
- Uses CSS2DRenderer instance (labelRenderer) for text labels
- Labels positioned using CSS2DObject attached to each arrow
- Updated only when toggle state changes (not every frame)

### Display Options

**Projection Plane Surfaces**:
- Toggle: Show/hide projection plane surfaces in 3D view
- Rendering: Semi-transparent rectangles or bounded regions
- Color: Match plane's assigned color, with transparency
- Active plane: May have subtle highlight

**2D Elements on Planes**:
- Toggle: Show/hide 2D constructive elements projected onto 3D plane surfaces
- Rendering: Elements rendered in their plane's 3D space using `plane.transform_to_3d`
- Style: May be lighter/thinner than 2D viewport rendering to avoid clutter

**3D Elements**:
- Always visible (primary purpose of 3D view)
- Points rendered as spheres or dots
- Lines rendered as infinite or bounded line segments
- Planes rendered as bounded rectangles or semi-infinite surfaces
- Segments rendered as line segments

**Linking Visuals**:
- Toggle: Show/hide dashed lines connecting 3D elements to their 2D projections
- Example: Dashed lines from 3D point A to its projections a_H and a_V
- Style: Thin dashed lines (#999 gray) for visual clarity without clutter

**Hinge Lines**:
- Rendered as prominent lines in 3D space
- Color: Distinct from other elements (e.g., dark blue)
- Always visible when projection planes visible

### 3D View Controls UI

**Control Panel** (inside 3D view, top-right or overlay):
- ☑ Show Planes
- ☑ Show 2D Elements
- ☑ Show Linking Visuals
- ☑ Show Grid (3D grid optional)
- [Reset Camera] button

**Interaction Restrictions**:
- **No selection**: Clicking elements in 3D view does NOT select them
- **No editing**: Cannot create, move, or modify geometry
- **Read-only**: Purely for visualization and understanding
- Clicking may show tooltips or labels (element names) but no interaction beyond that

**Pedagogical Purpose**: Helps students understand how 2D projections relate to 3D space. Provides spatial context without allowing direct 3D editing (which would bypass the learning process of constructing through projections).

### 3D Visualization of 2D Elements on Planes (Phase 77)

**Purpose**: Display 2D constructive elements positioned on their projection planes in 3D space to help users understand the spatial relationships between different planes and their geometric constructions.

**Enabled/Disabled State**:
- Toggle button in 3D view controls: "Show 2D Elements on Planes" (☐/☑)
- Default: Disabled (3D view shows only projection plane surfaces initially)
- When enabled: All visible 2D elements rendered at their 3D positions on planes
- When disabled: Only projection plane surfaces and 3D elements (if any) shown

**Element Transformation**:
- Each 2D element (Point2D, Line2D, Segment2D, Circle2D) is transformed from plane-local coordinates to 3D world coordinates
- Transformation uses ProjectionPlane's 3D position and orientation matrices
- Elements rendered "on" their planes: positioned at correct 3D location but visually appear on plane surface

**Visual Rendering**:

**Points (Point2D)**:
- Rendered as small spheres in Three.js
- Sphere radius: ~0.3-0.5 units (scaled appropriately for 3D view)
- Color: Same as 2D view element color
- Opacity: Slightly reduced from 2D view (e.g., 80%) for 3D context clarity
- Free points vs derived points: Same visual treatment as 2D (spheres vs cubes, or color differentiation)

**Lines (Line2D, Guide2D)**:
- Rendered as Three.js Line objects
- Clipped to projection plane boundaries (not infinite in 3D view)
- Line width: Similar to 2D view but adjusted for 3D visibility
- Color: Same as 2D view
- Opacity: Slightly reduced (e.g., 70%)
- Guides: Dashed line pattern maintained in 3D

**Segments (Segment2D)**:
- Rendered as Three.js Line objects with defined endpoints
- Same visual style as lines but with bounded length
- Color and opacity follow 2D view settings

**Circles (Circle2D)**:
- Rendered as Three.js geometry (either BufferGeometry with circle vertices or EllipseCurve)
- Circle lies on projection plane surface in 3D space
- Rendered as continuous curve (not segmented unless necessary for performance)
- Color and opacity follow 2D view settings
- Line width consistent with 2D representation

**Active Plane Emphasis**:
- Elements on active plane: Full opacity from 2D settings (e.g., 100%)
- Elements on non-active planes: Reduced opacity (e.g., 50% of 2D opacity)
- Matches 2D view emphasis pattern for consistency

**Depth and Occlusion**:
- Three.js depth testing enabled: Elements behind planes or other elements are properly occluded
- Projection plane surfaces are semi-transparent, allowing elements to be visible through planes
- Z-fighting prevention: Elements offset slightly from plane surface (e.g., +0.01 units in plane normal direction)

**Performance Considerations**:
- Element geometry updated only when elements change (not every frame)
- Use Three.js object pooling for point spheres to minimize garbage collection
- Large numbers of elements (>500) may use simplified geometry or LOD (Level of Detail)
- Option to disable 2D element rendering in 3D view if performance degrades

**Interaction**:
- No selection: Clicking 2D elements in 3D view does NOT select them (read-only)
- Hover tooltips: May show element names/IDs when hovering (optional feature)
- Highlighting: When element selected in 2D view, corresponding 3D representation highlights with same color
- Unified hover: When hovering element in 3D view, corresponding 2D element highlights in 2D view (and vice versa)

**Display Options Integration**:
- New toggle in 3D View Controls panel: "☑ Show 2D Elements on Planes"
- Independent from "Show 3D Elements" toggle
- Independent from "Show Linking Visuals" toggle
- Can be enabled simultaneously with other display options

**Visual Hierarchy**:
1. Projection plane surfaces (semi-transparent rectangles) - foundational layer
2. 2D elements on planes (points, lines, circles) - primary content layer
3. 3D elements (if any exist) - derived element layer
4. Linking visuals (optional dashed connections) - auxiliary layer

**Camera and Lighting**:
- Three.js default lighting (ambient + directional) for visibility
- Elements should be clearly visible from all camera angles
- No dramatic shadows or complex lighting (keep it simple and clear)

**Benefits**:
- **Spatial Understanding**: See how all planes and their elements relate in 3D
- **Multi-Plane Relationships**: Understand geometric relationships across planes
- **Pedagogical Value**: Reinforce dihedral projection concepts visually
- **Debugging Aid**: Verify geometric constructions are positioned correctly in 3D
- **Read-Only**: Maintains learning focus on 2D constructive process

---

## Dialogs and Modals

### Startup Dialog

**Purpose**: Google Drive authentication and project selection at application launch.

**Trigger**: Automatically shown when user is not authenticated, or when clicking "Open Project" button (Ctrl+O).

**Layout**:
- Modal dialog centered on screen with overlay
- Title: "Diedrico - Project Selection"
- Two main flows: Sign-in (if not authenticated) or Open Existing Project (if authenticated)

**Sign-In Section** (when not authenticated):
- Text: "Sign in with Google to access your projects"
- Button: "Sign in with Google"
- OAuth2 flow via gapi.client
- Required scope: `https://www.googleapis.com/auth/drive.file`

**Open Existing Project Section** (when authenticated):
- Header: "Open Existing Project"
- File list: Shows all `.diedrico` files from "diedrico" folder in Google Drive
- Each file shows: Name (without extension), Last modified date
- Selection: Click to select, double-click to open
- Button: "Open" (enabled when file is selected)
- Empty state: "No projects found in your Google Drive. Use the 'New' button (Ctrl+N) in the toolbar to create your first project!"

**Behavior**:
- Initial startup: Shows sign-in if not authenticated, shows file list if authenticated
- Open button in toolbar: Shows only file list (no create new project option)
- Dialog cannot be closed by clicking overlay - user must complete sign-in or select a project
- After opening project, dialog is hidden and main application loads

### Element Properties Dialog

**Trigger**: Click element in World Elements panel, or double-click element in viewport.

**Layout**:
- Modal dialog centered on screen
- Title: "Properties: [element name]"
- Sections: Geometry Info (read-only), Visual Style (editable)
- Buttons: Save, Cancel, Reset to Default

**Geometry Info Section** (read-only):
- Element type: "2D Point", "2D Segment", etc.
- Plane: Which projection plane it belongs to (for 2D elements)
- Coordinates or parameters: Display current realization data
- Dependencies: List of elements this depends on (links to dependency graph)
- Created by: Link to action in ProcessTree that created it

**Visual Style Section** (editable):
- **Color**: Color picker (hex input or palette)
- **Line Width**: Numeric input or slider (0.5 - 5.0 pixels)
- **Line Style**: Dropdown (Solid, Dashed, Dotted)
- **Visibility**: Checkbox (show/hide this element)
  - Controls `visibility` property in VisualStyle (inheritable from subprocess)
  - Tooltip: "Control whether this element is displayed in views"
  - When unchecked: Element does not render in canvas or 3D view, but remains in World Elements panel with eye-slash icon
  - Invisible elements are not selectable/pickable in viewport (invisible to hit-testing)
  - Invisible elements still participate in geometric computations and dependency tracking
  - **Inheritance**: Unset visibility inherits from subprocess defaults (like other style properties)
- **Opacity**: Slider (0% - 100%)
- **Reset**: Button to clear style overrides and inherit from subprocess

**Style Inheritance**:
- Properties **unset by default** (grayed out or shown as "Inherit")
- When unset, effective style inherited from containing subprocess
- Setting a property creates explicit override (bold or marked with *)
- "Reset to Default" button clears override, returns to inheritance

**Save Behavior**:
- Click Save: Apply changes, close dialog
- Changes recorded as command (undoable)
- Viewport updates immediately to reflect style changes

### Subprocess Properties Dialog

**Trigger**: Right-click subprocess in ProcessTree panel, select "Properties" from context menu.

**Layout**:
- Modal dialog
- Title: "Subprocess Properties: [subprocess name]"
- Sections: Name (editable), Default Visual Style (editable), Visibility

**Name Section**:
- Text input: Change subprocess name
- Validation: Non-empty, unique within parent scope

**Default Visual Style Section**:
- Same controls as Element Properties dialog
- These styles are inherited by all child elements (unless overridden)
- Changing subprocess style updates all child elements that inherit (cascade)

**Visibility**:
- Checkbox: Show/hide all elements in this subprocess
- Cascade option: Apply to nested subprocesses as well

### Project Settings Dialog

**Trigger**: Menu → Settings, or keyboard shortcut.

**Sections**:
- Grid settings (visibility, spacing, style)
- Snap settings (enable/disable, snap radius)
- Default styles (default colors, line widths for new elements)
- 3D view settings (initial camera position, display options)
- Google account settings (sign out, re-authenticate)

---

## Visual Design Guidelines

### Color Palette

**Element Colors** (defaults, can be overridden per element):
- Points: Black (#000000)
- Lines/Segments: Black (#000000)
- Circles/Arcs: Black (#000000)
- Guides: Gray (#333333), dashed
- Hinge Lines: Dark blue (#003366), solid
- Snap Indicators: Orange (#FF6B35)
- Infeasible Elements: Red tint overlay or red dashed outline

**Emphasis Colors**:
- Active plane emphasis: Full opacity (100%)
- Non-active plane de-emphasis: 50% opacity
- Hover highlight: Blue glow (#4A90E2, 20% opacity outline)
- Selection highlight: Blue (#0066CC, 2px outline)
- Dependency highlight: Green tint (#4CAF50, 20% opacity) for descendants, Blue tint (#2196F3, 20% opacity) for ancestors

**UI Colors**:
- Background: Light gray (#F5F5F5) for panels
- Panel headers: Medium gray (#E0E0E0)
- Text: Dark gray (#212121) for primary, medium gray (#757575) for secondary
- Borders: Light gray (#CCCCCC)

### Typography

**Font Family**: System fonts (sans-serif stack)
- Primary: "Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif
- Monospace (coordinates): "Fira Code", "Consolas", "Monaco", monospace

**Font Sizes**:
- Panel headers: 14px, bold
- Element names: 13px, regular
- Status text: 12px, regular
- Tooltips: 11px, regular
- Coordinates: 11px, monospace

### Spacing and Layout

**Panel Padding**: 8px internal padding
**Element Spacing**: 4px between list items
**Icon Size**: 16×16px for small icons, 24×24px for toolbar icons
**Button Padding**: 6px vertical, 12px horizontal
**Border Radius**: 4px for panels, 3px for buttons

### Iconography

**Consistent Icon System**:
- Outlined style (Material Design or similar)
- 24×24px for toolbar (with 4px padding)
- 16×16px for panel items
- Color: Inherit from context (usually dark gray)

**Common Icons**:
- Point: Small circle or dot
- Line: Diagonal line
- Segment: Short line with endpoints
- Circle: Ring
- Guide: Line with perpendicular marker
- Eye (visibility): Open eye = visible, closed eye = hidden
- Gear (auxiliary): Indicates auto-created supporting actions
- Triangle (collapse): Right-pointing = collapsed, down-pointing = expanded

---

## Toolbar Icon-Only Design (Phase 68)

### Design Philosophy

Toolbar buttons use **icon-only** design with no text labels. Icons must be **self-explanatory** through visual metaphor and consistent color-coding. The design follows Material Design principles with a pedagogical color scheme that teaches construction method semantics.

### Button Specifications

**Size and Layout**:
- Button size: 40×40px square
- Icon size: 24×24px (centered within button)
- Padding: 0 (icon fills button with flexbox centering)
- Border: 1px solid #ccc (normal state)
- Border-radius: 4px
- Background: white (normal), #e8e8e8 (hover), #4A90E2 (active/selected)

**Visual States**:
- **Normal**: White background, #ccc border, colored icon
- **Hover**: #e8e8e8 background, #999 border, colored icon
- **Active/Selected**: #4A90E2 background, white icon (inverted colors)
- **Disabled**: 0.4 opacity, no hover effects

**Accessibility**:
- All buttons have `aria-label` with descriptive text
- Tooltips appear on hover (500ms delay) with tool name and keyboard shortcut
- Keyboard navigation: Tab moves between buttons, Enter/Space activates

### Color System

**Material Design Palette** (defined in `constants/colors.ts`):

```typescript
export const ICON_COLORS = {
  primary: '#2196F3',    // Material Blue 500 - Created/output elements
  secondary: '#FF9800',  // Material Orange 500 - Argument/input elements
  neutral: '#757575',    // Material Grey 600 - Context/reference elements
  inactive: '#9E9E9E',   // Material Grey 500 - Disabled state
}
```

**Color Semantics** (Pedagogical):
- **Blue (#2196F3)**: Elements **created** by the tool (output)
- **Orange (#FF9800)**: Elements **required** as arguments (input)
- **Grey (#757575)**: Neutral context elements (grid, reference)
- **Black (#000000)**: Single-operation actions (no geometric construction)

### Icon Design Patterns

**Construction Tools** (create geometric elements):
- **Two-color pattern**: Blue for created element + Orange for required arguments
- **Visual flow**: Arguments → Tool → Created element (left-to-right or implied)
- **Examples**:
  - **Line Tool**: Orange points (args) → Blue line (created)
  - **Circle Tool**: Orange center point + Orange circumference point → Blue circle (created)
  - **Parallel Line**: Orange reference line + Orange point → Blue parallel line (created)

**Action Buttons** (non-geometric operations):
- **Monochrome pattern**: Single color, no orange arguments
- **Color**: Blue (#2196F3) for primary actions
- **Examples**:
  - **Undo/Redo**: Blue curved arrow (no geometric arguments)
  - **New File**: Blue document with plus (no geometric arguments)
  - **Zoom In/Out**: Blue magnifying glass (no geometric arguments)

**Context Buttons** (view/navigation):
- **Grey pattern**: Neutral grey (#757575) for non-construction tools
- **Examples**:
  - **Grid Toggle**: Grey grid lines (0.6 opacity)
  - **Pan**: Grey hand icon

**Selection Tool**:
- **Monochrome**: Blue pointer/cursor icon (special status as default tool)

### Icon Catalog

**Tool Family Icons** (Geometric Construction):

1. **Selection Tool**: Blue pointer cursor (default tool indicator)
2. **Free Point**: Single blue filled circle (no arguments, user places freely)
3. **Intersection Point**: Two blue crossing lines with orange point at intersection
4. **Line by Two Points**: Blue diagonal line with orange endpoint circles
5. **Segment**: Blue line segment with orange endpoint circles (finite)
6. **Parallel Line**: Orange reference line + orange point → blue parallel line
7. **Perpendicular Line**: Orange reference line + orange point → blue perpendicular line with 90° symbol
8. **Tangent Through Point**: Orange circle + orange external point → blue tangent line
9. **Tangent Parallel**: Orange circle + orange reference line → blue tangent line
10. **Circle**: Orange center point + orange circumference point → blue circle
11. **Guide Line**: Orange hinge line + orange point → blue guide with perpendicular marker
12. **Transport Point**: Orange source point + orange guide → blue transported point

**File Control Icons** (Actions):

13. **New File**: Blue document outline with orange plus sign
14. **Open File**: Blue folder outline with arrow
15. **Save File**: Blue floppy disk icon (monochrome)

**History Control Icons** (Actions):

16. **Undo**: Blue curved arrow pointing left
17. **Redo**: Blue curved arrow pointing right

**Navigation Icons** (Context):

18. **Grid Toggle**: Grey grid pattern (6 lines, 0.6 opacity)
19. **Zoom In**: Blue magnifying glass with plus
20. **Zoom Out**: Blue magnifying glass with minus
21. **Zoom Fit**: Blue frame with arrows pointing inward
22. **Pan**: Grey open hand icon

**Plane Control Icons**:

23. **Active Plane**: Blue rectangle with label indicator (context)

### Icon Design Rules

**Consistency Requirements**:
1. **Viewbox**: All icons use `viewBox="0 0 24 24"` (24×24 unit coordinate system)
2. **Stroke width**: 1.5px for primary elements, 1px for details
3. **Geometric simplicity**: Use basic shapes (circles, lines, paths) - no complex illustrations
4. **Color application**:
   - Construction tools: Two-color (blue + orange) showing inputs and outputs
   - Action buttons: Monochrome blue (no geometric arguments)
   - Context buttons: Monochrome grey (neutral, non-construction)
5. **Metaphor clarity**: Icon must communicate tool purpose without text
6. **Contrast**: Ensure sufficient contrast for accessibility (WCAG AA minimum)

**Anti-Patterns** (What to avoid):
- ❌ **Inconsistent colors**: Don't mix color schemes (some black, some blue/orange)
- ❌ **Text labels**: No text within icons (icon-only design)
- ❌ **Overly complex**: Avoid detailed illustrations, use simple geometric shapes
- ❌ **Ambiguous metaphors**: Icon must clearly represent tool function
- ❌ **Inconsistent stroke widths**: Maintain uniform stroke width across similar elements
- ❌ **Poor contrast**: Ensure colors are distinguishable for colorblind users

### Implementation Notes

**Component Structure**:
- Each icon is a Vue SFC in `frontend/src/components/icons/toolbar/`
- Icons import `ICON_COLORS` from `constants/colors.ts`
- Icons use `:fill` or `:stroke` bindings for dynamic color application
- Icons are stateless presentational components (no props except size)

**Integration**:
- Toolbar.vue imports icon components from `@/components/icons/toolbar`
- ToolConfig interface uses `icon: Component` type (not string)
- Tool families display icon of currently active sub-tool
- Icon size controlled by `.button-icon` CSS class (24×24px)

**Future Enhancements**:
- High-contrast mode: Increase stroke width and contrast ratios
- Colorblind mode: Use patterns/shapes instead of colors for semantics
- Customization: Allow users to choose alternative icon sets or color schemes

---

## Accessibility and Usability

### Keyboard Navigation

- **Tab**: Navigate between UI elements
- **Arrow Keys**: Navigate lists/trees in panels
- **Enter**: Activate selected item
- **ESC**: Cancel active tool, close dialogs
- **Space**: Toggle checkboxes, expand/collapse tree nodes
- **Ctrl+Z / Cmd+Z**: Undo
- **Ctrl+Y / Cmd+Y**: Redo
- **Delete / Backspace**: Delete selected element(s) with cascade deletion
  - Deletes all selected elements and their dependencies
  - Uses DependencyService to find cascade elements automatically
  - Operation is undoable (Ctrl+Z restores all deleted elements)
  - Visual feedback shows dependent elements that will be deleted
  - Status bar message: "X elements deleted (Y dependencies)"
  - Cannot delete fundamental elements (projection planes, hinge line)

### Mouse/Cursor Conventions

- **Standard Pointer**: Hovering UI buttons/panels
- **Crosshair**: Creating geometry in viewport
- **Hand (Open)**: Pan mode
- **Hand (Closed)**: Actively panning
- **Resize Arrows**: Resizing panels or 3D view
- **Move (Four Arrows)**: Moving 3D view overlay

### Tooltips

- Appear on hover after ~500ms delay
- Concise text (1-2 lines max)
- Positioned near cursor, avoiding occlusion
- Dismisses on mouse move or click

### Error Handling

**Non-Modal Feedback** (principle):
- NO modal error dialogs for geometric infeasibility
- Use status messages, panel indicators, and visual highlighting instead

**Invalid Tool Input**:
- Status message: "Invalid selection - circle requires 3 non-collinear points"
- Input ignored (no action recorded)
- Tool remains active (user can retry)

**Infeasible Elements**:
- Marked in panels: Strikethrough, red icon
- Marked in viewport: Red tint, dashed outline
- Hover: Tooltip explaining cause ("Depends on infeasible element a")
- Panel message: "3 infeasible elements" (click to filter/highlight)

---

## Responsive Design Considerations

### Minimum Window Size

- Minimum width: 1024px (can work on smaller but with reduced usability)
- Minimum height: 768px

### Narrow Screen Behavior

- Panels: Collapse to icon bar (click icon to temporarily expand)
- Toolbars: Use overflow menu for less common tools
- 3D view: May auto-minimize to preserve viewport space

### Large Screen Behavior

- Panels: Can be wider, show more information
- Viewport: More working space
- 3D view: Can be larger without obscuring main work area

---

## State Persistence

The following UI state is saved per project to Google Drive and restored on project load:

- Active projection plane
- Panel sizes and collapse states
- 3D view size and position
- 3D view display options (show planes, show 2D elements, etc.)
- Grid visibility
- Hover highlighting mode enabled/disabled
- Zoom and pan state (optional, may reset to fit view on load)

---

## References and Related Documents

- **[spec.md](spec.md)**: Functional requirements, detailed tool behaviors, user scenarios
- **[data-model.md](data-model.md)**: World data structures, element definitions, realization cache architecture
- **[constitution.md](/.specify/memory/constitution.md)**: Architectural principles, including Principle VIII (Principle-Based Rendering)

---

**Version**: 1.0.0  
**Last Updated**: 2025-12-28

### Process Tree View State & Scrolling Behavior (Phase 88)

- **State Preservation**: 
    - Interactions with row controls (Output toggle, Show Intermediates toggle) MUST NOT trigger a panel re-layout that resets scroll position or node expansion state.
    - The tree structure should remain stable.
- **Auto-Scrolling**:
    - **Trigger**: Creation of a new Action or Subprocess.
    - **Behavior**: The panel continuously scrolls or jumps to the bottom to reveal the newly added row.
    - **Constraint**: This is the *only* automatic scroll event. Toggling visibility or other properties must essentially happen "in place".
