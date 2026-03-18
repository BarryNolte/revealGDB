# Maintainability Metrics Report

Generated: 2026-03-18T02:35:42.084Z

Test files are excluded by filename and test-only directories.

## main

- Files analyzed: 49
- Average MI: 45.42
- Median MI: 45.84
- Poor/Moderate/Good: 31/17/1

| File | MI | Rating | Cyclomatic | SLOC | Halstead Volume |
| --- | ---: | --- | ---: | ---: | ---: |
| src/main/mi-interface/gdb-parsers/gdb-locals.ts | 17.46 | Poor | 37 | 233 | 5031.77 |
| src/main/mi-interface/gdb-state-database/gdbStateDatabase.ts | 20.94 | Poor | 4 | 263 | 4738.48 |
| src/main/ipc/commands.ts | 24.76 | Poor | 22 | 149 | 3565.95 |
| src/main/mi-interface/mi-notify-handler.ts | 25.56 | Poor | 29 | 132 | 2940.47 |
| src/main/menu.ts | 25.95 | Poor | 3 | 213 | 1839.64 |
| src/main/mi-interface/mi-output-processor.ts | 27.16 | Poor | 20 | 136 | 2355.82 |
| src/main/mi-interface/gdb-parsers/gdb-output-capture.ts | 29.62 | Poor | 24 | 111 | 1656.04 |
| src/main/mi-interface/mi-result-handler.ts | 30.29 | Poor | 18 | 108 | 1885.31 |
| src/main/mi-interface/mi-result-strategies/regex-parsing-helpers.ts | 31.48 | Poor | 23 | 90 | 1803.91 |
| src/main/mi-interface/mi-exec-handler.ts | 32.91 | Poor | 31 | 76 | 1337.77 |
| src/main/mi-interface/mi-interface.ts | 33.93 | Poor | 4 | 92 | 1741.06 |
| src/main/mi-interface/gdb-connector/gdb-connector-idf-on-wsl.ts | 34.44 | Poor | 9 | 79 | 1895.75 |
| src/main/main.ts | 34.90 | Poor | 9 | 81 | 1511.38 |
| src/main/window-manager.ts | 35.69 | Poor | 10 | 78 | 1253.36 |
| src/main/mi-interface/gdb-state-database/types/gdbStateTypes.ts | 35.89 | Poor | 1 | 109 | 614.83 |
| src/main/mi-interface/gdb-state-database/orchestration/StateLifecycleCoordinator.ts | 36.35 | Poor | 1 | 75 | 1695.72 |
| src/main/bootstrap.ts | 36.40 | Poor | 3 | 74 | 1591.41 |
| src/main/mi-interface/gdb-state-database/stores/ThreadStore.ts | 38.26 | Poor | 4 | 65 | 1238.67 |
| src/main/utilities/wsl-utilities.ts | 38.46 | Poor | 10 | 63 | 980.54 |
| src/main/gdb-lifecycle.ts | 42.68 | Poor | 2 | 46 | 927.96 |

## renderer

- Files analyzed: 37
- Average MI: 32.41
- Median MI: 32.62
- Poor/Moderate/Good: 34/3/0

| File | MI | Rating | Cyclomatic | SLOC | Halstead Volume |
| --- | ---: | --- | ---: | ---: | ---: |
| src/renderer/Dialogs/useConnectionManagerController.ts | 5.24 | Poor | 64 | 458 | 10334.15 |
| src/renderer/ToolWindows/GdbSourceWindow.tsx | 12.79 | Poor | 32 | 343 | 8747.41 |
| src/renderer/ToolWindows/GdbDisassemblerWindow.tsx | 18.96 | Poor | 16 | 268 | 5031.44 |
| src/renderer/Components/DragAndDropList/DragAndDropList.tsx | 19.03 | Poor | 26 | 228 | 5226.68 |
| src/renderer/Components/HexEditor/MouseKeyboardHandler.ts | 20.33 | Poor | 32 | 195 | 4253.47 |
| src/renderer/ToolWindows/useGdbCommandController.ts | 20.66 | Poor | 30 | 193 | 4310.92 |
| src/renderer/Dialogs/Settings.tsx | 21.40 | Poor | 13 | 234 | 3933.89 |
| src/renderer/App.tsx | 21.51 | Poor | 6 | 235 | 5104.52 |
| src/renderer/Dialogs/useConnectionDialogController.ts | 22.53 | Poor | 21 | 189 | 3708.38 |
| src/renderer/ToolWindows/GdbBreakpointsWindow.tsx | 23.45 | Poor | 8 | 207 | 3667.78 |
| src/renderer/Components/Toolbar.tsx | 24.73 | Poor | 6 | 202 | 2832.11 |
| src/renderer/Dialogs/ConnectionManagerView.tsx | 24.75 | Poor | 3 | 215 | 2649.39 |
| src/renderer/ToolWindows/GdbMemoryWindow.tsx | 27.87 | Poor | 16 | 129 | 2619.87 |
| src/renderer/ToolWindows/GdbThreadsWindow.tsx | 28.18 | Poor | 2 | 162 | 2162.89 |
| src/renderer/Dialogs/ConnectionDialogView.tsx | 28.24 | Poor | 5 | 159 | 1970.15 |
| src/renderer/ToolWindows/GdbCallstackWindow.tsx | 28.40 | Poor | 2 | 157 | 2219.07 |
| src/renderer/ToolWindows/GdbRegistersWindow.tsx | 28.81 | Poor | 5 | 145 | 2172.00 |
| src/renderer/ToolWindows/GdbLocalsWindow.tsx | 30.10 | Poor | 5 | 134 | 1822.00 |
| src/renderer/utilities/DockMenuConnector.ts | 32.62 | Poor | 10 | 94 | 1923.33 |
| src/renderer/Dialogs/AboutBox.tsx | 33.67 | Poor | 2 | 101 | 1549.13 |

## preload

- Files analyzed: 1
- Average MI: 30.21
- Median MI: 30.21
- Poor/Moderate/Good: 1/0/0

| File | MI | Rating | Cyclomatic | SLOC | Halstead Volume |
| --- | ---: | --- | ---: | ---: | ---: |
| src/preload/preload.ts | 30.21 | Poor | 1 | 118 | 3116.41 |

## Least Maintainable Files (Overall)

| File | Bucket | MI | Rating | Cyclomatic | SLOC | Halstead Volume |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| src/renderer/Dialogs/useConnectionManagerController.ts | renderer | 5.24 | Poor | 64 | 458 | 10334.15 |
| src/renderer/ToolWindows/GdbSourceWindow.tsx | renderer | 12.79 | Poor | 32 | 343 | 8747.41 |
| src/main/mi-interface/gdb-parsers/gdb-locals.ts | main | 17.46 | Poor | 37 | 233 | 5031.77 |
| src/renderer/ToolWindows/GdbDisassemblerWindow.tsx | renderer | 18.96 | Poor | 16 | 268 | 5031.44 |
| src/renderer/Components/DragAndDropList/DragAndDropList.tsx | renderer | 19.03 | Poor | 26 | 228 | 5226.68 |
| src/renderer/Components/HexEditor/MouseKeyboardHandler.ts | renderer | 20.33 | Poor | 32 | 195 | 4253.47 |
| src/renderer/ToolWindows/useGdbCommandController.ts | renderer | 20.66 | Poor | 30 | 193 | 4310.92 |
| src/main/mi-interface/gdb-state-database/gdbStateDatabase.ts | main | 20.94 | Poor | 4 | 263 | 4738.48 |
| src/renderer/Dialogs/Settings.tsx | renderer | 21.40 | Poor | 13 | 234 | 3933.89 |
| src/renderer/App.tsx | renderer | 21.51 | Poor | 6 | 235 | 5104.52 |

