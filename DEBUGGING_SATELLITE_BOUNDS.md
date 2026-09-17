/\*\*

- Debugging Guide: Satellite Window Bounds Deletion Issue
-
- This guide will help us capture the exact sequence of events
- during app shutdown to understand why satellite window bounds
- are being deleted despite the isAppShuttingDown flag logic.
  \*/

// SETUP STEPS:
// 1. The code has already been instrumented with detailed logging
// 2. Build is complete (npm run build succeeded)
// 3. All unit tests pass (tests/vite/satellite-window-shutdown.test.ts - 10/10 pass)

// TO CAPTURE LOGS:

// Option A: Using DevTools Console (Easiest)
// 1. npm run dev
// 2. Right-click app window → "Inspect" or press F12
// 3. Go to Console tab
// 4. Create a satellite window (if not already open)
// 5. Close the main window
// 6. Watch console for detailed logs with timestamps
// 7. Screenshot or copy all [main] and [window-manager] logs
// 8. Paste results into the conversation

// Option B: Using Debug Window (Better Detail)
// 1. npm run dev
// 2. Main window will automatically show Debug Window
// 3. Debug Window shows more detailed logging
// 4. Create satellite, close main, watch logs
// 5. Share logs from debug window

// Option C: Using File Logging (Best for Analysis)
// Add this to src/utilities/logger.ts if not already there:
// 1. Open src/main/utilities/logger.ts
// 2. Modify debugLog to also write to a log file
// 3. After app closes, share the log file

// WHAT TO LOOK FOR IN LOGS:

// Before Shutdown (should see these):
// [main] App quitting, saving state and closing windows
// [main] Hosts before shutdown: main(visible:true), satellite-1(visible:true), ...
// [main] Window bounds before shutdown: main, satellite-1, satellite-2
// [main] isAppShuttingDown flag set to true

// During Window Closure (critical - look at flag value):
// [multi-window] Satellite window closed: satellite-xyz
// [main] Handling satellite window close for: satellite-xyz (shutting down: true|false)
// [main] Window bounds before close: main, satellite-1, satellite-2, ...
// IF shutting down: [main] App is shutting down, PRESERVING window bounds for satellite-xyz
// IF NOT shutting down: [main] App not shutting down, removing window bounds for satellite-xyz

// After Window Closure (should match what we expect):
// [main] Window bounds after close: (list of remaining)
// [window-manager] Stack trace: (shows where removeWindowBounds was called)
// [main] All windows closed, app cleanup complete

// CRITICAL QUESTIONS TO ANSWER:

// Q1: Is the isAppShuttingDown flag being set to true?
// A: Look for "[main] isAppShuttingDown flag set to true" in logs

// Q2: When satellites close, is the flag read as TRUE?
// A: Look for "[main] Handling satellite window close for: satellite-xyz (shutting down: true)"
// If it says "false", then the flag is NOT being set or is being reset

// Q3: Is removeWindowBounds being called even when flag is true?
// A: Look for "[main] App is shutting down, PRESERVING"
// If you see "[window-manager] Removing window bounds" after this, then removeWindowBounds
// is being called from somewhere else we haven't found yet
// Look at the stack trace to find the caller

// Q4: After shutdown, are the bounds actually gone from settings.json?
// A: Open C:\Users\barry\AppData\Roaming\revealgdb\settings.json
// Look for "gdb.gui.windowBoundsByHost"
// If satellite entries are gone, bounds were deleted
// If satellite entries still there, problem is in restore logic

// MOST LIKELY ISSUES:

// Issue 1: Flag not being set
// Fix: Check if app.on("before-quit") is actually being called
// Look for "[main] App quitting, saving state" in logs

// Issue 2: Flag being set but satellites closing BEFORE flag set
// Fix: Satellites might close before before-quit handler runs
// Timeline: closeAllSatelliteWindows() happens AFTER flag is set, should be fine

// Issue 3: removeWindowBounds being called from different code path
// Fix: Stack trace will show us which line calls it
// Search codebase for that line if it's not the expected one

// Issue 4: Workspace restoration broken even if bounds preserved
// Fix: Check if workspace.hosts are being marked invisible
// And if restore logic checks visibility before restoring

// SHARE WITH AGENT:

// 1. Full console logs during app shutdown
// 2. Screenshot of settings.json after close (to see if bounds are deleted)
// 3. Exact error or symptom (windows don't restore, they appear but in wrong position, etc.)
// 4. Any stack traces from the logs

// Then we can identify the exact issue and fix it properly.
