# Satellite Window Restoration Fix - Complete Solution

## Executive Summary

**The Bug**: Satellite windows were not being restored on app restart, even though the fix for window bounds deletion seemed correct.

**Root Cause**: Satellite window bounds were **never being saved to disk in the first place** due to a debounce timer race condition.

**The Fix**: Added explicit flush of all satellite bounds during the `before-quit` handler to ensure bounds are persisted to disk before the app closes.

---

## Detailed Problem Analysis

### What Was Happening

1. User creates a satellite window
2. `setupSatelliteWindowBoundsSaving()` registers event handlers for `move`, `resize`, `maximize`, etc.
3. These handlers use a **500ms debounce timer** to batch updates and avoid excessive disk writes
4. User immediately closes the main window (triggering app shutdown)
5. **The debounce timer never fires** before the app quits
6. `saveWindowBounds()` is never called
7. Satellite bounds are never persisted to `settings.json`
8. On app restart, there are no bounds to restore

### Why We Didn't Notice Earlier

The `isAppShuttingDown` flag logic was actually working perfectly:

- Satellites close during shutdown
- `onSatelliteWindowClosed()` checks the flag
- Bounds are preserved (not deleted)
- BUT there's nothing to preserve because they were never saved!

The fix to check "saved bounds directly" instead of "visibility flag" was also correct:

- But it couldn't find any bounds to restore because they weren't persisted

**Evidence**: The `settings.json` file had zero window bounds saved (no `gdb.gui.windowBoundsByHost` entry at all).

---

## The Solution

### 1. Added `getAllSatelliteWindows()` Helper

**File**: `src/main/multi-window-manager.ts`

```typescript
export function getAllSatelliteWindows(): Array<[string, BrowserWindow]> {
  const result: Array<[string, BrowserWindow]> = [];
  for (const [hostId, window] of satelliteWindows) {
    if (!window.isDestroyed()) {
      result.push([hostId, window]);
    }
  }
  return result;
}
```

This function returns all currently open satellite windows that are not destroyed.

### 2. Explicit Bounds Flush in `before-quit` Handler

**File**: `src/main/main.ts`

Before closing windows, we now explicitly save bounds for ALL open satellites:

```typescript
// Set flag to indicate we're shutting down
isAppShuttingDown = true;

// CRITICAL: Explicitly save all open satellite window bounds before closing them
// This is necessary because the bounds saving uses a 500ms debounce timer
// If the app quits before the debounce fires, bounds would be lost
// We flush all pending bounds saves here to ensure they're persisted
const openSatellites = getAllSatelliteWindows();
for (const [hostId, window] of openSatellites) {
  saveWindowBounds(hostId, window, AppSettings); // Directly persist to disk
}

// Then save main window and close windows as before
```

### 3. Updated Restore Logic

**File**: `src/main/main.ts` lines 172-201

Changed from checking workspace visibility to checking for actual saved bounds:

```typescript
// OLD (broken): Checked visibility flag (which is false after shutdown)
// NEW: Checks for actual saved bounds in settings
const boundsMap = appSettings.getSync("gdb.gui.windowBoundsByHost") as Record<string, unknown>;
const satelliteHostsWithBounds = Object.keys(boundsMap).filter((hostId) => hostId !== MAIN_HOST_ID);
```

---

## Why This Fixes The Issue

**Scenario**: User creates 2 satellite windows, then immediately closes the app

**Before Fix**:

1. Satellites created, debounce timers start
2. App quit before debounce fires
3. `saveWindowBounds()` never called
4. No bounds in settings
5. On restart: nothing to restore

**After Fix**:

1. Satellites created, debounce timers start
2. App quits and enters `before-quit` handler
3. Handler calls `getAllSatelliteWindows()` → gets both satellites
4. Handler loops through and calls `saveWindowBounds()` for each (bypassing debounce)
5. Bounds immediately persisted to disk
6. Satellites closed with `isAppShuttingDown = true` (bounds not deleted)
7. On restart: restore logic finds saved bounds and restores windows

---

## Testing

Three comprehensive test suites validate the fix:

### 1. Shutdown Flag Logic (10 tests)

- `satellite-window-shutdown.test.ts`
- Verifies bounds preservation during shutdown vs direct close

### 2. Restore Logic (7 tests)

- `satellite-window-restore.test.ts`
- Verifies satellites restore based on saved bounds, not visibility

### 3. Bounds Flush on Shutdown (7 tests) - **NEW**

- `satellite-bounds-flush.test.ts`
- Verifies the critical fix: pending debounce saves are flushed to disk
- Tests scenarios like "create satellite and immediately close app"
- Tests mixed scenario: some bounds saved, some pending flush

**Total**: 24/24 tests passing ✅

---

## Files Changed

### Modified

- `src/main/main.ts`:
  - Imported `getAllSatelliteWindows`
  - Updated `restoreSatelliteWindowsIfNeeded()` to check bounds directly
  - Enhanced `before-quit` handler to flush satellite bounds explicitly

- `src/main/multi-window-manager.ts`:
  - Added `getAllSatelliteWindows()` function

### Created

- `tests/vite/satellite-bounds-flush.test.ts`: 7 new tests verifying the flush logic

---

## Verification Steps

To verify this fix works:

1. Run the app: `npm run dev`
2. Create 2-3 satellite windows
3. Immediately close the main window (don't wait for windows to move/resize)
4. Restart the app: `npm run dev`
5. **Expected**: Satellites appear in their previous positions

If you want to verify bounds are being saved:

- Check `C:\Users\barry\AppData\Roaming\revealgdb\settings.json`
- Look for `"gdb.gui.windowBoundsByHost"`
- Should contain entries for each satellite: `{"satellite-1": {...}, "satellite-2": {...}, ...}`

---

## Why This Approach Is Robust

1. **Handles timing issues**: Bypasses debounce by calling `saveWindowBounds()` directly
2. **Preserves pending saves**: If any debounce was pending, it's superseded by the direct call
3. **No race conditions**: Flush happens before windows are closed
4. **Graceful degradation**: Mixed scenario (some saved, some pending) works correctly
5. **Separation of concerns**: Shutdown logic distinct from normal operation

---

## Build Status

✅ Build successful (exit code 0)
✅ All 24 tests passing
✅ No TypeScript errors
✅ No lint warnings
