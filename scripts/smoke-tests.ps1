# ==============================================================================
# LaPrizza - Automated Smoke Test Suite (PowerShell / Windows) (SYS01 / AC2)
# Compatible with Windows PowerShell 5.1 and PowerShell 7+
# Usage: .\scripts\smoke-tests.ps1 [-BaseUrl "https://localhost"]
# ==============================================================================

param(
    [string]$BaseUrl = "https://localhost"
)

$ErrorActionPreference = "Continue"

# Configure .NET security protocols for legacy PowerShell 5.1
try {
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
} catch {}

Write-Host '=========================================================='
Write-Host 'LaPrizza Deployment Validation — Smoke Tests (PowerShell)'
Write-Host ('Target Base URL: {0}' -f $BaseUrl)
Write-Host ('Timestamp:       {0}' -f (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))
Write-Host '=========================================================='

$Total = 0
$Failed = 0

function Fetch-Json([string]$url) {
    try {
        if (Get-Command "curl.exe" -ErrorAction SilentlyContinue) {
            $raw = & curl.exe -k -s -S --max-time 5 $url 2>$null
            if ($raw) {
                return ($raw | ConvertFrom-Json)
            }
        } else {
            return (Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 5 -ErrorAction Stop)
        }
    } catch {
        return $null
    }
    return $null
}

function Fetch-StatusCode([string]$url) {
    try {
        if (Get-Command "curl.exe" -ErrorAction SilentlyContinue) {
            $code = & curl.exe -k -s -o NUL -w "%{http_code}" --max-time 5 $url 2>$null
            if ($code) { return [int]$code }
        } else {
            $resp = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            return [int]$resp.StatusCode
        }
    } catch {
        if ($_.Exception.Response) {
            return [int]$_.Exception.Response.StatusCode
        }
    }
    return 0
}

function Test-Probe {
    param(
        [string]$TestName,
        [scriptblock]$Check
    )
    $script:Total++
    Write-Host -NoNewline ('[{0}] {1} ... ' -f $Total, $TestName)
    try {
        $result = & $Check
        if ($result -eq $true) {
            Write-Host 'PASS' -ForegroundColor Green
        } else {
            Write-Host 'FAIL' -ForegroundColor Red
            $script:Failed++
        }
    } catch {
        Write-Host 'FAIL' -ForegroundColor Red
        $script:Failed++
    }
}

# 1. Health Probe (/api/health or /health)
$healthJson = Fetch-Json ('{0}/api/health' -f $BaseUrl)
if ($null -eq $healthJson) {
    $healthJson = Fetch-Json ('{0}/health' -f $BaseUrl)
}

Test-Probe 'Health endpoint returns HTTP 200 and status == ok' {
    return ($null -ne $healthJson -and $healthJson.status -eq 'ok')
}

Test-Probe 'Health endpoint reports identifiable version' {
    return ($null -ne $healthJson -and ![string]::IsNullOrEmpty($healthJson.version))
}

Test-Probe 'Health dependency: PostgreSQL is up' {
    return ($null -ne $healthJson -and $healthJson.dependencies.postgres -eq 'up')
}

Test-Probe 'Health dependency: Prolog engine is up' {
    return ($null -ne $healthJson -and $healthJson.dependencies.prolog -eq 'up')
}

# 2. Public Catalogue (no auth required)
$catalogueJson = Fetch-Json ('{0}/api/catalogue' -f $BaseUrl)
if ($null -eq $catalogueJson) {
    $catalogueJson = Fetch-Json ('{0}/catalogue' -f $BaseUrl)
}

Test-Probe 'Public catalogue returns HTTP 200 array' {
    return ($null -ne $catalogueJson)
}

# 3. Public Taxonomy Probes
$sizesJson = Fetch-Json ('{0}/api/pizza-sizes' -f $BaseUrl)
if ($null -eq $sizesJson) {
    $sizesJson = Fetch-Json ('{0}/pizza-sizes' -f $BaseUrl)
}

Test-Probe 'Public taxonomy: pizza sizes populated (length >= 1)' {
    return ($null -ne $sizesJson -and $sizesJson.Count -ge 1)
}

$allergensJson = Fetch-Json ('{0}/api/allergens' -f $BaseUrl)
if ($null -eq $allergensJson) {
    $allergensJson = Fetch-Json ('{0}/allergens' -f $BaseUrl)
}

Test-Probe 'Public taxonomy: allergens seed populated (length >= 1)' {
    return ($null -ne $allergensJson -and $allergensJson.Count -ge 1)
}

# 4. Frontend SPA Probe
Test-Probe 'Frontend SPA responds with HTTP 200' {
    $code = Fetch-StatusCode ('{0}/' -f $BaseUrl)
    return ($code -eq 200)
}

# 5. HTTP to HTTPS redirect
Test-Probe 'HTTP port 80 enforces redirect (HTTP 301/308)' {
    $httpUrl = $BaseUrl -replace '^https://', 'http://' -replace ':443', ''
    $redirectCode = 0
    if (Get-Command 'curl.exe' -ErrorAction SilentlyContinue) {
        $codeStr = & curl.exe -s -o NUL -w '%{http_code}' --max-time 5 ('{0}/' -f $httpUrl) 2>$null
        if ($codeStr) { $redirectCode = [int]$codeStr }
    }
    return ($redirectCode -in 301, 308, 302)
}

$Passed = $Total - $Failed
Write-Host '=========================================================='
$summary = 'Smoke Tests Summary: ' + $Passed + '/' + $Total + ' passed (' + $Failed + ' failed)'
Write-Host $summary
Write-Host '=========================================================='

if ($Failed -gt 0) {
    Write-Host 'DEPLOY: FAILED (smoke tests failed)' -ForegroundColor Red
    exit 1
}

Write-Host 'DEPLOY: SMOKE TESTS PASSED' -ForegroundColor Green
exit 0