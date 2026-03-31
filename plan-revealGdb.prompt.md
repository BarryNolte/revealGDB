## Plan: Repo Organization and Coverage Review

Review the whole repository with two linked goals: first, reorganize code around clearer boundaries in the Electron main process, MI/state layer, preload bridge, and renderer; second, add risk-driven automated coverage around the highest-impact seams before or alongside larger refactors. The recommended approach is to separate transport from business logic, standardize renderer composition around service plus controller plus view patterns already present in the repo, and add shared test harnesses so new coverage is cheap to extend.

**Steps**

1. Phase 1: Normalize cross-process boundaries. Split the IPC protocol into semantic domains so connection, settings, debug-control, and renderer notifications stop evolving as one flat contract. Start with src/common/ipc-contracts.ts, src/main/ipc/commands.ts, src/main/ipc/queries.ts, and src/preload/preload.ts. Recast commands and queries as domain-specific request and response shapes, keep registration files thin, and move repeated send logic behind small helpers or services. This blocks later cleanup because the renderer and main process currently depend on the same stringly-typed surface.
2. Suggestion A: Reorganize command handling at the function and file level. In src/main/ipc/commands.ts, extract onGdbCommand, doConnection, settings persistence, renderer notification, and window-size persistence into dedicated modules. Recommended sequence: first extract a connection service, then a settings service, then a debug command service, and finally reduce commands.ts to routing only. This can proceed in parallel with Step 1 once the target IPC domains are defined.
3. Suggestion B: Reorganize query handling and preload shape together. Keep src/main/ipc/queries.ts focused on registration only, move each handler into a small query module, and mirror those domains in src/preload/preload.ts so the renderer consumes grouped APIs instead of dozens of flat bridge methods. Add a typed wrapper layer in the renderer before moving existing callers. This depends on Step 1.
4. Phase 2: Untangle startup and window orchestration. Consolidate startup flow spread across src/main/main.ts, src/main/bootstrap.ts, src/main/window-manager.ts, and src/main/gdb-lifecycle.ts into an explicit bootstrap pipeline. Recommended sequence: identify boot phases, extract a bootstrap coordinator, move BrowserWindow creation and restore logic under that coordinator, then leave main.ts as Electron event wiring only. This can run after Step 1 and in parallel with Step 5.
5. Suggestion C: Split the MI/state layer by responsibility. In src/main/mi-interface/gdb-state-database/gdbStateDatabase.ts, separate store ownership, read-only queries, lifecycle operations, and UI broadcasting. Use the existing store classes and orchestration classes as the seeds for a coordinator plus query facade split. Then move the large shared type file at src/main/mi-interface/gdb-state-database/types/gdbStateTypes.ts into domain type modules. This is a blocking prerequisite for broader notifier and handler cleanup.
6. Suggestion D: Remove UI transport coupling from MI handlers and notifiers. Refactor src/main/mi-interface/mi-notify-handler.ts, src/main/mi-interface/mi-result-handler.ts, src/main/mi-interface/mi-exec-handler.ts, src/main/mi-interface/gdb-state-database/notifiers/ElectronUINotifier.ts, and src/main/utilities/ConnectionNotifier.ts so parsing, state mutation, and renderer side effects are separate stages. Recommended sequence: first replace direct mainWindow usage with injected notifier or host abstractions, then extract pure parse functions, then isolate apply or broadcast steps into strategy modules. This depends on Step 5.
7. Suggestion E: Clarify connector and parser boundaries. In src/main/mi-interface/gdb-connector/gdb-connector.ts and related connector files, define a real connector contract and a factory or registry for implementations. In src/main/mi-interface/gdb-parsers/gdb-locals.ts, split raw parsing from tree-building so locals parsing is independently testable and easier to move. These changes can run in parallel with Step 6 once the MI/state interfaces are stable enough.
8. Phase 3: Standardize renderer organization. Build a renderer service layer that wraps window.ipcToMain and custom window events, then move feature components onto a consistent service plus controller plus view pattern. Start with heavily stateful areas: src/renderer/App.tsx, src/renderer/Dialogs/Settings.tsx, src/renderer/Dialogs/useConnectionDialogController.ts, src/renderer/Components/Toolbar.tsx, src/renderer/ToolWindows/GdbMemoryWindow.tsx, src/renderer/ToolWindows/GdbLocalsWindow.tsx, and src/renderer/ToolWindows/GdbDisassemblerWindow.tsx. Use the existing GdbSourceWindow model or view or controller pattern as the reference implementation. This can start after Step 1 and does not need the full MI refactor to begin.
9. Suggestion F: Clean up renderer file and directory layout. Move the standalone test or demo entry points currently under src/renderer into a dedicated test-pages or harness directory, group renderer utilities by domain instead of a flat utilities folder, and keep CSS either truly global in src/renderer/index.css or colocated with the component it styles. After the service layer exists, consider a small tool-window factory to remove repeated subscription and wrapper boilerplate. This depends on Step 8.
10. Phase 4: Add shared test harnesses before broad coverage expansion. Create main-process test helpers for Electron surfaces, app settings, BrowserWindow behavior, and child-process lifecycle. Add renderer-side helpers for window.ipcToMain, dock manager interactions, and Syncfusion component stubs. This step should happen before most new tests because it lowers repetition and keeps the coverage plan maintainable.
11. Coverage Plan Part 1: High-risk main-process tests. Add targeted unit and integration coverage for src/main/ipc/queries.ts, src/main/window-manager.ts, src/main/app-events.ts, src/preload/preload.ts, src/main/mi-interface/gdb-state-database/orchestration/StateUpdateBroadcaster.ts, src/main/mi-interface/gdb-state-database/notifiers/ElectronUINotifier.ts, and the individual store classes under src/main/mi-interface/gdb-state-database/stores. Recommended sequence: queries and window-manager first as quick wins, then notifier and broadcaster, then store-by-store coverage, then connector lifecycle tests. This depends on Step 10, while store tests also benefit from Step 5.
12. Coverage Plan Part 2: High-risk renderer tests. Add behavioral tests for src/renderer/Dialogs/useConnectionDialogController.ts, src/renderer/Components/Toolbar.tsx, and extracted renderer models or services that come out of Settings, Memory, Locals, and Disassembly cleanup. Prefer unit tests for validation and command-building logic, and component tests only where behavior crosses rendering boundaries. This can begin after Step 10 and parallel Step 11.
13. Coverage Plan Part 3: Focused Playwright growth. Expand from the current basic command and connection flows to user-critical paths: connect using a saved profile, cancel or fail connection, persist settings changes, show or hide tool windows, and refresh a memory or command-driven view. Keep Playwright focused on cross-process and UI wiring, not parser correctness already covered by Vitest. This should follow the harness and targeted unit test work so failures are easier to localize.
14. Phase 5: Stage the work to preserve momentum. Do not attempt a single giant reorg. Recommended order: Step 1, Step 10, Step 11 quick wins, Step 8 on one renderer slice, Step 5 on one MI slice, then iterate outward. Use each extracted seam as the place to add tests before moving to the next seam.

**Relevant files**

- c:/Users/barry/Documents/Projects/revealGDB/src/common/ipc-contracts.ts — split flat channel declarations into domain-oriented contracts and typed payload groupings
- c:/Users/barry/Documents/Projects/revealGDB/src/main/ipc/commands.ts — reduce handleNotifyMain, onGdbCommand, and doConnection into thin dispatch plus services
- c:/Users/barry/Documents/Projects/revealGDB/src/main/ipc/queries.ts — turn registration into thin composition over individual query handlers
- c:/Users/barry/Documents/Projects/revealGDB/src/preload/preload.ts — group bridge methods by domain and align with revised IPC contracts
- c:/Users/barry/Documents/Projects/revealGDB/src/main/main.ts — keep Electron entry wiring only after bootstrap extraction
- c:/Users/barry/Documents/Projects/revealGDB/src/main/bootstrap.ts — candidate home for explicit app bootstrap phases
- c:/Users/barry/Documents/Projects/revealGDB/src/main/window-manager.ts — isolate BrowserWindow creation, restore, and debug-window behavior for cleaner startup and testability
- c:/Users/barry/Documents/Projects/revealGDB/src/main/gdb-lifecycle.ts — align GDB lifecycle startup and teardown with the new bootstrap pipeline
- c:/Users/barry/Documents/Projects/revealGDB/src/main/mi-interface/gdb-state-database/gdbStateDatabase.ts — split coordinator, query facade, lifecycle, and notifier usage
- c:/Users/barry/Documents/Projects/revealGDB/src/main/mi-interface/gdb-state-database/types/gdbStateTypes.ts — break into domain type modules or colocate with stores
- c:/Users/barry/Documents/Projects/revealGDB/src/main/mi-interface/gdb-state-database/orchestration/StateUpdateBroadcaster.ts — high-risk coordination point that needs direct tests
- c:/Users/barry/Documents/Projects/revealGDB/src/main/mi-interface/gdb-state-database/notifiers/ElectronUINotifier.ts — central renderer notification adapter and strong candidate for dependency injection
- c:/Users/barry/Documents/Projects/revealGDB/src/main/mi-interface/gdb-state-database/stores/LocalsStore.ts — representative store-level quick win for new coverage
- c:/Users/barry/Documents/Projects/revealGDB/src/main/mi-interface/mi-notify-handler.ts — separate parse, state apply, and UI side effects
- c:/Users/barry/Documents/Projects/revealGDB/src/main/mi-interface/mi-result-handler.ts — move strategy registration and result application toward clearer seams
- c:/Users/barry/Documents/Projects/revealGDB/src/main/mi-interface/mi-exec-handler.ts — same separation target as notify and result handlers
- c:/Users/barry/Documents/Projects/revealGDB/src/main/mi-interface/gdb-connector/gdb-connector.ts — replace placeholder base behavior with a clearer connector contract
- c:/Users/barry/Documents/Projects/revealGDB/src/main/mi-interface/gdb-parsers/gdb-locals.ts — separate raw parse and tree-building heuristics
- c:/Users/barry/Documents/Projects/revealGDB/src/renderer/App.tsx — split dock-manager bootstrapping, dialog orchestration, and main-process subscriptions
- c:/Users/barry/Documents/Projects/revealGDB/src/renderer/Dialogs/Settings.tsx — extract settings load, persistence, and event-bus behavior from presentation
- c:/Users/barry/Documents/Projects/revealGDB/src/renderer/Dialogs/useConnectionDialogController.ts — strong behavioral test candidate and controller pattern reference for other dialogs
- c:/Users/barry/Documents/Projects/revealGDB/src/renderer/Components/Toolbar.tsx — centralize command actions and window-menu behavior behind services or hooks
- c:/Users/barry/Documents/Projects/revealGDB/src/renderer/ToolWindows/GdbMemoryWindow.tsx — break validation, IPC, and presentation apart using the source window pattern
- c:/Users/barry/Documents/Projects/revealGDB/src/renderer/ToolWindows/GdbLocalsWindow.tsx — candidate for controller plus view split
- c:/Users/barry/Documents/Projects/revealGDB/src/renderer/ToolWindows/GdbDisassemblerWindow.tsx — candidate for controller plus view split
- c:/Users/barry/Documents/Projects/revealGDB/src/renderer/ToolWindows/GdbSourceWindowModel.ts — reference model pattern already present in the repo
- c:/Users/barry/Documents/Projects/revealGDB/src/renderer/ToolWindows/GdbSourceWindowView.tsx — reference view split already present in the repo
- c:/Users/barry/Documents/Projects/revealGDB/src/renderer/ToolWindows/useGdbSourceWindowController.ts — reference controller split already present in the repo
- c:/Users/barry/Documents/Projects/revealGDB/tests/playwright/connection-manager.spec.ts — current end-to-end surface to extend once harnesses and services stabilize
- c:/Users/barry/Documents/Projects/revealGDB/tests/playwright/gdb-command.spec.ts — current command-focused end-to-end surface to extend with failure and persistence flows

**Verification**

1. Use npm run build after each architecture slice to catch contract drift across main, preload, and renderer.
2. Run Vitest selectively for new coverage slices first, especially IPC, window-manager, preload, store, and controller tests, before broad full-suite runs.
3. Run the existing Playwright targets for the touched user flows after any renderer or IPC contract changes, especially the gdb-command and connection-manager paths.
4. For organization work, verify that direct mainWindow access decreases in MI and notifier layers, and that renderer components consume services or controllers instead of raw bridge calls where a refactor slice was completed.
5. For coverage work, track new tests by seam rather than raw line percentage first: IPC registration, preload bridge, startup wiring, notifier broadcasting, store mutation behavior, dialog control flow, and toolbar command dispatch.

**Decisions**

- Scope includes the whole repository with equal weight on Electron main-process and renderer code.
- Large structural changes are acceptable if they materially improve maintainability.
- Generated artifacts are out of scope.
- Existing test files are excluded from the organization critique, but they are part of the coverage inventory.
- Coverage work should prioritize highest-risk behavior and coordination seams before chasing broad percentages.
- Existing strong patterns to reuse are the store classes under gdb-state-database and the renderer source-window model or view or controller split.

**Further Considerations**

1. Prefer one pilot refactor in the renderer and one in the MI or state layer before a repo-wide reorganization so naming, folder structure, and test harness patterns settle with real feedback.
2. If the IPC protocol is changed early, update preload and renderer service wrappers in the same slice; partial protocol migrations will otherwise create noisy churn.
3. Keep Playwright focused on cross-process behavior and user workflows, and let Vitest own parser, controller, store, and protocol edge cases.

**Execution Order I Recommend**

1. Normalize IPC boundaries
2. Build shared test harnesses
3. Add quick-win main-process tests
4. Refactor one renderer slice using the source-window pattern
5. Refactor one MI or state slice
6. Expand coverage around each new seam before moving to the next slice
7. Grow Playwright only after the lower-level seams are stable
