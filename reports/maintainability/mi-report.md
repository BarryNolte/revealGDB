# Maintainability Metrics Report

Generated: 2026-05-03T18:34:51.900Z

Test files are excluded by filename and test-only directories.

## main

- Files analyzed: 61
- Average MI: 46.12
- Median MI: 47.62
- Poor/Moderate/Good: 34/27/0

| File | MI | Rating | Cyclomatic | SLOC | Halstead Volume |
| --- | ---: | --- | ---: | ---: | ---: |
| src/main/mi-interface/mi-notify-handler.ts | 14.10 | Poor | 61 | 219 | 6385.03 |
| src/main/mi-interface/gdb-parsers/gdb-locals.ts | 15.48 | Poor | 43 | 255 | 5584.80 |
| src/main/ipc/commands.ts | 16.90 | Poor | 35 | 244 | 5737.79 |
| src/main/mi-interface/gdb-state-database/gdbStateDatabase.ts | 20.76 | Poor | 4 | 266 | 4847.58 |
| src/main/mi-interface/mi-output-processor.ts | 23.50 | Poor | 28 | 168 | 2849.41 |
| src/main/menu.ts | 27.16 | Poor | 3 | 188 | 1820.07 |
| src/main/mi-interface/mi-result-handler.ts | 27.42 | Poor | 23 | 129 | 2233.29 |
| src/main/mi-interface/gdb-state-database/orchestration/StateLifecycleCoordinator.ts | 28.18 | Poor | 4 | 132 | 3742.60 |
| src/main/mi-interface/mi-interface.ts | 29.79 | Poor | 4 | 132 | 2204.37 |
| src/main/mi-interface/mi-exec-handler.ts | 29.81 | Poor | 35 | 93 | 1655.41 |
| src/main/mi-interface/gdb-parsers/gdb-output-capture.ts | 31.71 | Poor | 19 | 99 | 1480.13 |
| src/main/main.ts | 32.47 | Poor | 11 | 97 | 1752.96 |
| src/main/mi-interface/gdb-state-database/types/gdbStateTypes.ts | 35.78 | Poor | 1 | 110 | 620.92 |
| src/main/bootstrap.ts | 36.32 | Poor | 3 | 75 | 1569.64 |
| src/main/window-manager.ts | 37.08 | Poor | 9 | 72 | 1062.88 |
| src/main/mi-interface/gdb-connector/gdb-connector-general.ts | 37.57 | Poor | 5 | 65 | 1485.38 |
| src/main/utilities/wsl-utilities.ts | 37.89 | Poor | 10 | 65 | 1074.00 |
| src/main/gdb-lifecycle.ts | 41.81 | Poor | 2 | 48 | 1083.62 |
| src/main/ipc/queries.ts | 41.93 | Poor | 4 | 47 | 1015.36 |
| src/main/mi-interface/gdb-state-database/stores/ThreadStore.ts | 42.85 | Poor | 4 | 47 | 751.61 |

## renderer

- Files analyzed: 52
- Average MI: 35.53
- Median MI: 33.98
- Poor/Moderate/Good: 45/7/0

| File | MI | Rating | Cyclomatic | SLOC | Halstead Volume |
| --- | ---: | --- | ---: | ---: | ---: |
| src/renderer/App.tsx | 13.32 | Poor | 18 | 400 | 8460.46 |
| src/renderer/Dialogs/useConnectionManagerController.ts | 13.80 | Poor | 34 | 333 | 6299.87 |
| src/renderer/ToolWindows/GdbDisassemblerWindow.tsx | 18.37 | Poor | 16 | 281 | 5281.08 |
| src/renderer/Components/DragAndDropList/DragAndDropList.tsx | 18.42 | Poor | 28 | 236 | 5262.58 |
| src/renderer/ToolWindows/useGdbCommandController.ts | 19.42 | Poor | 32 | 204 | 4981.59 |
| src/renderer/Dialogs/Settings.tsx | 20.42 | Poor | 13 | 249 | 4469.91 |
| src/renderer/Components/HexEditor/MouseKeyboardHandler.ts | 20.63 | Poor | 32 | 189 | 4253.47 |
| src/renderer/Dialogs/useConnectionDialogController.ts | 20.86 | Poor | 25 | 204 | 4241.47 |
| src/renderer/Dialogs/connectionManagerModel.ts | 23.18 | Poor | 32 | 154 | 3481.07 |
| src/renderer/Components/Toolbar.tsx | 23.77 | Poor | 6 | 213 | 3291.85 |
| src/renderer/ToolWindows/GdbBreakpointsWindow.tsx | 24.06 | Poor | 7 | 199 | 3538.08 |
| src/renderer/Dialogs/ConnectionManagerView.tsx | 24.75 | Poor | 3 | 215 | 2649.39 |
| src/renderer/utilities/useGridColumnState.ts | 25.74 | Poor | 24 | 132 | 3451.00 |
| src/renderer/ToolWindows/useSourceBreakpointInteractions.ts | 26.28 | Poor | 15 | 145 | 3208.46 |
| src/renderer/ToolWindows/GdbLocalsWindow.tsx | 26.82 | Poor | 7 | 164 | 2613.93 |
| src/renderer/Dialogs/AboutBox.tsx | 27.37 | Poor | 2 | 171 | 2387.04 |
| src/renderer/ToolWindows/GdbMemoryWindow.tsx | 27.38 | Poor | 15 | 136 | 2729.75 |
| src/renderer/Dialogs/ConnectionDialogView.tsx | 28.05 | Poor | 5 | 161 | 2015.42 |
| src/renderer/ToolWindows/GdbRegistersWindow.tsx | 29.07 | Poor | 4 | 144 | 2129.47 |
| src/renderer/mappers/grid-data-mappers.ts | 29.42 | Poor | 8 | 131 | 2136.14 |

## preload

- Files analyzed: 1
- Average MI: 31.25
- Median MI: 31.25
- Poor/Moderate/Good: 1/0/0

| File | MI | Rating | Cyclomatic | SLOC | Halstead Volume |
| --- | ---: | --- | ---: | ---: | ---: |
| src/preload/preload.ts | 31.25 | Poor | 1 | 103 | 3380.33 |

## Least Maintainable Files (Overall)

| File | Bucket | MI | Rating | Cyclomatic | SLOC | Halstead Volume |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| src/renderer/App.tsx | renderer | 13.32 | Poor | 18 | 400 | 8460.46 |
| src/renderer/Dialogs/useConnectionManagerController.ts | renderer | 13.80 | Poor | 34 | 333 | 6299.87 |
| src/main/mi-interface/mi-notify-handler.ts | main | 14.10 | Poor | 61 | 219 | 6385.03 |
| src/main/mi-interface/gdb-parsers/gdb-locals.ts | main | 15.48 | Poor | 43 | 255 | 5584.80 |
| src/main/ipc/commands.ts | main | 16.90 | Poor | 35 | 244 | 5737.79 |
| src/renderer/ToolWindows/GdbDisassemblerWindow.tsx | renderer | 18.37 | Poor | 16 | 281 | 5281.08 |
| src/renderer/Components/DragAndDropList/DragAndDropList.tsx | renderer | 18.42 | Poor | 28 | 236 | 5262.58 |
| src/renderer/ToolWindows/useGdbCommandController.ts | renderer | 19.42 | Poor | 32 | 204 | 4981.59 |
| src/renderer/Dialogs/Settings.tsx | renderer | 20.42 | Poor | 13 | 249 | 4469.91 |
| src/renderer/Components/HexEditor/MouseKeyboardHandler.ts | renderer | 20.63 | Poor | 32 | 189 | 4253.47 |

