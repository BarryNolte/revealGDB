# Maintainability Remediation Plan (MI)

Generated: 2026-03-18T02:35:42.085Z

Target set: lowest maintainability files based on current MI analysis.

## 1. src/renderer/Dialogs/useConnectionManagerController.ts

- Bucket: renderer
- Current MI: 5.24 (Poor)
- Cyclomatic: 64
- SLOC: 458
- Halstead Volume: 10334.15
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 2. src/renderer/ToolWindows/GdbSourceWindow.tsx

- Bucket: renderer
- Current MI: 12.79 (Poor)
- Cyclomatic: 32
- SLOC: 343
- Halstead Volume: 8747.41
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 3. src/main/mi-interface/gdb-parsers/gdb-locals.ts

- Bucket: main
- Current MI: 17.46 (Poor)
- Cyclomatic: 37
- SLOC: 233
- Halstead Volume: 5031.77
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 4. src/renderer/ToolWindows/GdbDisassemblerWindow.tsx

- Bucket: renderer
- Current MI: 18.96 (Poor)
- Cyclomatic: 16
- SLOC: 268
- Halstead Volume: 5031.44
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 5. src/renderer/Components/DragAndDropList/DragAndDropList.tsx

- Bucket: renderer
- Current MI: 19.03 (Poor)
- Cyclomatic: 26
- SLOC: 228
- Halstead Volume: 5226.68
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 6. src/renderer/Components/HexEditor/MouseKeyboardHandler.ts

- Bucket: renderer
- Current MI: 20.33 (Poor)
- Cyclomatic: 32
- SLOC: 195
- Halstead Volume: 4253.47
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 7. src/renderer/ToolWindows/useGdbCommandController.ts

- Bucket: renderer
- Current MI: 20.66 (Poor)
- Cyclomatic: 30
- SLOC: 193
- Halstead Volume: 4310.92
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 8. src/main/mi-interface/gdb-state-database/gdbStateDatabase.ts

- Bucket: main
- Current MI: 20.94 (Poor)
- Cyclomatic: 4
- SLOC: 263
- Halstead Volume: 4738.48
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 9. src/renderer/Dialogs/Settings.tsx

- Bucket: renderer
- Current MI: 21.40 (Poor)
- Cyclomatic: 13
- SLOC: 234
- Halstead Volume: 3933.89
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 10. src/renderer/App.tsx

- Bucket: renderer
- Current MI: 21.51 (Poor)
- Cyclomatic: 6
- SLOC: 235
- Halstead Volume: 5104.52
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## Execution Order

1. Refactor the top 3 lowest-MI files first.
2. Re-run MI report and verify each improved by at least 10 points.
3. Continue with next files until all poor files are in moderate or good range.

