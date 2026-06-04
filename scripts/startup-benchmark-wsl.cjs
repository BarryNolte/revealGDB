#!/usr/bin/env node
const { spawn, execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_MILESTONES = [
  "app.ready",
  "main-window-created",
  "main-window-load-started",
  "gdb-interface-created",
  "main-window-ready-to-show",
  "main-window-shown",
];

const REGRESSION_KEYS = [
  "main-window-created",
  "main-window-ready-to-show",
  "main-window-shown",
];

const os = require("node:os");
const args = parseArgs(process.argv.slice(2));

const workspaceRoot = process.cwd();
const reportsDir = path.join(workspaceRoot, "reports", "startup-benchmark");
const commitsDir = path.join(reportsDir, "commits");
const runsDir = path.join(reportsDir, "runs");
const latestFile = path.join(reportsDir, "latest.json");
const baselineFile = path.join(reportsDir, "baseline.json");

const maxRegressionMs = Number(args["max-regression-ms"] ?? 200);
const maxRegressionPct = Number(args["max-regression-pct"] ?? 10);
const timeoutMs = Number(args.timeout ?? 30000);
const samples = Math.max(1, Number(args.samples ?? 5));
const shouldBuild = !args["no-build"];
const setBaseline = Boolean(args["set-baseline"]);

async function step(label, fn) {
  process.stdout.write(`  ${label}... `);
  await fn();
  process.stdout.write("done\n");
}

async function main() {
  ensureDirs([reportsDir, commitsDir, runsDir]);

  const commit = gitOrFallback("rev-parse HEAD", "unknown");
  const shortCommit = commit === "unknown" ? "unknown" : commit.slice(0, 8);
  const parentCommit = gitOrFallback("rev-parse HEAD^", null);

  console.log("Startup benchmark");

  if (shouldBuild) {
    process.stdout.write("  Build (benchmark variant)... ");
    await runCommand("npm run vite-build:benchmark", {
      stdio: "ignore",
      shell: true,
      cwd: workspaceRoot,
    });
    process.stdout.write("done\n");
  }

  const sampleResults = [];
  for (let i = 0; i < samples; i += 1) {
    await cleanupElectron();
    await step(
      `Sample ${i + 1}${samples > 1 ? `/${samples}` : ""}`,
      async () => {
        const result = await captureStartupMilestones(timeoutMs);
        sampleResults.push(result);
      },
    );
  }

  const aggregate = aggregateSamples(sampleResults);
  const timestamp = new Date().toISOString();
  const runId = `${timestamp.replace(/[:.]/g, "-")}-${shortCommit}`;

  const report = {
    schemaVersion: 1,
    timestamp,
    commit,
    shortCommit,
    parentCommit,
    sampleCount: samples,
    timeoutMs,
    thresholds: { maxRegressionMs, maxRegressionPct },
    metrics: aggregate,
    samples: sampleResults,
  };

  // Environment metadata (WSL runner). Include host hint if detectable.
  try {
    const envName = "wsl";
    let host = null;
    try {
      const procVersion = fs.readFileSync('/proc/version', 'utf8');
      if (procVersion.includes('Microsoft')) host = 'windows';
    } catch (e) {}

    report.environment = {
      name: envName,
      host: host,
      platform: process.platform,
      arch: process.arch,
      cpuModel: os.cpus()[0]?.model ?? null,
      numCpus: os.cpus().length,
      hostname: os.hostname(),
    };
  } catch (e) {
    // ignore
  }

  const runFile = path.join(runsDir, `${runId}.json`);
  const commitFile = path.join(commitsDir, `${commit}.json`);
  writeJson(runFile, report);
  writeJson(commitFile, report);
  writeJson(latestFile, report);

  if (setBaseline) {
    writeJson(baselineFile, report);
    console.log("");
    console.log(`  Baseline updated: ${relativePath(baselineFile)}`);
    printMilestones(report);
    console.log("Done.");
    return;
  }

  const comparison = loadComparison(parentCommit);
  const regression = comparison ? compareReports(report, comparison) : null;

  console.log("");
  console.log(`  ${relativePath(runFile)}`);
  console.log(`  ${relativePath(latestFile)}`);
  printMilestones(report);
  printComparison(regression);
  console.log("Done.");
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    i += 1;
  }
  return parsed;
}

function ensureDirs(dirs) {
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function gitOrFallback(command, fallback) {
  try {
    return execSync(`git ${command}`, {
      cwd: workspaceRoot,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

function runCommand(command, options) {
  const result = spawn(command, options);
  return new Promise((resolve, reject) => {
    result.on("error", reject);
    result.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} failed with exit code ${code}`));
      }
    });
  });
}

function cleanupElectron() {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      const taskkill = spawn("taskkill /IM electron.exe /T /F", {
        cwd: workspaceRoot,
        stdio: "ignore",
        shell: true,
      });
      taskkill.on("exit", () => resolve());
      taskkill.on("error", () => resolve());
      return;
    }

    // POSIX: try to pkill any electron processes
    try {
      execSync("pkill -f electron || true", { stdio: "ignore" });
    } catch {}
    resolve();
  });
}

function captureStartupMilestones(timeout) {
  return new Promise((resolve, reject) => {
    const milestones = {};
    const rawLines = [];
    let settled = false;

    const child = spawn("npm start", {
      cwd: workspaceRoot,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      detached: process.platform !== "win32",
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      killProcessTree(child.pid);
      reject(
        new Error(
          `Timed out after ${timeout}ms waiting for startup milestones. Captured: ${Object.keys(
            milestones,
          ).join(", ")}`,
        ),
      );
    }, timeout);

    const onData = (chunk) => {
      const text = chunk.toString();
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        rawLines.push(line);
        const match = line.match(/^\[startup\]\s+([^:]+):\s+(\d+)ms$/);
        if (!match) continue;
        milestones[match[1]] = Number(match[2]);
      }

      if (hasAllMilestones(milestones, REQUIRED_MILESTONES)) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        killProcessTree(child.pid);
        resolve({ milestones, rawLines });
      }
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on("exit", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!hasAllMilestones(milestones, REQUIRED_MILESTONES)) {
        reject(new Error("Application exited before all required startup milestones were captured."));
        return;
      }
      resolve({ milestones, rawLines });
    });
  });
}

function hasAllMilestones(milestones, required) {
  return required.every((key) => Number.isFinite(milestones[key]));
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${String(pid)} /T /F`, { stdio: "ignore" });
      execSync("taskkill /IM electron.exe /T /F", { stdio: "ignore" });
    } else {
      // Attempt to kill the process group (negative pid) then fallback to pkill
      try {
        execSync(`kill -TERM -${String(pid)}`, { stdio: "ignore" });
      } catch {}
      try {
        execSync("pkill -f electron", { stdio: "ignore" });
      } catch {}
      try {
        execSync(`kill -9 ${String(pid)}`, { stdio: "ignore" });
      } catch {}
    }
  } catch {}
}

function aggregateSamples(sampleResults) {
  const valuesByKey = new Map();

  for (const sample of sampleResults) {
    for (const [key, value] of Object.entries(sample.milestones)) {
      if (!valuesByKey.has(key)) valuesByKey.set(key, []);
      valuesByKey.get(key).push(value);
    }
  }

  const aggregate = {};
  for (const key of REQUIRED_MILESTONES) {
    const values = valuesByKey.get(key) || [];
    values.sort((a, b) => a - b);
    const median = values.length === 0 ? null : values[Math.floor(values.length / 2)];
    aggregate[key] = {
      medianMs: median,
      minMs: values.length ? values[0] : null,
      maxMs: values.length ? values[values.length - 1] : null,
      samples: values,
    };
  }

  return aggregate;
}

function loadComparison(parentCommit) {
  if (fs.existsSync(baselineFile)) {
    return readJson(baselineFile);
  }

  if (parentCommit) {
    const parentFile = path.join(commitsDir, `${parentCommit}.json`);
    if (fs.existsSync(parentFile)) {
      return readJson(parentFile);
    }
  }

  if (fs.existsSync(latestFile)) {
    const latest = readJson(latestFile);
    if (latest && latest.commit !== gitOrFallback("rev-parse HEAD", "unknown")) {
      return latest;
    }
  }

  return null;
}

function compareReports(current, baseline) {
  const diffs = [];
  let hasRegression = false;

  for (const key of REGRESSION_KEYS) {
    const currentMs = current.metrics?.[key]?.medianMs;
    const baselineMs = baseline.metrics?.[key]?.medianMs;
    if (!Number.isFinite(currentMs) || !Number.isFinite(baselineMs)) continue;

    const deltaMs = currentMs - baselineMs;
    const deltaPct = baselineMs === 0 ? 0 : (deltaMs / baselineMs) * 100;
    const isRegression = deltaMs > maxRegressionMs && deltaPct > maxRegressionPct;
    if (isRegression) hasRegression = true;

    diffs.push({
      key,
      baselineMs,
      currentMs,
      deltaMs,
      deltaPct,
      isRegression,
    });
  }

  return {
    baselineCommit: baseline.commit,
    hasRegression,
    diffs,
  };
}

function printMilestones(report) {
  console.log("");
  console.log(`  commit ${report.shortCommit}  ·  ${report.sampleCount} sample${report.sampleCount !== 1 ? "s" : ""}`);
  for (const key of REQUIRED_MILESTONES) {
    const metric = report.metrics[key];
    const shortKey = key.replace("main-window-", "");
    console.log(`    ${shortKey.padEnd(24)} ${String(metric.medianMs).padStart(6)} ms`);
  }
}

function printComparison(regression) {
  if (!regression) {
    console.log("  No baseline found — run with --set-baseline to establish one.");
    return;
  }
  console.log("");
  const baseShort = String(regression.baselineCommit).slice(0, 8);
  console.log(`  vs baseline ${baseShort}`);
  for (const diff of regression.diffs) {
    const flag = diff.isRegression ? " [REGRESSION]" : "";
    const shortKey = diff.key.replace("main-window-", "");
    console.log(
      `    ${shortKey.padEnd(24)} ${formatDelta(diff.deltaMs)} ms (${formatDelta(diff.deltaPct)}%)${flag}`,
    );
  }
  if (regression.hasRegression) {
    console.log("");
    console.log(`  Regression detected. Thresholds: +${maxRegressionMs}ms and +${maxRegressionPct}% (both must exceed).`);
  }
}

function formatDelta(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function relativePath(absolutePath) {
  return path.relative(workspaceRoot, absolutePath).replace(/\\/g, "/");
}

main().catch((error) => {
  // Ensure Electron is dead even if the benchmark threw (e.g. on timeout).
  try {
    if (process.platform === "win32") {
      execSync("taskkill /IM electron.exe /T /F", { stdio: "ignore" });
    } else {
      try { execSync("pkill -f electron || true", { stdio: "ignore" }); } catch { }
    }
  } catch { }
  process.stderr.write(`\nStartup benchmark failed: ${error.message}\n`);
  process.exit(1);
});
