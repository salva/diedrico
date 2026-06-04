# Deferred Domain Simplification Decisions

Date: 2026-06-04

Context: This records Phase 7 decisions from [`abstraction-simplification-plan.md`](./abstraction-simplification-plan.md) and Stage 6 decisions from [`simplification-wave2-design-plan.md`](./simplification-wave2-design-plan.md). Earlier phases removed dead code, flattened empty realization layers, simplified presentation read contexts, trimmed tool protocol, and reduced command duplication. Wave 2 removed additional historical-name architecture tests while keeping durable boundary checks. These remaining domain abstractions are intentionally deferred because they encode invariants or require a larger design than safe cleanup.

## Decisions

### `Element3D`

Decision: keep for now.

Reasoning: `Element3D` names a real domain category even if it currently adds little concrete state. Removing it would require either broadening `Element` with optional 3D realization behavior or pushing the concept into ad hoc unions/interfaces. That could make the base element model less clear.

Next condition for change: revisit only if a focused hierarchy design shows `Element3D` can become an interface or disappear without making `Element` semantically muddy.

### `Line3D`

Decision: keep for now.

Reasoning: `Line3D` is a domain concept distinct from `HingeLine` and projected reconstruction lines. It is thin, but removing it before deciding the `Element3D` shape risks flattening useful vocabulary.

Next condition for change: revisit together with `Element3D`, not independently.

### `Realization`

Decision: keep for now.

Reasoning: Empty intermediate realization classes were removed, but `Realization` still provides a common feasibility API. That common `isFeasible()` surface is useful across 2D, 3D, and projection-plane realization code.

Next condition for change: revisit only if concrete realization classes no longer need a shared feasibility contract.

### `ProjectionPlaneElementStore`

Decision: keep for now.

Reasoning: It is a small map-owning store used only by `ProjectionPlane`. Inlining it could make `ProjectionPlane` larger and more state-heavy. The real issue is `ProjectionPlane`'s size, not just this helper.

Next condition for change: revisit only as part of a broader `ProjectionPlane` redesign.

### `ProjectionPlane` Factory Methods

Decision: defer.

Reasoning: `ProjectionPlane` is large because it owns element storage, element creation, dependency registration, and realization behavior. Moving factory methods to commands/factories may help, but doing so without an invariant-focused design could scatter projection-plane invariants.

Next condition for change: create a separate ProjectionPlane design that identifies which invariants must remain on the aggregate.

### `World` Element Storage

Decision: defer.

Reasoning: `World` is large but currently owns aggregate-level identity, element storage, dependency registration, process tree, and realization coordination. Recent remediation already removed runtime notification and several non-domain concerns. Further extraction should be evidence-driven, not size-driven.

Next condition for change: revisit only when a concrete change demonstrates repeated storage logic or unclear invariants.

### `ProjectionPlane`

Decision: defer wholesale rewrite.

Reasoning: `ProjectionPlane` remains a domain aggregate, not just a helper collection. It owns projection-plane element storage, element creation rules, dependency registration coordination, and realization behavior. Rewriting it during architecture-test cleanup would mix guardrail maintenance with aggregate redesign and make regressions harder to isolate.

Next condition for change: revisit with a focused aggregate design that names the invariants that stay on `ProjectionPlane`, the collaborators that may be extracted, and the behavior tests that prove no geometry or dependency semantics changed.

### `ProjectionPlane` Matrix Helpers

Decision: explicitly defer extraction.

Reasoning: Matrix-helper extraction may be useful, but it should happen only as a contained implementation slice with geometry tests around matrix orientation, coordinate conversion, and hinge behavior. Stage 6 intentionally does not move this code.

Next condition for change: extract only when the helper boundary is small, named by current geometry behavior, and covered by focused projection-plane matrix tests.

### Projection-Plane Context Interfaces

Decision: explicitly defer collapse.

Reasoning: The projection-plane context interfaces still mark dependency and world-collaboration seams around the aggregate. Collapsing them without a narrow implementation slice would risk hiding dependency-service invariants or pushing world access back into commands/application code.

Next condition for change: collapse only if a concrete caller change proves the extra interface layer is forwarding-only and removal keeps the dependency/query/registrar boundaries clear.

### Process-Tree Tombstones

Decision: defer redesign.

Reasoning: Tombstones preserve process-tree history and support deletion semantics. Simplifying them requires a product-level decision about whether deleted construction steps remain visible, restorable, auditable, or only used internally for cascade behavior.

Next condition for change: revisit with explicit UX and persistence requirements for deleted process-tree nodes, plus migration-free tests for cascade deletion and project round trips.

### `World` Registry And Storage

Decision: defer broad registry/storage extraction.

Reasoning: `World` still owns aggregate identity, element lookup, dependency registration, process-tree coordination, and realization storage. Existing helper stores may be revisited, but Stage 6 should not lock or replace specific helper class names. Future work should be driven by repeated storage logic or unclear invariants, not by file size alone.

Next condition for change: propose a small storage/registry slice with before-and-after behavior tests for identity allocation, element lookup, dependency cleanup, realization cache behavior, and project persistence.

## Guardrail

Do not flatten domain vocabulary merely because a class is thin. Delete abstractions when they are neither behavior, boundary, vocabulary, nor tested variation. Keep or defer when they preserve domain meaning or aggregate invariants.
