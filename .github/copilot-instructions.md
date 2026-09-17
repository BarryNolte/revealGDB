# revealGDB Copilot Instructions

## Build, test, and lint commands

Use npm scripts in `package.json` as the source of truth.

- Install dependencies: `npm install`
- Start development app (Electron + Vite): `npm run dev`
- Build (release): `npm run build` or `npm run build:release`
- Build (debug): `npm run build:debug`
- Lint (auto-fixes files): `npm run lint`
- Format: `npm run format`
- Full test flow (Vitest + Playwright): `npm run test`
- Playwright suite only: `npm run test:playwright`

Single-test examples:

- Single Vitest file: `npx vitest run tests/vite/<file>.test.tsx`
- Single Vitest test by name: `npx vitest run tests/vite/<file>.test.tsx -t "test name"`
- Single Playwright spec: `npx playwright test tests/playwright/<spec>.spec.ts`
- Single Playwright test by name: `npx playwright test tests/playwright/<spec>.spec.ts -g "test name"`

## Quality assurance before completing tasks

**Always check for and fix build/lint errors before declaring work complete:**

1. After making code changes, run `npm run build` to verify TypeScript compilation and bundling succeeds with exit code 0
2. Check for any TypeScript errors, bundle errors, or lint warnings in the output
3. If errors are found, fix them before moving on to the next task
4. Do not declare a task complete until the build passes cleanly with no errors

This ensures code quality and prevents broken builds from being committed.

## High-level architecture

revealGDB is an Electron + React + TypeScript app with strict process boundaries:

- **Main process (`src/main`)**: owns app lifecycle, creates windows, initializes settings, builds menus, and manages GDB/MI lifecycle.
- **Preload (`src/preload`)**: exposes a typed `window.ipcToMain` bridge via `contextBridge`; renderer must go through this bridge for all main-process communication.
- **Renderer (`src/renderer`)**: React UI and docking-based debugger tool windows.
- **Shared contracts (`src/common`)**: IPC channel names, message/command/query payload types, and shared data structures.

Runtime flow to keep in mind:

1. `src/main/main.ts` boots Electron, configures `electron-settings`, applies theme, creates windows, and registers IPC.
2. `createGdbInterface` wires GDB stream events to renderer IPC channels and triggers startup/on-stop command batches.
3. Renderer startup (`src/renderer/main.tsx`, `src/renderer/App.tsx`) notifies main of render lifecycle, fetches settings, applies theme, and initializes dock layout.
4. Dock layout and other UI preferences are persisted in settings and restored on startup.

Key module interactions:

- **IPC registration split**: `src/main/ipc/index.ts` composes `queries.ts` (request/response handlers) and `commands.ts` (notifications and side effects). Follow this split when adding new IPC features.
- **GDB event fan-out**: `src/main/gdb-lifecycle.ts` relays MI output streams (`console`, `log`, `error`, `debug`, `html`) to renderer channels and triggers post-stop data refresh commands.
- **Docking/UI state loop**: `src/renderer/App.tsx` initializes `dock-spawn-ts`, restores `gdb.gui.dockLayout`, and emits `save-dock-layout` notifications; main persists these in settings for the next launch.
- **Settings source of truth**: the app uses `electron-settings` with prettified atomic writes to `settings.json`; shape expectations are captured in `src/common/settings-types.ts` and mirrored in `settings.json.sample.json`.
- **Build outputs and entrypoints**: `electron.vite.config.ts` builds three bundles (`out/main`, `out/preload`, `out/renderer`) and declares both the production renderer page and dedicated renderer harness pages for UI/test workflows.

## Key repository conventions

- **Layering is enforced** (`.dependency-cruiser.cjs`): renderer must not import from main; preload must not import from main or renderer; avoid circular dependencies.
- **IPC is contract-first**: when adding IPC functionality, update `src/common/ipc-contracts.ts` first, then keep `src/preload/preload.ts` and `src/preload/interface.d.ts` in sync, and finally add main handlers in `src/main/ipc/*`.
- **Settings writes go through typed notify commands**: renderer sends `NotifyMainRequest` commands, and main persists under the `gdb.*` / `gdb.gui.*` settings namespace.
- **Build flags are canonical**: `REVEALGDB_BUILD`/`REVEALGDB_DEBUG` drive `__REVEALGDB_BUILD__` and `__REVEALGDB_DEBUG__` defines used across main, preload, renderer, and tests.
- **Renderer harness pages are intentional**: `electron.vite.config.ts` includes extra renderer HTML entries (e.g., `*-test.html`) used by UI/test workflows; preserve these entries unless intentionally changing test harness coverage.
- **Release workflow conventions** (from `.github/agents/ci-release-builder.agent.md`): release automation is unsigned, uses `npm ci`, avoids `--publish always`, and uses `[skip ci]` for version-bump commits to prevent recursive runs.
- **Workspace MCP config is shared**: `.vscode/mcp.json` configures `github` and `playwright` MCP servers for repo-aware automation and browser-driven UI investigation.
