# revealGDB

[![CI](https://github.com/BarryNolte/revealGDB/actions/workflows/ci.yml/badge.svg)](https://github.com/BarryNolte/revealGDB/actions/workflows/ci.yml)

Electron + React + TypeScript starter.

Quick start

1. Install deps

```powershell
npm install
```

2. Run in development (starts Vite, tsc watcher, and Electron):

```powershell
npm run dev
```

3. Lint the codebase

```powershell
npm run lint
```

API documentation (TSDoc + TypeDoc)

1. Generate API docs from source files:

```powershell
npm run docs
```

2. Open generated docs:

```powershell
start .\docs\api\index.html
```

Notes:

- TypeDoc reads TSDoc comments from `src/main`, `src/renderer`, `src/common`, and `src/preload`.
- Output is generated to `docs/api`.
- Test harness files and declaration files are excluded via `typedoc.json`.

Startup benchmark

1. Set a baseline (typically on a known-good commit)

```powershell
npm run benchmark:startup:set-baseline
```

2. Run benchmark and compare against baseline/previous commit

```powershell
npm run benchmark:startup
```

3. Optional flags

```powershell
npm run benchmark:startup -- --no-build --samples 3 --timeout 30000
```

Reports are written to reports/startup-benchmark:

- baseline.json
- latest.json
- commits/<commit>.json
- runs/<timestamp>-<commit>.json

The benchmark exits with code 2 when regression thresholds are exceeded.
