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

# Maintainability Remediation Plan (MI)

## Group Summary

- Build: files 4, LOC 231, weighted MI 36.33
- Render: files 35, LOC 4929, weighted MI 17.52
- Main: files 13, LOC 2250, weighted MI 12.12
- Preload: files 2, LOC 143, weighted MI 31.68

## Ranked Remediation List (Top 20)

- [ ] 1. src/main/mi-interface/mi-interface.ts (MI 0.00, LOC 633, CC 326)
- [ ] 2. src/renderer/Dialogs/ConnectionManager.tsx (MI 0.00, LOC 611, CC 142)
- [ ] 3. src/main/main.ts (MI 5.06, LOC 380, CC 54)
- [ ] 4. src/renderer/ToolWindows/GdbSourceWindow.tsx (MI 6.43, LOC 382, CC 45)
- [ ] 5. src/renderer/Dialogs/ConnectionDialog.tsx (MI 7.71, LOC 343, CC 54)
- [ ] 6. src/main/mi-interface/gdb-state-database/gdbStateDatabase.ts (MI 10.32, LOC 395, CC 21)
- [ ] 7. src/renderer/ToolWindows/GdbDisassemblerWindow.tsx (MI 10.92, LOC 312, CC 38)
- [ ] 8. src/main/mi-interface/gdb-parsers/gdb-locals.ts (MI 10.98, LOC 226, CC 69)
- [ ] 9. src/renderer/ToolWindows/GdbCommandWindow.tsx (MI 12.04, LOC 271, CC 45)
- [ ] 10. src/renderer/Components/HexEditor/MouseKeyboardHandler.ts (MI 14.20, LOC 218, CC 48)
- [ ] 11. src/renderer/Components/DragAndDropList/DragAndDropList.tsx (MI 14.98, LOC 228, CC 37)
- [ ] 12. src/renderer/App.tsx (MI 16.61, LOC 235, CC 19)
- [ ] 13. src/renderer/Dialogs/Settings.tsx (MI 18.28, LOC 234, CC 14)
- [ ] 14. src/renderer/Components/Toolbar.tsx (MI 19.72, LOC 198, CC 20)
- [ ] 15. src/renderer/ToolWindows/GdbBreakpointsWindow.tsx (MI 20.51, LOC 207, CC 9)
- [ ] 16. src/main/menu.ts (MI 22.37, LOC 213, CC 3)
- [ ] 17. src/renderer/ToolWindows/GdbMemoryWindow.tsx (MI 24.43, LOC 129, CC 21)
- [ ] 18. src/renderer/ToolWindows/GdbRegistersWindow.tsx (MI 24.49, LOC 145, CC 11)
- [ ] 19. src/main/mi-interface/gdb-parsers/gdb-output-capture.ts (MI 24.52, LOC 111, CC 36)
- [ ] 20. src/renderer/ToolWindows/GdbThreadsWindow.tsx (MI 24.69, LOC 162, CC 5)

## Sprint Order

### Sprint 1 (Core Architecture, Highest ROI)

- [ ] Refactor src/main/mi-interface/mi-interface.ts into command router, event handlers, and state transition modules
- [ ] Refactor src/renderer/Dialogs/ConnectionManager.tsx by extracting reducer/hooks for validation and persistence
- [ ] Refactor src/main/main.ts by separating bootstrap, IPC registration, and window lifecycle

### Sprint 2 (Secondary Hotspots)

- [ ] Split src/main/mi-interface/gdb-state-database/gdbStateDatabase.ts by domain slices
- [ ] Refactor src/renderer/Dialogs/ConnectionDialog.tsx into form schema and connector-specific panels
- [ ] Refactor src/renderer/ToolWindows/GdbSourceWindow.tsx to separate source rendering and navigation logic
- [ ] Refactor src/renderer/ToolWindows/GdbDisassemblerWindow.tsx to separate line-model transforms from rendering

### Sprint 3 (Parser + Interaction Hardening)

- [ ] Refactor src/main/mi-interface/gdb-parsers/gdb-locals.ts to reduce branching via staged/table-driven parsing
- [ ] Refactor src/renderer/ToolWindows/GdbCommandWindow.tsx by moving command state/history behavior to hooks
- [ ] Refactor src/renderer/Components/HexEditor/MouseKeyboardHandler.ts by separating keymap from cursor/selection math
