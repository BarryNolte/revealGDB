# Maintainability Remediation Plan (MI)

Generated: 2026-04-05T04:43:13.305Z

Target set: lowest maintainability files based on current MI analysis.

## 1. src/renderer/Dialogs/useConnectionManagerController.ts

- Bucket: renderer
- Current MI: 13.57 (Poor)
- Cyclomatic: 34
- SLOC: 337
- Halstead Volume: 6550.70
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 2. src/renderer/App.tsx

- Bucket: renderer
- Current MI: 13.89 (Poor)
- Cyclomatic: 16
- SLOC: 391
- Halstead Volume: 8218.51
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 3. src/main/mi-interface/mi-notify-handler.ts

- Bucket: main
- Current MI: 14.30 (Poor)
- Cyclomatic: 61
- SLOC: 216
- Halstead Volume: 6231.61
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 4. src/main/mi-interface/gdb-parsers/gdb-locals.ts

- Bucket: main
- Current MI: 15.48 (Poor)
- Cyclomatic: 43
- SLOC: 255
- Halstead Volume: 5584.80
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 5. src/renderer/ToolWindows/GdbDisassemblerWindow.tsx

- Bucket: renderer
- Current MI: 19.02 (Poor)
- Cyclomatic: 14
- SLOC: 271
- Halstead Volume: 5203.53
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 6. src/renderer/Components/DragAndDropList/DragAndDropList.tsx

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

## 7. src/renderer/Dialogs/Settings.tsx

- Bucket: renderer
- Current MI: 20.42 (Poor)
- Cyclomatic: 13
- SLOC: 249
- Halstead Volume: 4469.91
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 8. src/renderer/Components/HexEditor/MouseKeyboardHandler.ts

- Bucket: renderer
- Current MI: 20.63 (Poor)
- Cyclomatic: 32
- SLOC: 189
- Halstead Volume: 4253.47
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 9. src/renderer/ToolWindows/useGdbCommandController.ts

- Bucket: renderer
- Current MI: 20.64 (Poor)
- Cyclomatic: 30
- SLOC: 190
- Halstead Volume: 4550.29
- Primary drivers: high branch density, function length, and expression volume.
- Remediation actions:
  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).
  2. Replace nested conditionals with guard clauses and early returns.
  3. Split IO/orchestration code from transformation/parsing logic.
  4. Introduce typed data mappers to reduce ad-hoc object mutation.
  5. Add focused tests around extracted helpers before and after refactor.
- MI target after remediation: >= 60

## 10. src/renderer/Dialogs/useConnectionDialogController.ts

- Bucket: renderer
- Current MI: 20.69 (Poor)
- Cyclomatic: 25
- SLOC: 206
- Halstead Volume: 4339.90
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

