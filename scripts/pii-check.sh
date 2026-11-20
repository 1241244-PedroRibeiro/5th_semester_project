#!/bin/bash
# PII Check Script for SYS04 Shared Documents
# Scans /shared/documents/ for PII patterns and fails if found
# Used as pre-deploy check

set -euo pipefail

SHARED_DOCS="${LAPRIZZA_SHARED_DIR:-/var/lib/laprizza/shared}/documents"
if [ ! -d "$SHARED_DOCS" ] && [ -d "shared/documents" ]; then
    SHARED_DOCS="shared/documents"
fi
LOG_FILE="${1:-/dev/stdout}"

echo "=== SYS04 PII Check ===" | tee -a "$LOG_FILE"
echo "Scanning: $SHARED_DOCS" | tee -a "$LOG_FILE"
echo "Timestamp: $(date -u +%Y%m%dT%H%M%SZ)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ ! -d "$SHARED_DOCS" ]; then
    echo "ERROR: Shared documents directory not found at $SHARED_DOCS" | tee -a "$LOG_FILE"
    exit 1
fi

FOUND_PII=0

# Check for email patterns
echo "Checking for email addresses..." | tee -a "$LOG_FILE"
if grep -r -E '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b' "$SHARED_DOCS" 2>/dev/null; then
    echo "FAIL: Email addresses found in shared documents" | tee -a "$LOG_FILE"
    FOUND_PII=1
else
    echo "OK: No email addresses found" | tee -a "$LOG_FILE"
fi

# Check for Portuguese phone numbers (+351)
echo "Checking for Portuguese phone numbers (+351)..." | tee -a "$LOG_FILE"
if grep -r -E '\+351[0-9]{9}\b' "$SHARED_DOCS" 2>/dev/null; then
    echo "FAIL: Portuguese phone numbers found in shared documents" | tee -a "$LOG_FILE"
    FOUND_PII=1
else
    echo "OK: No Portuguese phone numbers found" | tee -a "$LOG_FILE"
fi

# Check for dietary/allergen names (EU-14 allergens)
echo "Checking for EU-14 allergen names..." | tee -a "$LOG_FILE"
ALLERGENS=("gluten" "crustaceans" "eggs" "fish" "peanuts" "soybeans" "milk" "nuts" "celery" "mustard" "sesame" "sulphites" "lupin" "molluscs")
ALLERGEN_PATTERN=$(IFS="|"; echo "${ALLERGENS[*]}")
if grep -r -i -E "\b(${ALLERGEN_PATTERN})\b" "$SHARED_DOCS" 2>/dev/null; then
    echo "FAIL: Allergen names found in shared documents (may indicate dietary profiles)" | tee -a "$LOG_FILE"
    FOUND_PII=1
else
    echo "OK: No allergen names found" | tee -a "$LOG_FILE"
fi

# Check for common credential patterns
echo "Checking for credential patterns..." | tee -a "$LOG_FILE"
if grep -r -i -E '(password|secret|api[_-]?key|token|credential)\s*[:=]\s*\S+' "$SHARED_DOCS" 2>/dev/null; then
    echo "FAIL: Credential patterns found in shared documents" | tee -a "$LOG_FILE"
    FOUND_PII=1
else
    echo "OK: No credential patterns found" | tee -a "$LOG_FILE"
fi

# Check for customer-related paths (should not exist per SYS04 AC3.1)
echo "Checking for forbidden subdirectories..." | tee -a "$LOG_FILE"
FORBIDDEN_DIRS=("customers" "users" "dietary" "credentials" "backups")
for dir in "${FORBIDDEN_DIRS[@]}"; do
    if [ -d "$SHARED_DOCS/$dir" ]; then
        echo "FAIL: Forbidden subdirectory '$dir' exists in shared documents" | tee -a "$LOG_FILE"
        FOUND_PII=1
    fi
done
if [ $FOUND_PII -eq 0 ]; then
    echo "OK: No forbidden subdirectories found" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "=== PII Check Result ===" | tee -a "$LOG_FILE"
if [ $FOUND_PII -eq 1 ]; then
    echo "STATUS: FAIL - PII detected in shared documents" | tee -a "$LOG_FILE"
    exit 1
else
    echo "STATUS: PASS - No PII detected in shared documents" | tee -a "$LOG_FILE"
    exit 0
fi