# Priority Items

- Arbitrary Connections
- Themeing
- Cleanup menus/toolbar
- Convience variables
- Save column widths with layout

# Bugs

# New Features

- -exec-jump for "set next statement"
- Disassembly Window
  - Highlight registers?
  - "Show Disassembly" button working in source window
- Click on breakpoint list and goto source
- Python Window for running python commands
- Values on hover in source
- Thread markers in source (better with multiple source windows)
- Tracepoints - How to insert more automatically
- Set Next Statement from editor
- Better Dock management (multiple source files in a Group)
  - Better source file management
  - Code detection for source viewer

# Project Related

- github workflow working
  - Real Debug/Release builds
  - Product Icon
  - Install for all platforms
    - x64, arm64 (Windows)
    - x64, arm64 (Linux)
    - x64, arm64 (Mac)

# New Settings

- rowHeight for grid toolwindows

~~Connection Model Dialog with status while connecting~~
~~Command Window Clear Button~~
~~Cut/Copy/Paste/drag/drop~~
~~Click on function name for disassembly~~
~~Locals view~~
~~Locals editing~~
~~Autofit columns everywhere~~
~~Column Clip Mode everywhere~~
~~Finish memory view~~
~~Memory editing~~
~~Ability to close window and bring it back~~
~~About box~~
~~Settings page~~
~~Hookup register editing~~
~~DblClick on frame in callstack and set the proper context~~
~~Cleanup toolbar~~

# Documentation

- Quick Start Guide
- Hotkey map
- How to contribute

# Maintainability Remediation (MI)

- [x] MI-1: Refactor src/main/mi-interface/mi-interface.ts (MI 0.00 -> 33.93)
  - Goal: raise MI to >= 60 and reduce cyclomatic complexity from 127 to <= 60.
  - Actions: extract parser/dispatch helpers, apply guard clauses, split orchestration from transforms.
  - Validation: add focused parser tests and rerun `npm run metrics:maintainability`.
  - Result: parsing/dispatch logic moved to mi-output-processor; mi-interface now acts as orchestration facade.
  - Follow-up complete: split mi-output-processor into focused handlers (result/notify/exec) with focused unit tests.
  - Next follow-up: decompose mi-result-handler into smaller strategy handlers to continue pushing MI toward >= 60.

- [ ] MI-2: Refactor src/renderer/Dialogs/useConnectionManagerController.ts (MI 5.24)
  - Goal: raise MI to >= 60 and reduce cyclomatic complexity from 64 to <= 30.
  - Actions: split command handlers into pure reducers/helpers, flatten conditional branches, isolate persistence side effects.
  - Validation: add controller-unit tests and rerun `npm run metrics:maintainability`.

- [ ] MI-3: Refactor src/renderer/ToolWindows/GdbSourceWindow.tsx (MI 12.79)
  - Goal: raise MI to >= 60 and reduce cyclomatic complexity from 32 to <= 16.
  - Actions: extract rendering helpers/components, move state derivation into selector helpers, reduce branch-heavy JSX blocks.
  - Validation: add view-model and render-path tests and rerun `npm run metrics:maintainability`.
  - Progress: extracted source view-model helpers/editor config and moved event/IPC orchestration into a dedicated source-window controller hook with regression tests.
  - Current result: `GdbSourceWindow.tsx` MI improved from 12.79 to 46.91 (CC 32 -> 1); maintainability hotspot shifted to `useGdbSourceWindowController.ts` (MI 22.17, CC 22), so additional decomposition is still needed to reach target.
