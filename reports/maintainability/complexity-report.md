# Code Complexity Report

Generated: 2026-05-03T22:36:21.884Z

Test files are excluded. Cyclomatic complexity thresholds: warn >= 15, error >= 25.

## Trend (vs last snapshot)

| Bucket | Avg CC | High CC files | Fn > 25 | Fn > 15 |
| --- | ---: | ---: | ---: | ---: |
| main | -0.31 | — | — | — |
| renderer | -0.29 | — | — | — |
| preload | — | — | — | — |
| **total** | | | — | — |

## main

- Files analyzed: 64
- Functions analyzed: 392
- Avg file cyclomatic: 7.30
- Functions with CC >= 25 (High): 2
- Functions with CC 15-24 (Medium): 3

| File | File CC | Max Fn CC | Fn Count | SLOC |
| --- | ---: | ---: | ---: | ---: |
| src/main/mi-interface/mi-notify-handler.ts | 61 | 61 [HIGH] | 2 | 219 |
| src/main/mi-interface/mi-exec-handler.ts | 35 | 35 [HIGH] | 2 | 93 |
| src/main/mi-interface/mi-result-handler.ts | 23 | 23 [MED] | 5 | 129 |
| src/main/ipc/commands.ts | 35 | 22 [MED] | 13 | 244 |
| src/main/mi-interface/mappers/breakpoint-mapper.ts | 15 | 15 [MED] | 1 | 20 |
| src/main/mi-interface/gdb-parsers/disasmParser.ts | 11 | 11 | 1 | 38 |
| src/main/mi-interface/mi-output-processor.ts | 28 | 11 | 17 | 168 |
| src/main/mi-interface/mi-result-strategies/stack-parsing-helpers.ts | 10 | 10 | 1 | 27 |
| src/main/mi-interface/gdb-parsers/gdb-output-capture.ts | 19 | 9 | 5 | 99 |
| src/main/mi-interface/mi-result-strategies/thread-parsing-helpers.ts | 9 | 9 | 1 | 24 |
| src/main/mi-interface/mi-status-handler.ts | 9 | 9 | 2 | 38 |
| src/main/mi-interface/mi-result-strategies/asm-parsing-helpers.ts | 9 | 8 | 2 | 32 |
| src/main/mi-interface/mi-result-strategies/threads-result-strategy.ts | 9 | 7 | 3 | 37 |
| src/main/main.ts | 10 | 6 | 9 | 96 |
| src/main/mi-interface/gdb-state-database/gdbSourceFileCache.ts | 6 | 6 | 7 | 46 |
| src/main/mi-interface/mappers/thread-mapper.ts | 6 | 6 | 2 | 47 |
| src/main/utilities/wsl-utilities.ts | 10 | 6 | 6 | 61 |
| src/main/mi-interface/gdb-parsers/gdb-locals.ts | 43 | 5 | 28 | 255 |
| src/main/mi-interface/mappers/memory-mapper.ts | 6 | 5 | 3 | 21 |
| src/main/window-manager.ts | 9 | 5 | 8 | 72 |
| src/main/mi-interface/gdb-connector/gdb-connector-general.ts | 5 | 4 | 10 | 65 |
| src/main/app-events.ts | 6 | 3 | 4 | 32 |
| src/main/ipc/queries.ts | 4 | 3 | 8 | 47 |
| src/main/menu.ts | 3 | 3 | 17 | 190 |
| src/main/mi-interface/gdb-state-database/stores/StackFrameStore.ts | 4 | 3 | 4 | 21 |
| src/main/mi-interface/mappers/register-mapper.ts | 3 | 3 | 1 | 12 |
| src/main/mi-interface/mi-result-strategies/register-parsing-helpers.ts | 6 | 3 | 4 | 27 |
| src/main/mi-interface/mi-result-strategies/stack-result-strategy.ts | 3 | 3 | 3 | 36 |
| src/main/theme-support.ts | 3 | 3 | 1 | 14 |
| src/main/utilities/ConnectionNotifier.ts | 6 | 3 | 8 | 46 |
| src/main/utilities/GeneralInfoSender.ts | 6 | 3 | 8 | 44 |
| src/main/bootstrap.ts | 3 | 2 | 11 | 75 |
| src/main/gdb-lifecycle.ts | 2 | 2 | 9 | 48 |
| src/main/mi-interface/gdb-state-database/gdbStateDatabase.ts | 4 | 2 | 52 | 266 |
| src/main/mi-interface/gdb-state-database/orchestration/StateLifecycleCoordinator.ts | 4 | 2 | 16 | 132 |
| src/main/mi-interface/gdb-state-database/stores/FeatureStore.ts | 2 | 2 | 5 | 19 |
| src/main/mi-interface/gdb-state-database/stores/FunctionStore.ts | 2 | 2 | 8 | 28 |
| src/main/mi-interface/gdb-state-database/stores/RegisterStore.ts | 2 | 2 | 4 | 22 |
| src/main/mi-interface/gdb-state-database/stores/ThreadStore.ts | 4 | 2 | 13 | 47 |
| src/main/mi-interface/mi-interface.ts | 4 | 2 | 28 | 132 |
| src/main/mi-interface/mi-result-strategies/registers-result-strategy.ts | 2 | 2 | 4 | 22 |
| src/main/utilities/logger.ts | 3 | 2 | 3 | 15 |
| src/main/ipc/index.ts | 1 | 1 | 1 | 8 |
| src/main/ipc-sender.ts | 1 | 1 | 2 | 8 |
| src/main/mappers/window-pos-mapper.ts | 1 | 1 | 1 | 20 |
| src/main/mi-interface/gdb-connector/gdb-connector.ts | 1 | 1 | 6 | 28 |
| src/main/mi-interface/gdb-state-database/notifiers/ElectronUINotifier.ts | 1 | 1 | 6 | 34 |
| src/main/mi-interface/gdb-state-database/orchestration/StateUpdateBroadcaster.ts | 1 | 1 | 7 | 40 |
| src/main/mi-interface/gdb-state-database/stores/BreakpointStore.ts | 1 | 1 | 4 | 16 |
| src/main/mi-interface/gdb-state-database/stores/LocalsStore.ts | 1 | 1 | 3 | 13 |
| src/main/mi-interface/gdb-state-database/stores/ParameterStore.ts | 1 | 1 | 3 | 13 |
| src/main/mi-interface/gdb-state-database/stores/SourceFileStore.ts | 1 | 1 | 3 | 13 |
| src/main/mi-interface/gdb-state-database/stores/SymbolStore.ts | 1 | 1 | 4 | 17 |
| src/main/mi-interface/gdb-state-database/stores/ThreadGroupStore.ts | 1 | 1 | 7 | 25 |
| src/main/mi-interface/mi-result-strategies/asm-result-strategy.ts | 1 | 1 | 2 | 18 |
| src/main/mi-interface/mi-result-strategies/memory-result-strategy.ts | 1 | 1 | 2 | 16 |
| src/main/mi-interface/mi-result-strategies/regex-parsing-helpers.ts | 1 | 1 | 2 | 6 |
| src/main/app-settings.ts | 1 | 0 | 0 | 2 |
| src/main/ipc/types.ts | 1 | 0 | 0 | 14 |
| src/main/mi-interface/gdb-state-database/notifiers/UINotifier.ts | 1 | 0 | 0 | 17 |
| src/main/mi-interface/gdb-state-database/types/gdbStateTypes.ts | 1 | 0 | 0 | 19 |
| src/main/mi-interface/mi-output-types.ts | 1 | 0 | 0 | 11 |
| src/main/mi-interface/mi-result-strategies/mi-result-strategy-types.ts | 1 | 0 | 0 | 5 |
| src/main/platform-info.ts | 2 | 0 | 0 | 4 |

## renderer

- Files analyzed: 54
- Functions analyzed: 506
- Avg file cyclomatic: 8.61
- Functions with CC >= 25 (High): 0
- Functions with CC 15-24 (Medium): 0

| File | File CC | Max Fn CC | Fn Count | SLOC |
| --- | ---: | ---: | ---: | ---: |
| src/renderer/Components/HexEditor/MouseKeyboardHandler.ts | 32 | 13 | 14 | 189 |
| src/renderer/Dialogs/connectionManagerModel.ts | 32 | 10 | 21 | 150 |
| src/renderer/ToolWindows/GdbMemoryWindow.tsx | 15 | 10 | 8 | 136 |
| src/renderer/Components/HexEditor/HexEditorKeymap.ts | 9 | 9 | 1 | 28 |
| src/renderer/Dialogs/Settings.tsx | 13 | 9 | 15 | 249 |
| src/renderer/ToolWindows/GdbDisassemblerWindow.tsx | 16 | 8 | 20 | 281 |
| src/renderer/ToolWindows/useSourceBreakpointInteractions.ts | 15 | 8 | 12 | 145 |
| src/renderer/utilities/Clipboard.ts | 11 | 8 | 6 | 63 |
| src/renderer/ToolWindows/GdbDisassemblerLineModel.tsx | 11 | 7 | 8 | 92 |
| src/renderer/utilities/useGridColumnState.ts | 24 | 7 | 21 | 132 |
| src/renderer/App.tsx | 18 | 6 | 34 | 400 |
| src/renderer/Dialogs/useConnectionDialogController.ts | 25 | 6 | 28 | 204 |
| src/renderer/ToolWindows/GdbSourceWindowModel.ts | 11 | 6 | 7 | 103 |
| src/renderer/ToolWindows/useGdbCommandController.ts | 32 | 6 | 24 | 204 |
| src/renderer/utilities/DockMenuConnector.ts | 11 | 6 | 11 | 99 |
| src/renderer/Components/DragAndDropList/DragAndDropList.tsx | 28 | 5 | 24 | 236 |
| src/renderer/Components/Toolbar.tsx | 6 | 5 | 22 | 213 |
| src/renderer/Dialogs/ConnectionDialogView.tsx | 5 | 5 | 6 | 161 |
| src/renderer/Dialogs/useConnectionManagerController.ts | 34 | 5 | 45 | 333 |
| src/renderer/mappers/grid-data-mappers.ts | 8 | 5 | 10 | 131 |
| src/renderer/theme-manager.ts | 13 | 5 | 5 | 42 |
| src/renderer/ToolWindows/useSourceEditorSettings.ts | 9 | 5 | 5 | 55 |
| src/renderer/utilities/valueValidation.ts | 6 | 5 | 3 | 36 |
| src/renderer/Components/HexEditor/common.ts | 4 | 4 | 1 | 26 |
| src/renderer/Components/HexEditor/editor-entry-form.tsx | 7 | 4 | 3 | 69 |
| src/renderer/ToolWindows/GdbLocalsWindow.tsx | 7 | 4 | 13 | 164 |
| src/renderer/utilities/CommandHistory.ts | 6 | 4 | 8 | 47 |
| src/renderer/Components/HexEditor/HexEditorCursorMath.ts | 5 | 3 | 4 | 24 |
| src/renderer/Dialogs/ConnectionManagerView.tsx | 3 | 3 | 7 | 215 |
| src/renderer/Errors/ToolWindowErrorBoundary.tsx | 3 | 3 | 4 | 52 |
| src/renderer/Errors/ToolWindowsHostErrorBoundary.tsx | 3 | 3 | 4 | 49 |
| src/renderer/ToolWindows/GdbBreakpointsWindow.tsx | 7 | 3 | 16 | 199 |
| src/renderer/ToolWindows/GdbRegistersWindow.tsx | 4 | 3 | 12 | 144 |
| src/renderer/Components/HexEditor/HexEditor.tsx | 2 | 2 | 6 | 53 |
| src/renderer/Components/HexEditor/view-data.tsx | 3 | 2 | 9 | 67 |
| src/renderer/Components/HexEditor/view-offset.tsx | 2 | 2 | 7 | 60 |
| src/renderer/Components/HexEditor/view-text.tsx | 3 | 2 | 9 | 66 |
| src/renderer/Dialogs/AboutBox.tsx | 2 | 2 | 9 | 171 |
| src/renderer/ToolWindows/GdbThreadsWindow.tsx | 2 | 2 | 9 | 146 |
| src/renderer/ToolWindows/useGdbSourceWindowController.ts | 4 | 2 | 9 | 91 |
| src/renderer/Dialogs/ConnectionDialog.tsx | 1 | 1 | 2 | 57 |
| src/renderer/Dialogs/ConnectionManager.tsx | 1 | 1 | 4 | 54 |
| src/renderer/ToolWindows/GdbCallstackWindow.tsx | 1 | 1 | 8 | 113 |
| src/renderer/ToolWindows/GdbCommandWindow.tsx | 1 | 1 | 3 | 96 |
| src/renderer/ToolWindows/GdbSourceEditorConfig.ts | 1 | 1 | 1 | 129 |
| src/renderer/ToolWindows/GdbSourceWindow.tsx | 1 | 1 | 1 | 44 |
| src/renderer/ToolWindows/GdbSourceWindowView.tsx | 1 | 1 | 1 | 110 |
| src/renderer/ToolWindows/ToolWindowContent.tsx | 1 | 1 | 1 | 9 |
| src/renderer/ToolWindows/useSourceIpcSubscriptions.ts | 1 | 1 | 3 | 17 |
| src/renderer/utilities/app-version-state.ts | 1 | 1 | 1 | 5 |
| src/renderer/utilities/dock-menu-state.ts | 1 | 1 | 1 | 5 |
| src/renderer/Components/HexEditor/hex-editor-types.ts | 1 | 0 | 0 | 1 |
| src/renderer/main.tsx | 1 | 0 | 0 | 16 |
| src/renderer/ToolWindows/toolWindowTitles.ts | 1 | 0 | 0 | 11 |

## preload

- Files analyzed: 1
- Functions analyzed: 29
- Avg file cyclomatic: 1.00
- Functions with CC >= 25 (High): 0
- Functions with CC 15-24 (Medium): 0

| File | File CC | Max Fn CC | Fn Count | SLOC |
| --- | ---: | ---: | ---: | ---: |
| src/preload/preload.ts | 1 | 1 | 29 | 103 |

## Top 25 Hotspot Functions

| Function | File | Line | CC | Level | SLOC |
| --- | --- | ---: | ---: | --- | ---: |
| `parseNotifyAsyncRecord` | src/main/mi-interface/mi-notify-handler.ts | 51 | 61 | High | 186 |
| `parseExecAsyncRecord` | src/main/mi-interface/mi-exec-handler.ts | 32 | 35 | High | 79 |
| `parseResultRecord` | src/main/mi-interface/mi-result-handler.ts | 46 | 23 | Medium | 101 |
| `handleNotifyMain` | src/main/ipc/commands.ts | 175 | 22 | Medium | 115 |
| `mapRegexGroupsToBreakpoint` | src/main/mi-interface/mappers/breakpoint-mapper.ts | 18 | 15 | Medium | 19 |
| `onKeyDown` | src/renderer/Components/HexEditor/MouseKeyboardHandler.ts | 119 | 13 | Low | 35 |
| `parseDisasmTokens` | src/main/mi-interface/gdb-parsers/disasmParser.ts | 20 | 11 | Low | 36 |
| `parseRawOutput` | src/main/mi-interface/mi-output-processor.ts | 146 | 11 | Low | 39 |
| `parseStackFrameFromGroups` | src/main/mi-interface/mi-result-strategies/stack-parsing-helpers.ts | 29 | 10 | Low | 16 |
| `normalizeConnectionForStorage` | src/renderer/Dialogs/connectionManagerModel.ts | 203 | 10 | Low | 23 |
| `validateMemoryParams` | src/renderer/ToolWindows/GdbMemoryWindow.tsx | 136 | 10 | Low | 32 |
| `CaptureLine` | src/main/mi-interface/gdb-parsers/gdb-output-capture.ts | 113 | 9 | Low | 32 |
| `parseThreadFrameFromGroups` | src/main/mi-interface/mi-result-strategies/thread-parsing-helpers.ts | 27 | 9 | Low | 14 |
| `parseStatusAsyncRecord` | src/main/mi-interface/mi-status-handler.ts | 28 | 9 | Low | 28 |
| `resolveKeyAction` | src/renderer/Components/HexEditor/HexEditorKeymap.ts | 23 | 9 | Low | 23 |
| `<anonymous>` | src/renderer/Dialogs/Settings.tsx | 62 | 9 | Low | 23 |
| `onGdbCommand` | src/main/ipc/commands.ts | 82 | 8 | Low | 77 |
| `<anonymous>` | src/main/mi-interface/gdb-parsers/gdb-output-capture.ts | 75 | 8 | Low | 23 |
| `<anonymous>` | src/main/mi-interface/mi-result-strategies/asm-parsing-helpers.ts | 34 | 8 | Low | 19 |
| `restoreEditableElement` | src/renderer/Components/HexEditor/MouseKeyboardHandler.ts | 222 | 8 | Low | 31 |
| `validateDisasmParams` | src/renderer/ToolWindows/GdbDisassemblerWindow.tsx | 179 | 8 | Low | 21 |
| `<anonymous>` | src/renderer/ToolWindows/useSourceBreakpointInteractions.ts | 127 | 8 | Low | 43 |
| `doCutCopyPaste` | src/renderer/utilities/Clipboard.ts | 36 | 8 | Low | 47 |
| `<anonymous>` | src/main/mi-interface/mi-result-strategies/threads-result-strategy.ts | 49 | 7 | Low | 12 |
| `toInstructionPart` | src/renderer/ToolWindows/GdbDisassemblerLineModel.tsx | 33 | 7 | Low | 37 |

