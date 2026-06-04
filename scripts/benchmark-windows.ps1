<#
  PowerShell wrapper to run the startup benchmark on Windows with host-level
  stabilizations and light telemetry capture.

  Usage examples:
    .\scripts\benchmark-windows.ps1 -Samples 5 -TimeoutMs 30000 -Cores 2,3 -HighPriority
    powershell -ExecutionPolicy Bypass -File scripts\benchmark-windows.ps1

  This script:
  - optionally switches to the High Performance power plan (restores original)
  - starts `npm run metrics:benchmark:windows` and pins affinity/priority
  - samples CPU utilization while the benchmark runs and writes a CSV
  - writes a small JSON metadata file for the run
#>

param(
  [int]$Samples = 5,
  [int]$TimeoutMs = 30000,
  [string]$NpmScript = 'metrics:benchmark:windows',
  [int[]]$Cores = @(),
  [switch]$HighPriority,
  [switch]$SkipPowerPlan
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$workspaceRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path

$runsDir = Join-Path $workspaceRoot 'reports\startup-benchmark\runs'
New-Item -ItemType Directory -Path $runsDir -Force | Out-Null

$timestamp = Get-Date -Format 'yyyy-MM-ddTHH-mm-ss'
$telemetryFile = Join-Path $runsDir "telemetry-$timestamp.csv"
$metaFile = Join-Path $runsDir "run-meta-$timestamp.json"

function Try-GetActivePowerPlanGuid {
  try {
    $out = & powercfg -getactivescheme 2>&1
    if ($out -match 'Power Scheme GUID:\s*([0-9A-Fa-f-]{36})') { return $matches[1] }
  } catch { }
  return $null
}

function Try-FindHighPerformanceGuid {
  try {
    $lines = & powercfg -l 2>&1
    foreach ($l in $lines) {
      if ($l -imatch '\(.*high.*\)') {
        if ($l -match '([0-9A-Fa-f-]{36})') { return $matches[1] }
      }
    }
  } catch { }
  # Fallback common GUID for High performance on many Windows installs
  return '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
}

# Save and optionally switch power plan
$origPlan = Try-GetActivePowerPlanGuid
$appliedPlan = $null
if (-not $SkipPowerPlan) {
  $highGuid = Try-FindHighPerformanceGuid
  if ($highGuid) {
    try {
      Write-Host "Setting power plan to High performance: $highGuid"
      & powercfg -setactive $highGuid | Out-Null
      $appliedPlan = $highGuid
    } catch {
      Write-Warning "Failed to set power plan: $_"
    }
  }
}

# Compute processor affinity mask from core indexes if provided
$mask = 0
if ($Cores -and $Cores.Count -gt 0) {
  foreach ($c in $Cores) { $mask = $mask -bor ([int64]1 -shl [int]$c) }
}

# Collect basic metadata
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 -Property Name,NumberOfLogicalProcessors
$meta = [ordered]@{
  timestamp = (Get-Date).ToString('o')
  workspace = $workspaceRoot
  samples = $Samples
  timeoutMs = $TimeoutMs
  npmScript = $NpmScript
  coresRequested = $Cores
  appliedAffinityMask = $mask
  cpu_count = $cpu.NumberOfLogicalProcessors
  cpu_name = $cpu.Name
  origPowerPlan = $origPlan
  appliedPowerPlan = $appliedPlan
}
$meta | ConvertTo-Json -Depth 4 | Out-File -FilePath $metaFile -Encoding utf8

Write-Host "Starting benchmark: npm run $NpmScript -- --samples $Samples --timeout $TimeoutMs"

$argList = @('run', $NpmScript, '--', '--samples', $Samples.ToString(), '--timeout', $TimeoutMs.ToString())
$proc = Start-Process -FilePath 'npm' -ArgumentList $argList -WorkingDirectory $workspaceRoot -PassThru

Start-Sleep -Milliseconds 500

try {
  if ($mask -ne 0) {
    try {
      $gproc = Get-Process -Id $proc.Id -ErrorAction Stop
      # ProcessorAffinity is IntPtr; assign via IntPtr
      $gproc.ProcessorAffinity = [IntPtr]$mask
      Write-Host "Set ProcessorAffinity to 0x$([Convert]::ToString($mask,16)) for PID $($proc.Id)"
    } catch {
      Write-Warning "Failed to set ProcessorAffinity: $_"
    }
  }

  if ($HighPriority) {
    try {
      $gproc = Get-Process -Id $proc.Id -ErrorAction Stop
      $gproc.PriorityClass = 'High'
      Write-Host "Set process priority to High for PID $($proc.Id)"
    } catch {
      Write-Warning "Failed to set PriorityClass: $_"
    }
  }

  # Start a background job to sample CPU usage while the benchmark process runs
  $job = Start-Job -ScriptBlock {
    param($pid, $outFile)
    while (Get-Process -Id $pid -ErrorAction SilentlyContinue) {
      try {
        $ts = Get-Date -Format o
        $v = (Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 1).CounterSamples.CookedValue
        "$ts,$v" | Out-File -FilePath $outFile -Append -Encoding ascii
      } catch { Start-Sleep -Seconds 1 }
    }
  } -ArgumentList $proc.Id, $telemetryFile

  # Wait for the npm process to exit (this will wait for the script that spawns electron to finish)
  $proc.WaitForExit()

  # Give the telemetry job a moment to flush
  Wait-Job $job -Timeout 5 | Out-Null
  Receive-Job $job | Out-Null
  Remove-Job $job -Force

  Write-Host "Benchmark finished. Telemetry: $telemetryFile  Meta: $metaFile"

} finally {
  if (-not $SkipPowerPlan -and $origPlan) {
    try {
      & powercfg -setactive $origPlan | Out-Null
      Write-Host "Restored original power plan: $origPlan"
    } catch {
      Write-Warning "Failed to restore original power plan: $_"
    }
  }
}

Exit 0
