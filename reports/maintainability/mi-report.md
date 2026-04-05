# Maintainability Metrics Report

Generated: 2026-04-05T04:43:13.305Z

Test files are excluded by filename and test-only directories.

## main

- Files analyzed: 59
- Average MI: 46.21
- Median MI: 47.62
- Poor/Moderate/Good: 33/26/0

| File | MI | Rating | Cyclomatic | SLOC | Halstead Volume |
| --- | ---: | --- | ---: | ---: | ---: |
| src/main/mi-interface/mi-notify-handler.ts | 14.30 | Poor | 61 | 216 | 6231.61 |
| src/main/mi-interface/gdb-parsers/gdb-locals.ts | 15.48 | Poor | 43 | 255 | 5584.80 |
| src/main/mi-interface/gdb-state-database/gdbStateDatabase.ts | 20.76 | Poor | 4 | 266 | 4847.58 |
| src/main/ipc/commands.ts | 22.84 | Poor | 25 | 170 | 3902.58 |
| src/main/mi-interface/mi-output-processor.ts | 24.65 | Poor | 24 | 157 | 2873.70 |
| src/main/menu.ts | 25.95 | Poor | 3 | 213 | 1839.64 |
| src/main/mi-interface/mi-result-handler.ts | 27.50 | Poor | 23 | 128 | 2223.84 |
| src/main/mi-interface/mi-exec-handler.ts | 29.81 | Poor | 35 | 93 | 1655.41 |
| src/main/mi-interface/gdb-parsers/gdb-output-capture.ts | 31.71 | Poor | 19 | 99 | 1480.13 |
| src/main/main.ts | 31.96 | Poor | 11 | 99 | 1944.34 |
| src/main/mi-interface/mi-interface.ts | 33.13 | Poor | 4 | 98 | 1859.62 |
| src/main/mi-interface/gdb-state-database/types/gdbStateTypes.ts | 35.78 | Poor | 1 | 110 | 620.92 |
| src/main/mi-interface/gdb-state-database/orchestration/StateLifecycleCoordinator.ts | 36.35 | Poor | 1 | 75 | 1695.72 |
| src/main/bootstrap.ts | 36.40 | Poor | 3 | 74 | 1591.41 |
| src/main/window-manager.ts | 36.47 | Poor | 9 | 74 | 1194.64 |
| src/main/mi-interface/gdb-connector/gdb-connector-general.ts | 37.05 | Poor | 5 | 67 | 1606.57 |
| src/main/utilities/wsl-utilities.ts | 38.46 | Poor | 10 | 63 | 980.54 |
| src/main/ipc/queries.ts | 41.01 | Poor | 4 | 51 | 1066.42 |
| src/main/gdb-lifecycle.ts | 42.56 | Poor | 2 | 46 | 966.57 |
| src/main/mi-interface/gdb-state-database/stores/ThreadStore.ts | 42.85 | Poor | 4 | 47 | 751.61 |

## renderer

- Files analyzed: 51
- Average MI: 35.30
- Median MI: 33.84
- Poor/Moderate/Good: 45/6/0

| File | MI | Rating | Cyclomatic | SLOC | Halstead Volume |
| --- | ---: | --- | ---: | ---: | ---: |
| src/renderer/Dialogs/useConnectionManagerController.ts | 13.57 | Poor | 34 | 337 | 6550.70 |
| src/renderer/App.tsx | 13.89 | Poor | 16 | 391 | 8218.51 |
| src/renderer/ToolWindows/GdbDisassemblerWindow.tsx | 19.02 | Poor | 14 | 271 | 5203.53 |
| src/renderer/Components/DragAndDropList/DragAndDropList.tsx | 19.03 | Poor | 26 | 228 | 5226.68 |
| src/renderer/Dialogs/Settings.tsx | 20.42 | Poor | 13 | 249 | 4469.91 |
| src/renderer/Components/HexEditor/MouseKeyboardHandler.ts | 20.63 | Poor | 32 | 189 | 4253.47 |
| src/renderer/ToolWindows/useGdbCommandController.ts | 20.64 | Poor | 30 | 190 | 4550.29 |
| src/renderer/Dialogs/useConnectionDialogController.ts | 20.69 | Poor | 25 | 206 | 4339.90 |
| src/renderer/Dialogs/connectionManagerModel.ts | 23.18 | Poor | 32 | 154 | 3481.07 |
| src/renderer/Components/Toolbar.tsx | 24.49 | Poor | 6 | 202 | 3062.87 |
| src/renderer/Dialogs/ConnectionManagerView.tsx | 24.75 | Poor | 3 | 215 | 2649.39 |
| src/renderer/utilities/useGridColumnState.ts | 25.74 | Poor | 24 | 132 | 3451.00 |
| src/renderer/ToolWindows/GdbBreakpointsWindow.tsx | 26.40 | Poor | 3 | 174 | 2974.56 |
| src/renderer/ToolWindows/GdbLocalsWindow.tsx | 26.82 | Poor | 7 | 164 | 2613.93 |
| src/renderer/ToolWindows/GdbMemoryWindow.tsx | 27.38 | Poor | 15 | 136 | 2729.75 |
| src/renderer/Dialogs/ConnectionDialogView.tsx | 28.05 | Poor | 5 | 161 | 2015.42 |
| src/renderer/ToolWindows/GdbRegistersWindow.tsx | 29.07 | Poor | 4 | 144 | 2129.47 |
| src/renderer/mappers/grid-data-mappers.ts | 29.42 | Poor | 8 | 131 | 2136.14 |
| src/renderer/ToolWindows/GdbThreadsWindow.tsx | 29.71 | Poor | 2 | 146 | 1806.44 |
| src/renderer/ToolWindows/GdbSourceEditorConfig.ts | 31.54 | Poor | 1 | 129 | 1524.47 |

## preload

- Files analyzed: 1
- Average MI: 31.60
- Median MI: 31.60
- Poor/Moderate/Good: 1/0/0

| File | MI | Rating | Cyclomatic | SLOC | Halstead Volume |
| --- | ---: | --- | ---: | ---: | ---: |
| src/preload/preload.ts | 31.60 | Poor | 1 | 101 | 3199.27 |

## Least Maintainable Files (Overall)

| File | Bucket | MI | Rating | Cyclomatic | SLOC | Halstead Volume |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| src/renderer/Dialogs/useConnectionManagerController.ts | renderer | 13.57 | Poor | 34 | 337 | 6550.70 |
| src/renderer/App.tsx | renderer | 13.89 | Poor | 16 | 391 | 8218.51 |
| src/main/mi-interface/mi-notify-handler.ts | main | 14.30 | Poor | 61 | 216 | 6231.61 |
| src/main/mi-interface/gdb-parsers/gdb-locals.ts | main | 15.48 | Poor | 43 | 255 | 5584.80 |
| src/renderer/ToolWindows/GdbDisassemblerWindow.tsx | renderer | 19.02 | Poor | 14 | 271 | 5203.53 |
| src/renderer/Components/DragAndDropList/DragAndDropList.tsx | renderer | 19.03 | Poor | 26 | 228 | 5226.68 |
| src/renderer/Dialogs/Settings.tsx | renderer | 20.42 | Poor | 13 | 249 | 4469.91 |
| src/renderer/Components/HexEditor/MouseKeyboardHandler.ts | renderer | 20.63 | Poor | 32 | 189 | 4253.47 |
| src/renderer/ToolWindows/useGdbCommandController.ts | renderer | 20.64 | Poor | 30 | 190 | 4550.29 |
| src/renderer/Dialogs/useConnectionDialogController.ts | renderer | 20.69 | Poor | 25 | 206 | 4339.90 |

