param(
	[string]$ManagerEmail = 'manager@laprizza.test',
	[string]$ManagerPassword = 'Manager123!',
	[string]$LocalEmail = 'josealves@laprizza.test',
	[string]$ExternalEmail = 'pedro.teste@laprizza.com'
)

$ErrorActionPreference = 'Stop'
$baseUrl = 'https://localhost/api'
$tempFiles = @()

function Invoke-JsonRequest {
	param([string]$Method, [string]$Url, [hashtable]$Headers, [string]$Body, [string]$Name)
	$path = Join-Path $env:TEMP ("laprizza-aa07-" + $Name + "-" + [guid]::NewGuid().ToString() + ".json")
	$script:tempFiles += $path
	$Body | Set-Content -LiteralPath $path -Encoding ascii
	$arguments = @('-k', '-sS', '-X', $Method, $Url, '-H', 'Content-Type: application/json')
	foreach ($header in $Headers.GetEnumerator()) { $arguments += @('-H', "$($header.Key): $($header.Value)") }
	$arguments += @('--data-binary', "@$path")
	$response = & curl.exe @arguments
	if ($LASTEXITCODE -ne 0) { throw "Request failed: $Method $Url" }
	return ($response | ConvertFrom-Json)
}

try {
	$login = Invoke-JsonRequest -Method POST -Url "$baseUrl/auth/login" -Headers @{} `
		-Body (@{ email = $ManagerEmail; password = $ManagerPassword } | ConvertTo-Json -Compress) -Name 'login'
	if (-not $login.token) { throw 'Manager login did not return a token.' }

	$invite = Invoke-JsonRequest -Method POST -Url "$baseUrl/auth/invite" `
		-Headers @{ Authorization = "Bearer $($login.token)" } `
		-Body (@{ email = $ExternalEmail; roleName = 'EMPLOYEE'; activationMode = 'EXTERNAL_IDP_MATCH' } | ConvertTo-Json -Compress) `
		-Name 'external-invite'
	if (-not $invite.username) { throw 'External invitation was not created.' }

	$localToken = (docker exec laprizza_postgres psql -U laprizza_user -d laprizza_db -Atc `
		"SELECT i.token FROM activation_invitations i JOIN users u ON u.username=i.username WHERE LOWER(u.email)=LOWER('$LocalEmail') AND i.purpose='LOCAL_ACCOUNT_ACTIVATION' AND i.used_at IS NULL AND i.revoked_at IS NULL ORDER BY i.created_at DESC LIMIT 1;").Trim()
	$usedToken = (docker exec laprizza_postgres psql -U laprizza_user -d laprizza_db -Atc `
		"SELECT i.token FROM activation_invitations i WHERE i.used_at IS NOT NULL ORDER BY i.used_at DESC LIMIT 1;").Trim()
	$externalToken = (docker exec laprizza_postgres psql -U laprizza_user -d laprizza_db -Atc `
		"SELECT i.token FROM activation_invitations i JOIN users u ON u.username=i.username WHERE LOWER(u.email)=LOWER('$ExternalEmail') AND i.purpose='EXTERNAL_IDP_MATCH' AND i.used_at IS NULL AND i.revoked_at IS NULL ORDER BY i.created_at DESC LIMIT 1;").Trim()
	if (-not $localToken -or -not $usedToken -or -not $externalToken) { throw 'Could not find all required invitation tokens.' }

	$environment = @{
		name = 'AA07 Local'
		variables = @(
			@{ name = 'baseUrl'; value = $baseUrl; enabled = $true },
			@{ name = 'activationToken'; value = $localToken; enabled = $true },
			@{ name = 'usedActivationToken'; value = $usedToken; enabled = $true },
			@{ name = 'weakPassword'; value = 'abc'; enabled = $true },
			@{ name = 'externalActivationToken'; value = $externalToken; enabled = $true }
		)
	}
	$output = Join-Path $PSScriptRoot '..\environments\AA07.local.json'
	$environment | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $output -Encoding utf8
	Write-Host "Created Bruno environment: $output"
	Write-Host 'Import/select AA07 Local in Bruno, then run the AA07 collection.'
}
finally {
	foreach ($path in $tempFiles) {
		if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
	}
}
