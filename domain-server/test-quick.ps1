#!/usr/bin/env pwsh
# Test rapide du domaine testwenoble.fr

Write-Host "=== Test du domaine testwenoble.fr ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health check avec header ngrok
Write-Host "1. Test health check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://testwenoble.fr/health" -Headers @{"ngrok-skip-browser-warning"="true"} -UseBasicParsing -TimeoutSec 10
    Write-Host "   OK - Status: $($response.StatusCode)" -ForegroundColor Green
    
    # Vérifier si c'est du JSON
    try {
        $json = $response.Content | ConvertFrom-Json
        Write-Host "   Server Status: $($json.status)" -ForegroundColor Green
        Write-Host "   Uptime: $($json.uptime) seconds" -ForegroundColor Green
    } catch {
        Write-Host "   Response: $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Test redirection racine
Write-Host "2. Test redirection racine..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://testwenoble.fr/" -Headers @{"ngrok-skip-browser-warning"="true"} -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 10 -ErrorAction SilentlyContinue
    
    if ($response.StatusCode -eq 302) {
        Write-Host "   OK - Redirection 302 detectee" -ForegroundColor Green
        $location = $response.Headers.Location
        Write-Host "   Destination: $location" -ForegroundColor Green
    } else {
        Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Yellow
        Write-Host "   Content: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))" -ForegroundColor Gray
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode) {
        Write-Host "   Status HTTP: $statusCode" -ForegroundColor Yellow
        
        if ($statusCode -eq 404) {
            Write-Host "   INFO: Domaine non trouve en base de donnees" -ForegroundColor Cyan
        } elseif ($statusCode -eq 403) {
            Write-Host "   INFO: Custom domain non autorise" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ERREUR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Instructions ===" -ForegroundColor Magenta
Write-Host "Pour navigateur web, utilisez:" -ForegroundColor White
Write-Host "http://testwenoble.fr?ngrok-skip-browser-warning=true" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si 404: Ajoutez le domaine en base Supabase" -ForegroundColor White
Write-Host "Si 403: Activez custom_domain dans le plan" -ForegroundColor White