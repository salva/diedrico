# Cycle 020 Review Round 01 — App-shell project session and browser integration boundary

Status: **BLOCKING ISSUES**
Preferred direction if corrected: **proposal-direct.md**
Recommended next stage: **cycle-020-corrections-round-01**

## Scope and source-control verification

- Reviewed `scope-check.md`, `proposal-direct.md`, `proposal-restructure.md`, `source-control-reconciliation.md`, the Wave 020 plan entry, and the prior stage summary.
- Verified the central scope still matches current source: hidden production/browser composition remains in `frontend/src/application/appShell/AppShellRuntime.ts`, session/autosave still duplicate last-project storage ownership in `ProjectSessionUseCases.ts` and `AutoSaveUseCases.ts`, and `SelectionUseCases.ts` still constructs delete commands directly.
- Verified source-control reconciliation is explicitly documented for pre-existing dirty adjacent files. That issue is resolved for planning-stage closure and does not block this review round.
- Confirmed backend/docs/debug/package-tooling/broad persistence-schema work remains out of scope in both proposals.

## Proposal scoring against the six criteria

### 1. Advances the wave target outcome
- **Direct:** Pass. It directly addresses the wave’s main seam: runtime-core hidden browser/service composition and duplicated app-shell session persistence/storage ownership.
- **Restructure:** Mixed. It could improve the boundary, but it broadens the wave from explicit composition extraction into a larger session-façade redesign.

### 2. Improves architecture and code quality
- **Direct:** Pass. Narrower ports, one production composition owner, one last-project repository owner, and removal of `error: any` all improve boundaries without reopening unrelated layers.
- **Restructure:** Partial. It may improve cohesion, but it risks replacing the current split with a new façade that becomes another god object.

### 3. Respects no-backcompat / aggressive deletion priorities
- **Direct:** Pass. It explicitly deletes hidden-default construction, duplicated storage literals, the current broad persistence surface, and compatibility wrappers.
- **Restructure:** Pass in intent, but only if it actually deletes superseded classes instead of leaving wrappers. The proposal says that, but the broader scope raises execution risk.

### 4. Avoids overfeaturism
- **Direct:** Pass. Bounded to the identified seam.
- **Restructure:** Fail for this round. It is plausibly one conceptual layer higher than needed and is not yet justified by evidence that the current `ProjectSessionUseCases` / `AutoSaveUseCases` split is itself the main architectural blocker.

### 5. Avoids new risks / hidden regressions
- **Direct:** Mixed. Main risk is under-specified handling of `SelectionUseCases` direct command construction and keyboard target composition tests.
- **Restructure:** Weak. Broader import churn, broader test churn, and higher chance of accidental session/autosave regressions.

### 6. Validation sufficiency
- **Direct:** Partial pass. Mandatory validation cadence is present, but the proposal should call out the exact focused tests needed around the new production composition module/repository adapter and the SelectionUseCases decision.
- **Restructure:** Partial pass. Validation cadence is listed, but the broader rewrite would need more explicit façade transition/disposal coverage than currently described.

## SelectionUseCases direct command construction

Current source confirms `SelectionUseCases` directly creates and commits a `Command` and uses `DeletionSequenceFactory` (`frontend/src/application/appShell/SelectionUseCases.ts`). That is a real boundary smell, but reopening general command/undo architecture is out of scope for Wave 020.

**Review decision:** do **not** accept “leave it ambiguous.” The winning proposal must make an explicit choice. For this wave, the acceptable bounded choice is:

- either document it as an intentional retained application-layer dependency and keep `SelectionUseCases` unchanged in this wave;
- or introduce a **tiny** delete-selection command port local to app shell.

Given the wave target and current proposal scope, I recommend the first option: **treat it as intentional out of scope for implementation, but document that decision explicitly in the direct proposal and decision artifact.** Requiring a new deletion port here would add extra seam work without being necessary to solve the main Wave 020 problem.

## Blocking issues requiring in-place proposal correction

1. **proposal-direct.md leaves the SelectionUseCases decision open instead of explicit.**
   - The proposal currently says the wave should “either keep it documented as intentional ... or introduce a tiny delete-selection command port.” That is still undecided. Round 01 must converge on one bounded plan before implementation.
   - Required correction: update `proposal-direct.md` to state one explicit choice. Recommended choice: retain direct command construction as an intentional application-use-case dependency for this wave, add it to risks/residual debt, and forbid broader command redesign in this cycle.

2. **proposal-direct.md under-specifies ownership of production composition relative to `App.vue` and raw environment/browser access.**
   - The proposal says `App.vue` should call a production composition factory, but it does not explicitly state whether `GOOGLE_CONFIG` env reads and `window.alert` stay in `App.vue` or move into the composition module. Without that, the boundary can drift and the implementation may split browser composition across both files.
   - Required correction: define one owner for production browser composition. Recommended: `App.vue` may continue to read Vite env and pass simple callbacks/refs, but the proposal must explicitly state that concrete service/browser adapter construction (`GoogleDriveService`, `ProjectService` adapter, browser storage, scheduler, keyboard target) lives only in the production composition module, not partly in runtime core and partly elsewhere.

3. **Validation plan needs one explicit focused-test requirement for the new composition boundary.**
   - Current validation mentions focused Vitest and boundary assertions, but the acceptance criteria for this review ask for sufficient validation planning. Because this wave’s main change is composition ownership, the proposal should explicitly require a focused unit test proving runtime core no longer owns hidden browser/service defaults and a focused test for the new last-project repository adapter/ownership.
   - Required correction: amend `proposal-direct.md` validation plan and/or test changes to name these focused tests directly.

## Non-blocking observations

- `proposal-restructure.md` is a useful second option, but not preferred. It should remain rejected unless later implementation evidence proves the direct plan cannot be executed cleanly.
- Source-control reconciliation is adequate: pre-existing dirty files were disclosed and are not misattributed to Cycle 020 planning.
- Existing runtime tests currently encode the hidden-global behavior (`window.addEventListener` expectations in `AppShellRuntimeUseCases.test.ts`), so the direct proposal is right to replace those assertions.

## Recommendation

After the three direct-proposal corrections above, this cycle should prefer **proposal-direct.md** and proceed to another bounded review round. Do not broaden into the restructure path unless correction work uncovers evidence that the current session/autosave split cannot remain coherent after explicit production composition extraction.
