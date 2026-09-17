# Multi-Window Workspace Implementation Guide

## Overview

This document provides comprehensive instructions for implementing a multi-window, multi-panel workspace system in an existing Electron application. The system allows users to create arbitrary window and panel layouts through the UI, with full drag-and-drop support, floating windows, and state persistence.

## Core Concepts

### Workspace
A workspace is the top-level container that represents the entire application state at a point in time. It contains:
- Multiple BrowserWindow instances (main window + floating windows)
- A collection of dockable windows organized into groups
- Layout configuration for each window
- Persistent state that survives app restarts

### Window (BrowserWindow)
An OS-level window that can host multiple dockable panels. The application may have:
- **Main Window**: The primary application window
- **Floating Windows**: Additional windows created when users drag panels outside the main window bounds

### Dockable Window
A logical container within a BrowserWindow that represents a single panel/pane. Properties:
- `id`: Unique identifier
- `type`: SourceFileWindow | ToolWindow (determines default group)
- `title`: Display name
- `content`: The rendered component or data
- `group`: Which group it belongs to (documents, toolwindows, custom)
- `isActive`: Whether this window has focus
- `windowState`: Opaque per-window state persisted by main process
- `icon`: Optional icon identifier

### Layout
The arrangement of dockable windows within a BrowserWindow:
- **Pane**: A resizable container holding a single dockable window
- **Splitter**: A resize handle between adjacent panes
- **Direction**: Horizontal or vertical split orientation

### Group
Logical collections of dockable windows. Default groups:
- `documents`: Source files, documents (type: SourceFileWindow)
- `toolwindows`: Panels, properties, output (type: ToolWindow)

Behavior:
- Windows belong to groups by default based on type
- Hidden windows restore to their last known group when shown
- New windows default to `documents` group unless specified
- Groups enable workspace-level organization and filtering

## Architecture Layers

### 1. Main Process (`src/main/`)
**Responsibility**: Own authoritative state; manage window lifecycle; persist state

**Key Components**:

- **WorkspaceService**: Central domain logic
  - Manages workspace state (windows, layout, groups)
  - Handles all mutations (add, remove, move, resize, show, hide)
  - Emits updates to renderer on state changes
  - Persists state to disk via ElectronStateStore
  - Coordinates window creation/destruction with Electron

- **ElectronStateStore**: Persistence layer
  - Reads/writes workspace state to disk
  - Provides data retrieval and migration hooks
  - Survives app crashes/restarts

- **IPC Handler Wiring**: Main entry point for renderer actions
  - Maps renderer requests to WorkspaceService methods
  - Returns updated workspace state to renderer
  - Enforces command-query separation (mutations return state)

### 2. Preload Bridge (`src/preload/`)
**Responsibility**: Expose safe, typed API to renderer

**Key Component**:

- **Preload Module** (`window.dockManager`)
  - Provides typed method signatures matching WorkspaceService
  - Each method maps to a specific IPC channel
  - Enforces types at compile time (TypeScript)
  - Prevents renderer from accessing unauthorized IPC channels

### 3. Shared Contracts (`src/shared/`)
**Responsibility**: Centralize types and channel constants

**Key Files**:

- **types.ts**: Domain types
  - `Workspace`: Top-level state shape
  - `DockableWindow`: Panel metadata
  - `WindowLayout`: Layout tree for a BrowserWindow
  - `WindowGroup`: Group configuration
  
- **ipc.ts**: IPC channel constants
  - One constant per action (e.g., `IPC.WINDOW_ADD`, `IPC.WINDOW_MOVE`)
  - Used by both main and preload layers

### 4. Renderer (`src/renderer/`)
**Responsibility**: Pure view layer; render UI; invoke actions; never mutate local workspace state

**Key Components**:

- **DockWorkspace**: Root component
  - Receives workspace state via props
  - Renders active BrowserWindow content
  - Orchestrates multi-window layout
  
- **Dockable Components** (SourceFileWindow, ToolWindow)
  - Receive window props (title, content, etc.)
  - Provide drag-drop handles
  - Invoke actions via preload API callbacks
  - Never mutate their own data

## Essential Features

### 1. Window Management
- **Add**: Create new dockable window in a group/position
- **Remove**: Close dockable window
- **Show/Hide**: Toggle visibility (restore to last group)
- **Float**: Move window to new BrowserWindow
- **Merge**: Move window between groups within same window

### 2. Layout & Resizing
- **Split Pane**: Divide existing pane horizontally or vertically
- **Resize Pane**: Adjust pane width/height via splitter drag
- **Maintain Proportions**: Preserve relative pane sizes on window resize
- **Collapse Pane**: Hide pane while preserving layout (optional)

### 3. Drag & Drop
- **Reorder Tabs**: Move tab within same pane
- **Move Between Panes**: Drag window header to move to different pane
- **Float Window**: Drag window header outside BrowserWindow bounds → creates new window
- **Dock Window**: Drag floating window header over docking target in main window
- **Visual Feedback**: Highlight drop zones during drag

### 4. State Persistence
- **Automatic Save**: Workspace state persists after every mutation
- **App Restart**: Workspace layout/windows restore exactly as left
- **Per-Window State**: Individual windows can store opaque state in `windowState` property
- **Versioning**: Support state migrations between app versions

### 5. Multi-Display Support
- **Window Bounds**: Each BrowserWindow records position/size
- **Monitor Detection**: Detect if saved bounds are on disconnected displays
- **Fallback Positioning**: Reset bounds if necessary
- **Floating Windows**: Support arbitrary number of floating windows across displays

### 6. Accessibility & UX
- **Keyboard Navigation**: Tab through panes, Alt+key to activate panels
- **Context Menus**: Right-click on title bar for window actions
- **Animations**: Smooth transitions for drag/resize/show/hide
- **Responsive**: Layout adapts to window resize

## Workflow: Adding a New Feature

### 1. Define Type Contract
In `src/shared/types.ts`:
```typescript
export interface DockableWindow {
  id: string;
  type: 'SourceFileWindow' | 'ToolWindow';
  title: string;
  // ... existing fields
  // Add new field(s) here
  newFeature?: string;
}
```

### 2. Define IPC Channel
In `src/shared/ipc.ts`:
```typescript
export const IPC = {
  // ... existing channels
  WINDOW_NEW_ACTION: 'dock:window:newAction',
} as const;
```

### 3. Implement Main Logic
In `src/main/workspaceService.ts`:
```typescript
export class WorkspaceService {
  // ...
  newWindowAction(windowId: string, param: string): Workspace {
    // 1. Validate input
    const window = this.workspace.windows.find(w => w.id === windowId);
    if (!window) throw new Error('Window not found');
    
    // 2. Mutate workspace
    window.newFeature = param;
    this.workspace.version++;
    
    // 3. Persist
    this.stateStore.save(this.workspace);
    
    // 4. Emit update
    this.emit('workspaceUpdated', this.workspace);
    
    // 5. Return updated state
    return this.workspace;
  }
}
```

### 4. Wire IPC Handler
In `src/main/ipc.ts`:
```typescript
ipcMain.handle(IPC.WINDOW_NEW_ACTION, (event, windowId: string, param: string) => {
  return this.workspaceService.newWindowAction(windowId, param);
});
```

### 5. Expose Preload API
In `src/preload/preload.ts`:
```typescript
window.dockManager = {
  // ...
  newWindowAction: (windowId: string, param: string) => 
    ipcRenderer.invoke(IPC.WINDOW_NEW_ACTION, windowId, param),
};
```

### 6. Use in Renderer
In `src/renderer/components/*.tsx`:
```typescript
const handleNewAction = async (windowId: string) => {
  const updated = await window.dockManager.newWindowAction(windowId, 'value');
  setWorkspace(updated); // Re-render with new state
};
```

## Key Conventions

### State Management
- **Single Source of Truth**: Main process (`WorkspaceService`) owns authoritative state
- **Renderer as View**: Renderer receives state via props and invokes actions via preload API
- **No Local Mutations**: Renderer never mutates its own copy of workspace state
- **Atomic Actions**: Mutations should be self-contained, not requiring multiple IPC calls

### Window Group Organization
- **Type-Based Default**: New windows default to group based on type (SourceFileWindow → documents)
- **Hidden Window Restoration**: When shown, windows restore to last known group
- **Stable Group Names**: Use meaningful, stable names (documents, toolwindows, custom-panels)
- **Workspace-Level Queries**: Main process queries windows by group for workspace-wide operations (e.g., "show all documents")

### Dockable Component Design
- **Stateless**: Components should be as stateless as possible
- **Props-Driven**: All dynamic content via props
- **Callback-Based**: Actions via prop callbacks that invoke preload API
- **No Internal State Mutations**: Component state for UI only (e.g., hover state), not workspace state

### IPC Channel Design
- **Granular & Action-Specific**: One channel per user action (not generic "update workspace")
- **Clear Naming**: `dock:entity:action` pattern (e.g., `dock:window:move`, `dock:pane:resize`)
- **Return Updated State**: Handlers always return the new workspace state
- **Error Handling**: Throw errors with descriptive messages; renderer handles via try-catch

### Persistence Strategy
- **After Every Mutation**: Save workspace state immediately after any change
- **Debounce Rapid Changes**: If needed, batch layout resize events
- **Version the State**: Include version number for future migrations
- **Recovery**: Handle corrupted state gracefully (reset to default)

## Implementation Steps

### Phase 1: Foundation
1. Create `WorkspaceService` class with basic state structure
2. Create `ElectronStateStore` for persistence
3. Define core types in `src/shared/types.ts` and `src/shared/ipc.ts`
4. Set up IPC handler wiring in `src/main/ipc.ts`
5. Create preload API in `src/preload/preload.ts`

### Phase 2: Basic Docking
1. Implement window add/remove mutations
2. Implement layout rendering in renderer
3. Test add/remove/show/hide operations
4. Verify state persists across restarts

### Phase 3: Drag & Drop
1. Implement `moveWindow(id, targetPane)` action
2. Add drag-drop UI to dockable components
3. Implement visual feedback (drop zones, animations)
4. Test reordering within and between panes

### Phase 4: Floating Windows
1. Implement `floatWindow(id)` action (creates new BrowserWindow)
2. Track floating windows in workspace state
3. Implement `dockWindow(id, targetPane)` action
4. Handle window bounds and multi-monitor scenarios

### Phase 5: Advanced Layout
1. Implement `splitPane(paneId, direction)` action
2. Implement pane resize via splitter drag
3. Test complex nested layouts
4. Optimize performance (virtual scrolling if needed)

### Phase 6: State Persistence & Recovery
1. Save workspace state after each mutation
2. Load and restore on app startup
3. Handle missing files, corrupted state, monitor disconnections
4. Add migration logic for state format changes

### Phase 7: Polish
1. Add keyboard navigation and shortcuts
2. Implement context menus
3. Add animations and transitions
4. Comprehensive error handling and edge cases

## Testing Strategy

### Unit Tests
- **WorkspaceService**: Test mutations in isolation
  - Add/remove windows
  - Move windows between panes/groups
  - Float/dock operations
  - Group filtering and queries

### Integration Tests (Playwright)
- **Multi-window workflows**: Open multiple windows, verify layout
- **Drag & drop**: Test dragging panels to different panes, floating
- **State persistence**: Close and reopen app, verify layout restored
- **Edge cases**: Monitor disconnection, window bounds off-screen, corrupted state

### Manual Testing Checklist
- [ ] Add/remove panels via UI
- [ ] Drag panels between panes
- [ ] Float panels to new windows
- [ ] Dock floating panels back
- [ ] Resize panes via splitter
- [ ] Show/hide panels (restore to correct group)
- [ ] Close and reopen app (layout persists)
- [ ] Open app on different monitor
- [ ] Rapid operations (stress test)

## Common Pitfalls & Solutions

### Desync Between Main and Renderer
**Problem**: Renderer state diverges from main state (e.g., window moved but renderer not updated)

**Solution**: 
- Never mutate workspace state in renderer
- Always invoke preload API to mutate state
- Renderer re-renders based on updated state from main
- Subscribe to `ipcRenderer.on('workspaceUpdated')` for state changes

### Duplicate Windows After Crash
**Problem**: App crashes mid-transaction; windows duplicated on restart

**Solution**:
- Save state only after mutation completes successfully
- Use atomic operations (all-or-nothing)
- On startup, validate saved state (remove orphaned windows)
- Add recovery logic for corrupted state

### Layout Breaks on Window Resize
**Problem**: Pane proportions not maintained when user resizes BrowserWindow

**Solution**:
- Store pane sizes as proportions (0.0 - 1.0), not pixel values
- On BrowserWindow resize, recalculate pixel sizes from proportions
- Reconstruct layout tree efficiently

### Floating Window Loses Focus
**Problem**: Floating window created but main window steals focus

**Solution**:
- Use Electron's `win.show()` with `focus: true`
- Set `win.focus()` after creation
- Ensure floating window's IPC handlers route to same WorkspaceService

## API Reference

### WorkspaceService Methods

```typescript
// Create new workspace
createWorkspace(): Workspace

// Window operations
addWindow(type: string, title: string, group?: string): Workspace
removeWindow(windowId: string): Workspace
showWindow(windowId: string): Workspace
hideWindow(windowId: string): Workspace

// Layout operations
moveWindow(windowId: string, targetPaneId: string, position?: 'left'|'right'|'top'|'bottom'): Workspace
floatWindow(windowId: string, bounds?: Rectangle): Workspace
dockWindow(windowId: string, targetPaneId: string): Workspace
splitPane(paneId: string, direction: 'horizontal'|'vertical'): Workspace
resizePane(paneId: string, newSize: number): Workspace

// Group operations
getWindowsByGroup(group: string): DockableWindow[]
renameGroup(oldName: string, newName: string): Workspace

// Persistence
save(): void
load(): Workspace
```

### Preload API
Same methods as WorkspaceService, accessed via `window.dockManager.*()`, returns Promise<Workspace>

## References
- Electron Documentation: Multi-Window Applications
- React Best Practices: Controlled Components, Props Drilling
- TypeScript: Strict Types for IPC Safety
