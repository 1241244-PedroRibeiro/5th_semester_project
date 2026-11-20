$Base = "http://localhost:3000"
$ManagerEmail = "manager@laprizza.test"
$ManagerPassword = "Manager123!"

Write-Host "`n[1/6] Login como Manager..." -ForegroundColor Cyan
$login = Invoke-RestMethod -Method Post -Uri "$Base/auth/login" `
    -ContentType 'application/json' `
    -Body (@{ email = $ManagerEmail; password = $ManagerPassword } | ConvertTo-Json)
$jwt = $login.token
$headers = @{ Authorization = "Bearer $jwt" }

Write-Host "[2/6] A executar AI02..." -ForegroundColor Cyan
$planning = Invoke-RestMethod -Method Post -Uri "$Base/planning/executions" `
    -Headers $headers -ContentType 'application/json' `
    -Body (@{
        forecastName = "Week-45"
        scenarioName = "Autumn-Scenario"
        referenceDate = "2026-11-05"
    } | ConvertTo-Json)

if ($planning.executionId -le 0) { throw "AI02 não devolveu executionId." }
Write-Host "      AI02 concluída: executionId=$($planning.executionId)" -ForegroundColor Green

Write-Host "[3/6] A consultar histórico..." -ForegroundColor Cyan
$history = Invoke-RestMethod -Method Get -Uri "$Base/planning/executions?pageSize=20&pageStartIndex=0" -Headers $headers
if ($history -isnot [array] -and $null -eq $history) { throw "Histórico inválido." }
Write-Host "      Histórico consultado." -ForegroundColor Green

Write-Host "[4/6] A consultar detalhe..." -ForegroundColor Cyan
$detail = Invoke-RestMethod -Method Get -Uri "$Base/planning/executions/$($planning.executionId)" -Headers $headers
if ($detail.executionId -ne $planning.executionId) { throw "Detalhe inconsistente." }
Write-Host "      Detalhe consultado." -ForegroundColor Green

Write-Host "[5/6] A repetir execução..." -ForegroundColor Cyan
$replay = Invoke-RestMethod -Method Post -Uri "$Base/planning/executions/$($planning.executionId)/replay" -Headers $headers
if (-not $replay.isReplay) { throw "Replay não foi marcado como isReplay=true." }
Write-Host "      Replay concluído: executionId=$($replay.executionId)" -ForegroundColor Green

Write-Host "[6/6] A exportar catálogo para AI06..." -ForegroundColor Cyan
$export = Invoke-RestMethod -Method Get -Uri "$Base/products/export" -Headers $headers
if (-not $export.products -or $export.products.Count -eq 0) { throw "Exportação sem produtos." }
if ($export.products[0].sku -match '^[0-9a-fA-F-]{36}$') { throw "Exportação expôs UUID." }
Write-Host "      Exportação válida: $($export.products.Count) produtos." -ForegroundColor Green

Write-Host "`n--- Demo AI05 concluída com sucesso ---" -ForegroundColor Green
Write-Host "Acesso protegido, histórico, detalhe, replay e exportação verificados."
