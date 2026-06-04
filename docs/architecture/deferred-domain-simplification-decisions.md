# Deferred Domain Simplification Decisions

Date: 2026-06-04

Context: This records Phase 7 decisions from [`abstraction-simplification-plan.md`](./abstraction-simplification-plan.md). Earlier phases removed dead code, flattened empty realization layers, simplified presentation read contexts, trimmed tool protocol, and reduced command duplication. These remaining domain abstractions are intentionally deferred because they encode invariants or require a larger design than safe cleanup.

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

## Guardrail

Do not flatten domain vocabulary merely because a class is thin. Delete abstractions when they are neither behavior, boundary, vocabulary, nor tested variation. Keep or defer when they preserve domain meaning or aggregate invariants.
