# Satellite Docking Implementation Guide for revealGDB

## Overview

Satellite docking enables users to open tool windows (panels) in separate native browser windows, providing a Visual Studio-like multi-monitor debugging experience. This guide documents the implementation using dock-spawn-ts's native satellite window support.

## Architecture

### Key Components

```
┌─────────────────────────────────────────────────────┐
│                  Main Electron Window                │
│  ┌──────────────────────────────────────────────┐  │
│  │         Primary DockManager Layout            │  │
│  │  ┌─────────┐  ┌─────────┐  ┌────────────┐   │  │
│  │  │ Source  │  │ Locals  │  │ Registers  │   │  │
│  │  │ Window  │  │ Window  │  │  Window    │   │  │
│  │  └─────────┘  └─────────┘  └────────────┘   │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │     SatelliteWindowManager (Renderer)         │  │
│  │  - Tracks window lifecycle                    │  │
│  │  - Provides DockManager callbacks             │  │
│  │  - Coordinates with IPC layer                 │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↕ (IPC)
┌─────────────────────────────────────────────────────┐
│              Main Process (Electron)                 │
│  ┌──────────────────────────────────────────────┐  │
│  │    Satellite Window Handler (Main Process)    │  │
│  │  - Persists window state                      │  │
│  │  - Manages window lifecycle                   │  │
│  │  - Handles multi-window coordination          │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │    Workspace Persistence Layer                │  │
│  │  - Saves/loads satellite window state         │  │
│  │  - Persists to electron-settings              │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

         Satellite Browser Windows (optional)
┌────────────────┐  ┌────────────────┐  ┌─────────────┐
│  Breakpoints   │  │ Disassembly    │  │  Memory     │
│  Window        │  │  Window        │  │  Window     │
│                │  │                │  │             │
└────────────────┘  └────────────────┘  └─────────────┘
```

### Data Flow

1. **User Action**: User drags panel to "Open in New Window" or uses context menu
2. **dock-spawn-ts**: Calls DockManager callbacks
3. **SatelliteWindowManager**:
   - Tracks new window
   - Sets up lifecycle handlers
   - Notifies persistence layer
4. **IPC**: Sends satellite window state to main process
5. **Main Process**: Persists state to settings

## Implementation Files

### New Files Created

#### 1. `src/common/satellite-window-types.ts`

Defines types for satellite window state:

- `SatelliteWindowBounds` - position and size
- `SatelliteWindowState` - individual window state
- `SatelliteWindowsState` - container for all windows

#### 2. `src/renderer/utilities/SatelliteWindowManager.ts`

Manages satellite windows in the renderer process:

- `SatelliteWindowManager` class
  - `setupDockManagerCallbacks()` - registers with DockManager
  - `onSatelliteWindowClosing()` - handles window lifecycle
  - `getSatelliteWindowCount()` - query open windows
  - `getWindowInfo()` - returns window information

### Modified Files

#### 1. `src/common/settings-types.ts`

Added satellite windows field:

```typescript
workspace?: {
  // ... existing fields ...
  satelliteWindows?: unknown; // SatelliteWindowsState
};
```

#### 2. `src/common/ipc-contracts.ts`

Added IPC command:

```typescript
NotifyMainCommand:
  | "save-satellite-windows"

NotifyMainPayloadMap:
  "save-satellite-windows": unknown;
```

#### 3. `src/renderer/App.tsx`

- Enabled `dockManager.config.enableBrowserWindows = true`
- Imported and initialized SatelliteWindowManager
- Added global `satelliteWindowManager` instance

## dock-spawn-ts Integration

### Key Features Used

1. **Browser Windows Support**

   ```typescript
   dockManager.config.enableBrowserWindows = true;
   ```

2. **DockManager Callbacks**

   ```typescript
   // Prepare element before moving to new window
   dockManager.prepareElementForNewWindow = (element, params, win) => {
     // Setup styles, resources in new window
     return element;
   };

   // Notified when new window created
   dockManager.notifyOnNewWindow = (panelContainer, win) => {
     // Track window lifecycle
   };
   ```

3. **Context Menu**
   - dock-spawn-ts automatically adds "Open in New Window" button to panel titles
   - User can click to undock panel to satellite window
   - User can drag panel from satellite back to main window

## Implementation Details

### Window Lifecycle

1. **Creation**
   - User clicks "Open in New Window" on panel
   - dock-spawn-ts calls `moveElementToNewBrowserWindow()`
   - New browser window opens via `window.open('about:blank')`
   - Element is moved to new window's DOM
   - Styles and resources are cloned to new window

2. **Tracking**
   - SatelliteWindowManager generates unique window ID
   - Window reference stored in Map
   - Focus/blur event listeners attached

3. **Closure**
   - User closes window
   - `onbeforeunload` handler triggered
   - State persisted via IPC
   - Window reference removed from tracking

### State Persistence

```
User closes satellite window
  ↓
onbeforeunload handler triggered
  ↓
SatelliteWindowManager.onSatelliteWindowClosing()
  ↓
Dispatches "save-dock-layout" event
  ↓
Main window IPC handler sends to main process
  ↓
Main process persists to electron-settings
  ↓
On next startup, windows are restored
```

## Usage for Developers

### To Use Satellite Windows

Users can:

1. **Right-click panel title** → "Open in New Window"
2. **Drag panel out** → Creates floating dialog (can be styled as satellite)
3. **Drag panel back** → Returns to main docking layout

### To Access Window Information

```typescript
// Get count of open satellite windows
const count = satelliteWindowManager.getSatelliteWindowCount();

// Get all windows
const windows = satelliteWindowManager.getSatelliteWindows();

// Get detailed info
const info = satelliteWindowManager.getWindowInfo();
// Returns: [{ id, title, closed }, ...]

// Close all satellite windows
satelliteWindowManager.closeAllSatelliteWindows();
```

## Future Enhancements

### Phase 2 (Recommended)

1. **Main Process Window Management**
   - Add Electron BrowserWindow wrapper for native windows
   - Replace browser window with native Electron windows for better integration
   - Add application menu to satellite windows

2. **Persistence**
   - Save/restore window positions and sizes
   - Auto-restore windows on app launch
   - Per-window layout configuration

3. **Window Coordination**
   - Theme synchronization across windows
   - Debugger state sync (breakpoints, active frame, etc.)
   - Focus management and activation order

### Phase 3 (Advanced)

1. **Multi-Monitor Support**
   - Remember last monitor for each window
   - Position windows on appropriate monitor
   - Prevent windows from moving off-screen

2. **Window Profiles**
   - Save/load named window layouts
   - "Debug" profile vs "Edit" profile
   - Quick layout switching

3. **Advanced Docking**
   - Dock satellite window back to main
   - Detach/reattach docking groups
   - Custom window arrangements

## Testing Checklist

- [ ] Enable satellite windows (enableBrowserWindows = true)
- [ ] Click "Open in New Window" on panel
- [ ] Verify new window opens
- [ ] Verify styles/colors applied correctly
- [ ] Verify panel content renders
- [ ] Drag panel from new window back to main
- [ ] Close satellite window
- [ ] Verify layout persisted
- [ ] Restart app
- [ ] Verify windows restored
- [ ] Test with multiple satellite windows
- [ ] Test theme switching across windows
- [ ] Test debugger state sync across windows

## Troubleshooting

### Satellite Window Won't Open

1. Check browser console for errors
2. Verify `enableBrowserWindows = true` is set
3. Check popup blocker settings
4. Verify DockManager initialized

### Window Content Not Rendering

1. Check that styles were cloned to new window
2. Verify element is properly adopted into new DOM
3. Check browser console in satellite window
4. Look for missing resources/images

### Layout Not Persisting

1. Verify IPC handler registered
2. Check electron-settings writing
3. Look for errors in main process
4. Check that saveState() returns valid JSON

## References

- dock-spawn-ts: https://github.com/node-projects/dock-spawn-ts
- BrowserDialogHelper: moveElementToNewBrowserWindow() source
- DockManager.config.enableBrowserWindows
- Window.open() MDN documentation

## Implementation Status

✅ Core satellite window support enabled

- dock-spawn-ts enableBrowserWindows = true
- SatelliteWindowManager created and integrated
- IPC contracts updated
- Settings types updated

⏳ Pending Implementation

- Main process window handler
- Window state persistence to settings
- Window restoration on app startup
- Integration tests

## Contact & Support

For questions about satellite docking implementation:

- See implementation memory: `/memories/repo/satellite-docking-implementation.md`
- Check dock-spawn-ts documentation
- Review DockManager TypeScript definitions
