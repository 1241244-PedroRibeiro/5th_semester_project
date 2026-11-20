# ==============================================================================
# LaPrizza Daily Denied Connection Report (PowerShell) - SYS02 / AC3.3
# Discipline: ASIST — Sprint 2
# Purpose: Generates daily blocked packet summary reports for Windows or Linux logs
# ==============================================================================
[CmdletBinding()]
param(
    [string]$ReportDate = (Get-Date -Format 'yyyyMMdd'),
    [string]$LogSource = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$ReportDir = Join-Path $RootDir "logs\ufw-report"
$ReportFile = Join-Path $ReportDir "$ReportDate.txt"

if (-not (Test-Path $ReportDir)) {
    New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
}

if (-not $LogSource) {
    $SampleLog = Join-Path $RootDir "logs\ufw-sample.log"
    if (Test-Path $SampleLog) {
        $LogSource = $SampleLog
    }
}

$sb = [System.Text.StringBuilder]::new()
$DisplayLogSource = if ($LogSource) { $LogSource } else { 'None available' }
[void]$sb.AppendLine("======================================================================")
[void]$sb.AppendLine("LaPrizza Security Report — Daily Denied Connections (UFW)")
[void]$sb.AppendLine("Report Date:    $ReportDate")
[void]$sb.AppendLine("Generated At:   $((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))")
[void]$sb.AppendLine("Log Source:     $DisplayLogSource")
[void]$sb.AppendLine("======================================================================")
[void]$sb.AppendLine("")

if (-not $LogSource -or -not (Test-Path $LogSource)) {
    [void]$sb.AppendLine("WARNING: No accessible UFW log file found.")
    [void]$sb.AppendLine("Total blocked attempts recorded: 0")
} else {
    $lines = Get-Content $LogSource | Where-Object { $_ -match "\[UFW BLOCK\]" }
    if ($lines.Count -eq 0) {
        [void]$sb.AppendLine("Status: CLEAN. No denied connection attempts recorded for this period.")
        [void]$sb.AppendLine("Total blocked attempts: 0")
    } else {
        [void]$sb.AppendLine("Total denied connection attempts: $($lines.Count)")
        [void]$sb.AppendLine("")
        
        [void]$sb.AppendLine("--- Top Blocked Source IPs ---")
        $ips = $lines | ForEach-Object { if ($_ -match "SRC=([^\s]+)") { $matches[1] } }
        $ips | Group-Object | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
            [void]$sb.AppendLine(("{0,6} {1}" -f $_.Count, $_.Name))
        }
        [void]$sb.AppendLine("")

        [void]$sb.AppendLine("--- Top Targeted Destination Ports ---")
        $ports = $lines | ForEach-Object { if ($_ -match "DPT=([^\s]+)") { $matches[1] } }
        $ports | Group-Object | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
            [void]$sb.AppendLine(("{0,6} {1}" -f $_.Count, $_.Name))
        }
        [void]$sb.AppendLine("")

        [void]$sb.AppendLine("--- Top Protocols ---")
        $protos = $lines | ForEach-Object { if ($_ -match "PROTO=([^\s]+)") { $matches[1] } }
        $protos | Group-Object | Sort-Object Count -Descending | ForEach-Object {
            [void]$sb.AppendLine(("{0,6} {1}" -f $_.Count, $_.Name))
        }
        [void]$sb.AppendLine("")

        [void]$sb.AppendLine("--- Sample Block Events (Last 10) ---")
        $lines | Select-Object -Last 10 | ForEach-Object {
            [void]$sb.AppendLine($_)
        }
    }
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("======================================================================")
[void]$sb.AppendLine("End of Report — LaPrizza ASIST Automated Firewall Monitoring")
[void]$sb.AppendLine("======================================================================")

Set-Content -Path $ReportFile -Value $sb.ToString() -Encoding UTF8
Write-Host "Report generated successfully: $ReportFile" -ForegroundColor Green
Write-Host $sb.ToString()
