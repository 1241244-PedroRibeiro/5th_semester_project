# ==============================================================================
# LaPrizza Host Firewall Helper (PowerShell) - SYS02 / SYS05
# Discipline: ASIST — Sprint 2
# Purpose: Inspects or applies equivalent host firewall rules on Windows/PowerShell
# ==============================================================================
[CmdletBinding()]
param(
    [switch]$ApplyWindowsFirewall = $false,
    [switch]$CheckOnly = $false
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

# Load .env if present
$EnvFile = Join-Path $RootDir ".env"
$AllowedCidrs = "193.137.0.0/16,10.10.0.0/16"
$AdminSshPort = "2222"
$AllowPublicHttps = "false"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            if ($line -match "^ALLOWED_SOURCE_CIDRS=(.*)$") { $AllowedCidrs = $matches[1].Trim('"').Trim("'") }
            if ($line -match "^ADMIN_SSH_PORT=(.*)$") { $AdminSshPort = $matches[1].Trim('"').Trim("'") }
            if ($line -match "^ALLOW_PUBLIC_HTTPS=(.*)$") { $AllowPublicHttps = $matches[1].Trim('"').Trim("'") }
        }
    }
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "LaPrizza Host Firewall Configuration Inspection (SYS02)" -ForegroundColor Cyan
Write-Host "Timestamp:            $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"
Write-Host "Allowed CIDRs:        $AllowedCidrs"
Write-Host "Admin SSH Port:       $AdminSshPort"
Write-Host "Allow Public HTTPS:   $AllowPublicHttps"
Write-Host "======================================================================"

$CidrList = $AllowedCidrs -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }

Write-Host "`nPlanned Linux UFW Rules:" -ForegroundColor Yellow
Write-Host "  ufw default deny incoming"
Write-Host "  ufw default allow outgoing"
Write-Host "  ufw logging on"

foreach ($cidr in $CidrList) {
    Write-Host "  ufw allow from $cidr to any port 443 proto tcp comment 'HTTPS ($cidr)'"
    Write-Host "  ufw allow from $cidr to any port 80 proto tcp comment 'HTTP-redirect ($cidr)'"
    Write-Host "  ufw allow from $cidr to any port $AdminSshPort proto tcp comment 'SSH ($cidr)'"
}

if ($AllowPublicHttps -eq "true") {
    Write-Host "  ufw allow 443/tcp comment 'Public HTTPS (unrestricted)'"
}

if ($ApplyWindowsFirewall) {
    Write-Host "`nApplying Windows Defender Firewall Rules for LaPrizza..." -ForegroundColor Magenta
    
    # Check admin privileges
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Warning "Modifying Windows Firewall requires elevated administrator privileges. Please run as Administrator."
        return
    }

    $RemoteAddresses = $CidrList -join ","
    
    # Remove existing rules if present
    Remove-NetFirewallRule -DisplayName "LaPrizza-*" -ErrorAction SilentlyContinue

    New-NetFirewallRule -DisplayName "LaPrizza-HTTPS-Inbound" -Direction Inbound -Protocol TCP -LocalPort 443 -RemoteAddress $RemoteAddresses -Action Allow -Description "Allow HTTPS from DEI and VPN" | Out-Null
    New-NetFirewallRule -DisplayName "LaPrizza-HTTP-Inbound" -Direction Inbound -Protocol TCP -LocalPort 80 -RemoteAddress $RemoteAddresses -Action Allow -Description "Allow HTTP redirect from DEI and VPN" | Out-Null
    New-NetFirewallRule -DisplayName "LaPrizza-SSH-Inbound" -Direction Inbound -Protocol TCP -LocalPort [int]$AdminSshPort -RemoteAddress $RemoteAddresses -Action Allow -Description "Allow SSH from DEI and VPN" | Out-Null

    Write-Host "Windows Firewall rules configured successfully." -ForegroundColor Green
} else {
    Write-Host "`n(To apply equivalent rules to Windows Firewall, run with: .\scripts\firewall.ps1 -ApplyWindowsFirewall in an Administrator prompt)" -ForegroundColor DarkGray
}

Write-Host "Configuration valid.`n" -ForegroundColor Green
