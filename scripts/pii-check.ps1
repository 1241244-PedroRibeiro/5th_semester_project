<# 
.SYNOPSIS
    PII Check Script for SYS04 Shared Documents (PowerShell version)
    Scans /shared/documents/ for PII patterns and fails if found
    Used as pre-deploy check
#>

param(
    [string]$LogFile = "stdout"
)

$SharedDocs = if ($env:LAPRIZZA_SHARED_DIR) { 
    Join-Path $env:LAPRIZZA_SHARED_DIR "documents" 
} elseif (Test-Path "shared/documents") { 
    "shared/documents" 
} else { 
    "/var/lib/laprizza/shared/documents" 
}

function Write-Log {
    param([string]$Message)
    if ($LogFile -eq "stdout") {
        Write-Host $Message
    } else {
        $Message | Out-File -FilePath $LogFile -Append -Encoding utf8
        Write-Host $Message
    }
}

Write-Log "=== SYS04 PII Check ==="
Write-Log "Scanning: $SharedDocs"
Write-Log "Timestamp: $(Get-Date -Format 'yyyyMMddTHHmmssZ')"
Write-Log ""

if (-not (Test-Path $SharedDocs)) {
    Write-Log "ERROR: Shared documents directory not found at $SharedDocs"
    exit 1
}

$FoundPII = $false

# Check for email patterns
Write-Log "Checking for email addresses..."
$EmailMatches = Get-ChildItem -Path $SharedDocs -Recurse -File -ErrorAction SilentlyContinue |
    Select-String -Pattern '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b' -ErrorAction SilentlyContinue
if ($EmailMatches) {
    Write-Log "FAIL: Email addresses found in shared documents"
    $EmailMatches | ForEach-Object { Write-Log "  $($_.Path):$($_.LineNumber): $($_.Line)" }
    $FoundPII = $true
} else {
    Write-Log "OK: No email addresses found"
}

# Check for Portuguese phone numbers (+351)
Write-Log "Checking for Portuguese phone numbers (+351)..."
$PhoneMatches = Get-ChildItem -Path $SharedDocs -Recurse -File -ErrorAction SilentlyContinue |
    Select-String -Pattern '\+351[0-9]{9}\b' -ErrorAction SilentlyContinue
if ($PhoneMatches) {
    Write-Log "FAIL: Portuguese phone numbers found in shared documents"
    $PhoneMatches | ForEach-Object { Write-Log "  $($_.Path):$($_.LineNumber): $($_.Line)" }
    $FoundPII = $true
} else {
    Write-Log "OK: No Portuguese phone numbers found"
}

# Check for dietary/allergen names (EU-14 allergens)
Write-Log "Checking for EU-14 allergen names..."
$Allergens = @("gluten", "crustaceans", "eggs", "fish", "peanuts", "soybeans", "milk", "nuts", "celery", "mustard", "sesame", "sulphites", "lupin", "molluscs")
$AllergenPattern = "\b($($Allergens -join '|'))\b"
$AllergenMatches = Get-ChildItem -Path $SharedDocs -Recurse -File -ErrorAction SilentlyContinue |
    Select-String -Pattern $AllergenPattern -CaseSensitive:$false -ErrorAction SilentlyContinue
if ($AllergenMatches) {
    Write-Log "FAIL: Allergen names found in shared documents (may indicate dietary profiles)"
    $AllergenMatches | ForEach-Object { Write-Log "  $($_.Path):$($_.LineNumber): $($_.Line)" }
    $FoundPII = $true
} else {
    Write-Log "OK: No allergen names found"
}

# Check for common credential patterns
Write-Log "Checking for credential patterns..."
$CredPattern = '(password|secret|api[_-]?key|token|credential)\s*[:=]\s*\S+'
$CredMatches = Get-ChildItem -Path $SharedDocs -Recurse -File -ErrorAction SilentlyContinue |
    Select-String -Pattern $CredPattern -CaseSensitive:$false -ErrorAction SilentlyContinue
if ($CredMatches) {
    Write-Log "FAIL: Credential patterns found in shared documents"
    $CredMatches | ForEach-Object { Write-Log "  $($_.Path):$($_.LineNumber): $($_.Line)" }
    $FoundPII = $true
} else {
    Write-Log "OK: No credential patterns found"
}

# Check for customer-related paths (should not exist per SYS04 AC3.1)
Write-Log "Checking for forbidden subdirectories..."
$ForbiddenDirs = @("customers", "users", "dietary", "credentials", "backups")
foreach ($dir in $ForbiddenDirs) {
    if (Test-Path (Join-Path $SharedDocs $dir) -PathType Container) {
        Write-Log "FAIL: Forbidden subdirectory '$dir' exists in shared documents"
        $FoundPII = $true
    }
}
if (-not $FoundPII) {
    Write-Log "OK: No forbidden subdirectories found"
}

Write-Log ""
Write-Log "=== PII Check Result ==="
if ($FoundPII) {
    Write-Log "STATUS: FAIL - PII detected in shared documents"
    exit 1
} else {
    Write-Log "STATUS: PASS - No PII detected in shared documents"
    exit 0
}