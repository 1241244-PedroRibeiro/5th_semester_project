# ==============================================================================
# LaPrizza - Automated Deployment Pipeline (PowerShell / Windows) (SYS01)
# Usage: .\scripts\deploy.ps1 [-RollbackOnFailure] [-SkipBuild]
# ==============================================================================

param(
    [switch]$RollbackOnFailure,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$ProjectName = "laprizza"
$ComposeFile = "docker-compose.yml"
$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$LogDir = "logs/deploy-$Timestamp"
$DeployLog = "$LogDir/deploy.log"

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

Start-Transcript -Path $DeployLog -Append | Out-Null

Write-Host "======================================================================"
Write-Host "LaPrizza Deployment Pipeline Started"
Write-Host "Timestamp:   $Timestamp"
Write-Host "Log dir:     $LogDir"
Write-Host "Project:     $ProjectName"
Write-Host "======================================================================"

$CurrentStage = "Stage 1 (Pre-flight)"

function Invoke-Rollback {
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host "CRITICAL: Deployment failed during $CurrentStage" -ForegroundColor Red
    Write-Host "DEPLOY: FAILED" -ForegroundColor Red
    Write-Host "======================================================================" -ForegroundColor Red

    if ($RollbackOnFailure) {
        Write-Host "Initiating automatic rollback to previous stable version..."
        $prevTag = git describe --tags --abbrev=0 HEAD~1 2>$null
        if ($prevTag) {
            git checkout $prevTag
            docker compose -p $ProjectName -f $ComposeFile up -d --build
            Write-Host "Stack restored to $prevTag."
        } else {
            docker compose -p $ProjectName -f $ComposeFile stop
        }
    } else {
        Write-Host "Stopping containers to prevent invalid deployment from remaining online (AC5.2)."
        docker compose -p $ProjectName -f $ComposeFile stop
    }
}

try {
    # Stage 1 — Pre-flight Checks
    Write-Host "--- [Stage 1/7] Pre-flight verification ---"
    $CurrentStage = "Stage 1 (Pre-flight)"

    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Write-Host "Warning: .env not found. Copying .env.example for local fallback."
            Copy-Item ".env.example" ".env"
        } else {
            throw "Missing .env and .env.example"
        }
    }

    # Ensure shared resource directory structure exists (SYS04)
    $sharedPath = if ($env:LAPRIZZA_SHARED_DIR) { $env:LAPRIZZA_SHARED_DIR } else { "shared" }
    @("3d-assets/models", "3d-assets/textures", "3d-assets/env", "kitchen-schemas", "documents/reports", "documents/operations", "planning-inputs", "planning-outputs", "exports", "tmp") | ForEach-Object {
        $sub = Join-Path $sharedPath $_
        if (-not (Test-Path $sub)) {
            New-Item -ItemType Directory -Path $sub -Force | Out-Null
        }
    }

    Write-Host "Validating Docker Compose configuration..."
    docker compose -p $ProjectName -f $ComposeFile config --quiet

    Write-Host "Generating redacted configuration snapshot (AC6.2)..."
    $cfg = docker compose -p $ProjectName -f $ComposeFile config
    $cfg -replace "(PASSWORD|SECRET|KEY|TOKEN):\s*.+", '$1: [REDACTED]' | Out-File "$LogDir/compose-config.txt" -Encoding utf8

    Write-Host "Summarizing environment variables count (AC7.4)..."
    Get-ChildItem env: | Where-Object { $_.Name -match "^(JWT_|DB_|OIDC_|SMTP_|SEED_|PROLOG_)" } | 
        Group-Object Name | Select-Object Count, Name | Out-File "$LogDir/env-summary.txt" -Encoding utf8

    # Stage 2 — Build Images
    Write-Host "--- [Stage 2/7] Building module container images ---"
    $CurrentStage = "Stage 2 (Build)"
    if (-not $SkipBuild) {
        docker compose -p $ProjectName -f $ComposeFile build
    }

    # Stage 3 — PostgreSQL
    Write-Host "--- [Stage 3/7] Starting PostgreSQL database service ---"
    $CurrentStage = "Stage 3 (PostgreSQL)"
    docker compose -p $ProjectName -f $ComposeFile up -d --wait postgres
    Write-Host "PostgreSQL is healthy."

    # Stage 4 — Backend
    Write-Host "--- [Stage 4/7] Starting Backend service (running migrations & startup) ---"
    $CurrentStage = "Stage 4 (Backend)"
    docker compose -p $ProjectName -f $ComposeFile up -d backend

    Write-Host "Waiting for Backend container to report healthy..."
    $backendHealthy = $false
    for ($i = 0; $i -lt 12; $i++) {
        Start-Sleep -Seconds 5
        $health = docker inspect --format '{{json .State.Health.Status}}' laprizza_backend 2>$null
        if ($health -match "healthy") {
            $backendHealthy = $true
            Write-Host "Backend is healthy."
            break
        }
    }

    # Stage 5 — Prolog
    Write-Host "--- [Stage 5/7] Starting Prolog planning engine service ---"
    $CurrentStage = "Stage 5 (Prolog)"
    docker compose -p $ProjectName -f $ComposeFile up -d prolog

    # Stage 6 — Frontend
    Write-Host "--- [Stage 6/7] Starting Frontend service ---"
    $CurrentStage = "Stage 6 (Frontend)"
    docker compose -p $ProjectName -f $ComposeFile up -d frontend
    Start-Sleep -Seconds 5

    docker compose -p $ProjectName -f $ComposeFile ps -a | Out-File "$LogDir/ps.txt" -Encoding utf8

    # Stage 7 — Smoke Tests
    Write-Host "--- [Stage 7/7] Executing automated smoke validation ---"
    $CurrentStage = "Stage 7 (Smoke Tests)"
    & "$PSScriptRoot\smoke-tests.ps1" -BaseUrl "https://localhost" | Tee-Object -FilePath "$LogDir/smoke.txt"
    if ($LASTEXITCODE -ne 0) {
        throw "Smoke tests failed with exit code $LASTEXITCODE"
    }

    # Archival Cleanup (> 90 days)
    $cutoff = (Get-Date).AddDays(-90)
    Get-ChildItem -Path "logs" -Directory -Filter "deploy-*" | Where-Object { $_.CreationTime -lt $cutoff } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "DEPLOY: SUCCESS" -ForegroundColor Green
    Write-Host "Deployment completed successfully." -ForegroundColor Green
    Write-Host "Artifacts archived in: $LogDir"
    Write-Host "======================================================================"
} catch {
    Invoke-Rollback
    Stop-Transcript | Out-Null
    exit 1
}

Stop-Transcript | Out-Null
exit 0
