# revealGDB

[![CI](https://github.com/BarryNolte/revealGDB/actions/workflows/ci.yml/badge.svg)](https://github.com/BarryNolte/revealGDB/actions/workflows/ci.yml)

Electron + React + TypeScript GDB interface.

## Developer Quick Start

This guide is written for contributors working on the Electron application itself, not for end users of a packaged build. The source of truth for the workflow below is `package.json`, `electron.vite.config.ts`, `src/main/main.ts`, `src/main/bootstrap.ts`, `src/main/window-manager.ts`, `src/common/ipc-contracts.ts`, and `src/preload/preload.ts`.

### Prerequisites

- Node.js and npm installed locally.
- A local GDB toolchain or remote/debug target that matches one of the configured connection profiles.
- Playwright browser binaries if you intend to run end-to-end tests.

Install project dependencies:

```powershell
npm install
```

Install Playwright browsers when needed:

```powershell
npm run playwright:install
```

### Development Workflow

Start the application in development mode:

```powershell
npm run dev
```

`npm run dev` sets `REVEALGDB_BUILD=debug` and `REVEALGDB_DEBUG=true`, then starts three cooperating processes:

- `electron-vite build` compiles the Electron main and preload bundles.
- `vite` serves the renderer on port `5173`.
- `electron .` launches the app after the renderer URL is reachable.

Common maintenance commands:

| Command                 | Purpose                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `npm run lint`          | Run ESLint with `--fix` across the source tree and Vite config.                        |
| `npm run format`        | Run Prettier over source, JSON, CSS, and Markdown files.                               |
| `npm run build`         | Alias for the release build.                                                           |
| `npm run build:debug`   | Build main and renderer bundles with debug flags enabled.                              |
| `npm run build:release` | Build optimized release bundles without debug tooling.                                 |
| `npm run start`         | Launch Electron against the built output with remote debugging enabled on port `9222`. |

### Build Variants

Build behavior is controlled by `REVEALGDB_BUILD` and `REVEALGDB_DEBUG` in `electron.vite.config.ts`.

- `debug` builds define `__REVEALGDB_BUILD__ = "debug"` and enable debug-only behavior such as the detached DevTools window and the `Electron_Debug` menu.
- `release` builds define `__REVEALGDB_BUILD__ = "release"` and disable those debug-only additions.

Renderer HTML entry points are declared in `electron.vite.config.ts`. In addition to the main app, the project builds standalone renderer test pages such as `hexeditor-test.html`, `gdbcommand-test.html`, `connectionmanager-test.html`, and `settings-test.html`.

### Process Architecture

The application uses Electron's standard three-layer split:

| Layer            | Primary source                | Responsibility                                                                               |
| ---------------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| Main             | `src/main/main.ts`            | Creates windows, initializes settings, installs menus, and owns the GDB interface lifecycle. |
| Preload          | `src/preload/preload.ts`      | Exposes a typed IPC bridge to the renderer through `contextBridge`.                          |
| Renderer         | `src/renderer/*`              | React UI, tool windows, dialogs, and editor components.                                      |
| Shared contracts | `src/common/ipc-contracts.ts` | Defines channel names and request/notification shapes shared across processes.               |

### Startup Sequence

The main startup path is centered in `src/main/main.ts` and runs in this order:

1. `app.on("ready")` records startup milestones and configures persistent settings storage.
2. `configureAppSettings()` in `src/main/bootstrap.ts` configures `electron-settings` to write a prettified `settings.json` with atomic saves.
3. Saved theme information is applied before window creation to reduce theme flash.
4. `createMainWindow(resolvePreloadPath())` creates the hidden `BrowserWindow` and attaches the preload bundle from `out/preload/preload.js`.
5. `loadMainWindow()` loads either `ELECTRON_RENDERER_URL` during development or `out/renderer/index.html` in built mode.
6. On `ready-to-show`, persisted bounds are restored, the window is shown, font warming is deferred, and React DevTools may be installed in debug builds.
7. `GdbMenu.installMenu()` installs the application menu and debugger accelerators.
8. `createGdbInterface()` creates the main-process debugger interface after the UI is available.
9. `registerIpcHandlers()` wires renderer-to-main commands, queries, and notifications defined in `src/common/ipc-contracts.ts`.

### IPC and Settings

The renderer never talks directly to Node.js APIs. Instead, `src/preload/preload.ts` exposes a constrained API on `window.ipcToMain` with three interaction styles:

- `messages` and `notifications` subscribe to main-to-renderer events.
- `queries` use `ipcRenderer.invoke()` for request/response calls such as settings, system fonts, and function names.
- `commands` use `ipcRenderer.send()` for fire-and-forget actions such as GDB commands and persisted UI updates.

The persisted settings shape can be inspected in `settings.json.sample.json`. Current examples include:

- `connections`: available debug connection profiles.
- `gdb.gui`: editor theme, font size, window bounds, and dock layout.
- `gdb.run`: startup command lists and stop-time debugger actions.

`electron-settings` stores the active file as `settings.json`, and `logStartupDiagnostics()` prints the resolved path during startup.

### Testing and Generated Docs

Use the following commands when validating changes:

| Command                     | Purpose                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `npm run test`              | Run Vitest, then build the renderer and execute the Playwright suite.                   |
| `npm run test:playwright`   | Build the renderer and run all Playwright tests.                                        |
| `npm run docs`              | Generate TypeDoc output in `docs/api`.                                                  |
| `npm run benchmark:startup` | Run the startup benchmark and compare against the current baseline or previous results. |

Open generated API docs after `npm run docs`:

```powershell
start .\docs\api\index.html
```

### Troubleshooting

- If Electron starts without loading the UI, verify that the renderer dev server is reachable on port `5173` and that `npm run dev` was started from the repository root.
- If settings look stale or inconsistent, inspect the active `settings.json` file reported during startup and compare it with `settings.json.sample.json`.
- If a debug-only menu item or DevTools entry is missing, confirm that the process is running with `REVEALGDB_DEBUG=true`.
- If Playwright tests fail immediately on a new machine, install browsers with `npm run playwright:install` before re-running the suite.

## Hotkey Map

This map separates explicit revealGDB bindings from behavior inherited from Electron, Ace, and Syncfusion-backed controls. Explicit bindings are defined in source and should be treated as the stable application contract. Inherited bindings are framework behavior currently exposed by the application and may vary by platform or dependency version.

### Explicit Application Bindings

| Context                  | Key          | Action                                                      | Source of truth                                               | Notes                                                                       |
| ------------------------ | ------------ | ----------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Global menu              | `F1`         | Focus the command entry UI.                                 | `src/main/menu.ts`                                            | Sends the `command-entry` render notification.                              |
| Global menu              | `F5`         | Continue execution.                                         | `src/main/menu.ts`                                            | Calls `gdbInterface.continueExecution()`.                                   |
| Global menu              | `F6`         | Pause execution.                                            | `src/main/menu.ts`                                            | Calls `gdbInterface.pauseExecution()`.                                      |
| Global menu              | `F8`         | Step into.                                                  | `src/main/menu.ts`                                            | Calls `gdbInterface.stepInto()`.                                            |
| Global menu              | `F10`        | Step over.                                                  | `src/main/menu.ts`                                            | Calls `gdbInterface.stepOver()`.                                            |
| Global menu              | `Shift+F5`   | Stop debugging.                                             | `src/main/menu.ts`                                            | Calls `gdbInterface.stopDebugging()`.                                       |
| Global menu              | `Shift+F11`  | Step out.                                                   | `src/main/menu.ts`                                            | Calls `gdbInterface.stepOut()`.                                             |
| Source editor            | `F9`         | Toggle a breakpoint on the current line.                    | `src/renderer/ToolWindows/useSourceBreakpointInteractions.ts` | Sends either `break` or `clear` to GDB for the active file and row.         |
| Source editor            | `F1`         | Move focus to command entry.                                | `src/renderer/ToolWindows/useSourceBreakpointInteractions.ts` | Mirrors the global menu command inside Ace.                                 |
| Source editor gutter     | Mouse click  | Toggle a breakpoint on the clicked line.                    | `src/renderer/ToolWindows/useSourceBreakpointInteractions.ts` | Only triggers from the left gutter region while the editor is focused.      |
| Command window input     | `Enter`      | Send the current GDB command.                               | `src/renderer/ToolWindows/useGdbCommandController.ts`         | Also persists command history.                                              |
| Command window input     | `ArrowUp`    | Open and focus command history.                             | `src/renderer/ToolWindows/useGdbCommandController.ts`         | Shows the history dropdown.                                                 |
| Command window input     | `Escape`     | Hide history and clear the input field.                     | `src/renderer/ToolWindows/useGdbCommandController.ts`         | Resets the in-memory history iterator.                                      |
| Command history list     | `Enter`      | Copy the selected history item back to the input.           | `src/renderer/ToolWindows/useGdbCommandController.ts`         | Focus returns to the input box.                                             |
| Command history list     | `Escape`     | Close the history list.                                     | `src/renderer/ToolWindows/useGdbCommandController.ts`         | Stops propagation after handling.                                           |
| Memory window            | `Enter`      | Refresh memory using the current address and length fields. | `src/renderer/ToolWindows/GdbMemoryWindow.tsx`                | Bound on both address and length inputs.                                    |
| Hex editor               | `ArrowUp`    | Move selection back 16 bytes.                               | `src/renderer/Components/HexEditor/HexEditorKeymap.ts`        | Grid-style navigation.                                                      |
| Hex editor               | `ArrowDown`  | Move selection forward 16 bytes.                            | `src/renderer/Components/HexEditor/HexEditorKeymap.ts`        | Grid-style navigation.                                                      |
| Hex editor               | `ArrowLeft`  | Move selection back 1 byte.                                 | `src/renderer/Components/HexEditor/HexEditorKeymap.ts`        | Cell navigation.                                                            |
| Hex editor               | `ArrowRight` | Move selection forward 1 byte.                              | `src/renderer/Components/HexEditor/HexEditorKeymap.ts`        | Prevents the browser default cursor movement.                               |
| Hex editor               | `Enter`      | Commit and move to the next byte.                           | `src/renderer/Components/HexEditor/HexEditorKeymap.ts`        | Same movement rule as `Tab`.                                                |
| Hex editor               | `Tab`        | Commit and move to the next byte.                           | `src/renderer/Components/HexEditor/HexEditorKeymap.ts`        | Prevents default browser tab behavior inside the editor.                    |
| Hex editor               | `Escape`     | Cancel the current edit.                                    | `src/renderer/Components/HexEditor/HexEditorKeymap.ts`        | Restores the original value.                                                |
| Hex editor               | `0-9`, `A-F` | Enter a hexadecimal digit.                                  | `src/renderer/Components/HexEditor/HexEditorKeymap.ts`        | Input is accepted only if it matches the active validator.                  |
| Drag-and-drop list input | `Enter`      | Add the current input value as a new item.                  | `src/renderer/Components/DragAndDropList/DragAndDropList.tsx` | Uses a native keydown handler to keep behavior stable in embedded contexts. |

### Inherited Framework Behavior

| Context                           | Binding source                                                          | Current behavior                                                                                                         | Caveat                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Edit menu                         | Electron menu roles in `src/main/menu.ts`                               | Standard undo, redo, cut, copy, paste, delete, and select-all actions are exposed through Electron roles.                | Actual shortcut text is platform-specific and supplied by Electron.                                        |
| Debug-only menu                   | `Electron_Debug` menu in `src/main/menu.ts`                             | Reload, force reload, toggle DevTools, and toggle fullscreen are available when `isDebug` is true.                       | Accelerator keys are Electron defaults and can vary by platform.                                           |
| Source editor                     | Ace editor plus custom commands in `useSourceBreakpointInteractions.ts` | Ace retains its normal text navigation, selection, and editing keys except where revealGDB overrides them.               | Only `F1` and `F9` are explicitly added by this code.                                                      |
| Command history list              | Native HTML `<select>` behavior in `useGdbCommandController.ts`         | Arrow keys navigate list options once the history dropdown has focus.                                                    | The code relies on native browser select behavior rather than a custom handler.                            |
| Syncfusion grid and tree controls | Renderer tool windows using Syncfusion components                       | Standard grid navigation, focus handling, and tree expansion remain available unless a component overrides them locally. | The exact key set is owned by Syncfusion, not by revealGDB source. Verify behavior after library upgrades. |

### Gaps and Non-Bindings

- The application does not currently define custom shortcuts for connect, disconnect, docking actions, or tool-window switching.
- There is no user-facing keybinding customization system in the current codebase.
- Framework defaults should be re-verified whenever Electron, Ace, or Syncfusion major versions change.

## API Documentation

1. Generate API docs from source files:

```powershell
npm run docs
```

2. Open generated docs:

```powershell
start .\docs\api\index.html
```

Notes:

- TypeDoc reads TSDoc comments from `src/main`, `src/renderer`, `src/common`, and `src/preload`.
- Output is generated to `docs/api`.
- Test harness files and declaration files are excluded via `typedoc.json`.

## Startup Benchmark

1. Set a baseline (typically on a known-good commit)

```powershell
npm run benchmark:startup:set-baseline
```

2. Run benchmark and compare against baseline/previous commit

```powershell
npm run benchmark:startup
```

3. Optional flags

```powershell
npm run benchmark:startup -- --no-build --samples 3 --timeout 30000
```

Reports are written to reports/startup-benchmark:

- baseline.json
- latest.json
- commits/<commit>.json
- runs/<timestamp>-<commit>.json

The benchmark exits with code 2 when regression thresholds are exceeded.
