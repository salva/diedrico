# Project installation and autosave ownership

## Decision

Keep the existing runtime/kernel/Drive ports. `ProjectSessionUseCases.installProject`
is the single successful create/open transition: restore validated content, publish
file/name and last-project metadata, dismiss chooser, restart autosave and mark saved.
Creation still prepares an isolated payload and awaits remote success before this
transition. Pending/rejected creation preserves active world/history/redo (the B
repair); open still validates and restores in isolation before replacing live state.
Error reporting and schema 8.0.0 are unchanged. This is not a transactional remote
create/local install or storage rollback guarantee.

`AutoSaveUseCases` continues to own polling, debounce, status timers and missing-file
recovery. Its existing start/stop boundary now also owns in-flight completion
eligibility. Restart clears old timers; a small generation counter invalidates old
continuations, including reopening the same file. A captured file/name comparison
also prevents applying results after metadata changes. Every awaited Drive result
is checked before local status, recovery, authentication UI or repository effects.
Missing-file recovery still snapshots the current eligible session at recovery time,
so edits made during an update are not intentionally discarded from recreation.

## Evidence and alternatives

The baseline read mutable refs after `await updateFile`. Deferred fake-port tests
reproduce six failures: an old successful update marks the new session saved; old
missing-file failure starts recreation of the new project; auth/quota failures
change new-session UI; pending recreation adopts its returned ID into the new
session; completion after disposal revives status. These are concrete interleavings,
not an inference from use of async alone. Regressions also cover stale recreation
rejection and reopening the same file ID. Ordinary unchanged-session auth/recovery,
timer disposal, snapshot failure and B's pending/rejected/successful create tests
remain in `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`.

Consolidation alone removes duplicated installation policy but cannot make awaited
autosave completions session-owned. File-ID checks alone miss reopening the same
file and disposal. A shared session coordinator, transition lock, request queue,
abort protocol or durable retry would add responsibilities and change availability
or ordering without being necessary to suppress these demonstrated stale local
effects. The selected counter stays private to the existing timer owner; no new
session state service or persisted field is introduced. Installation consolidation
and clearing all timer types on restart make the ownership boundary reviewable in
one place rather than repeating success sequences.

## Limits

This does not cancel network requests, serialize overlapping saves within one
session, order concurrent explicit create/open/rename actions, or guarantee that a
remote write/create has no effects after a switch. A stale remote recreation may
leave an unselected Drive file; it is not deleted or automatically replayed.
Authentication failure from a no-longer-current request is ignored locally; a
current request can still reopen startup through the existing error path. Rename
changes invalidate old-name save results through metadata comparison; rename's own
awaited transition is not redesigned. No schema, retry, rollback or cross-session
remote consistency guarantee is added. Fake-port tests do not establish live OAuth
or Drive behavior. These are scoped ordinary fixes to previously documented leads,
not a reversal of B's reviewed creation behavior.
