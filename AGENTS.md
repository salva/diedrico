# Diedrico repository instructions

Scope: this repository and its descendants, unless nearer instructions apply. Paths below are relative to the repository root; no external machine-specific memory file is required.

The Copilot-facing entry point is `.github/agents/copilot-instructions.md`. Keep its repository facts aligned with this file.

## Current project

Diedrico is a frontend-only Vue 3 + TypeScript npm workspace. There is no active backend workspace.

- `frontend/src/`: application/controllers, commands, Vue components, domain geometry, infrastructure, rendering, stores and tools.
- `frontend/tests/`: unit (including architecture), integration and Playwright e2e tests.
- `docs/`: VitePress guides, architecture/API reference and contributing documentation.
- `architecture-audit/`: reviewed refactor-wave artifacts and validation evidence.
- `specs/`: reserved for current specifications, not the removed `001-dihedral-learning-mvp` plans.

Use current source, `README.md` and applicable current docs/audit artifacts. Historical plans and validation logs are context, not proof of current behavior or passing checks.

## Setup and validation

Use Node.js >=20.19.0 and npm >=10.0.0 (see root `package.json`). Install from the repository root with `npm ci` for the committed lockfile, or `npm install` when intentionally updating dependencies.

Run root scripts:

- `npm run dev`: frontend Vite server.
- `npm run validate:routine`: architecture tests, full frontend Vitest suite and frontend typecheck/build.
- `npm run lint`: frontend ESLint analysis.
- `npm run test:e2e`: Playwright browser tests.
- `npm run validate:docs`: VitePress documentation build.

See `docs/contributing/development-setup.md` and `docs/contributing/testing.md` for individual commands and scope. Run checks relevant to the change and report actual results; a documentation build does not validate application runtime behavior.

## Code style and boundaries

Follow existing conventions unless a nearer file or explicit user instruction says otherwise. Domain code owns geometry; application controllers/use cases translate UI intents into commands; Vue components render state and forward interactions. Keep docs synchronized with the current tree and scripts. Do not use removed MVP planning/spec files as design authority.

## Design principles

- **Simple and clean architecture over everything.** When the clean solution requires a larger, deeper or more complex change, take the better path. Do not compromise the architecture to keep the diff small or to avoid a refactor.
- **Zero backward compatibility weight.** Old test structures, project formats, component props, store shapes and naming conventions that are being replaced carry no weight in the decision. Remove them outright: no aliases, shims, dual paths or transition periods. Superseded project formats are not a compatibility surface.
- **Refactor the whole surface, not just the entry point.** When a contract changes, every caller changes in the same change. An overload, optional parameter, bridge or translation layer that lets old call sites keep compiling or running is the same defect as a compatibility shim: it hides the call sites that were not updated. Adapters that translate between architectural layers are not this; what is banned is a transitional adapter between an old shape and a new one.
- **Be brave.** Take the large, deep or complex change when it produces the better solution. Do not preserve a legacy pattern out of caution.
- **No over-engineering.** Build the smallest mechanism the change needs. No speculative abstraction, no configuration for cases that do not exist, no extension point without a caller. Add a layer only when it removes more complexity than it introduces.
- **One mechanism per concern.** When a concern needs a mechanism it gets exactly one. Do not add a second path beside the first: no second command stack, no duplicate geometry path, no parallel state model.
- **Structure follows the problem, not the history.** Before extending something, re-read it as a whole. If the addition leaves a shape that no longer reads as one coherent design, restructure it in the same change instead of appending to it. A mechanism that grew by accretion is a defect even when every individual step was justified.
- **Type safety at the boundaries.** No `any` or `unknown` escapes in domain, application or command contracts. Types distinguish success from failure explicitly instead of smuggling errors through nullable fields.

## Agent development workflow

Non-trivial changes — new features, bugs, regressions, review findings, architectural issues and behavior gaps — follow the process in `docs/contributing/agent-workflow.md`: a written design/plan under the Git-ignored `docs/working/`, adversarial review of every revision, a merit gate, a freshness check, then serialized implementation under `.opencode/locks/implementation-manager-working.md`. The coordinator invokes it through the skill at `.github/skills/diedrico-adversarial-development/SKILL.md`.

The seven subagents that implement it live in `.opencode/agents/` (`fixer`, `designer`, `reviewer-1`, `reviewer-2`, `implementation-reviewer`, `implementation-manager`, `developer`). `implementation-manager` holds that lock for the whole mutating phase: `developer` writes the code as its delegated implementer, and only the manager validates, stages and commits. See `docs/contributing/agent-workflow.md` for the human-facing summary.

Skip the workflow only for trivial edits such as typos, formatting, dependency bumps, or a correction with no design choice, unless the user frames the task as a feature or an issue.
