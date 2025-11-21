#!/usr/bin/env pwsh
# Script de test rapide pour domaines avec ngrok

param(
    [string]$NgrokUrl = "",
    [string]$Domain = ""
)

$colors = @{
    reset = "`e[0m"
    red = "`e[31m"
    green = "`e[32m"
    yellow = "`e[33m"
    blue = "`e[34m"
    cyan = "`e[36m"
}

function Write-ColorOutput($Color, $Message) {
    Write-Host "$($colors[$Color])$Message$($colors.reset)"
}

# Détection automatique de l'URL ngrok
if (-not $NgrokUrl) {
    Write-ColorOutput "blue" "🔍 Détection automatique de l'URL ngrok..."
    try {
        $ngrokApi = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3
        $httpsTunnel = $ngrokApi.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        if ($httpsTunnel) {
            $NgrokUrl = $httpsTunnel.public_url
            Write-ColorOutput "green" "✅ URL ngrok détectée: $NgrokUrl"
        } else {
            Write-ColorOutput "yellow" "⚠️ Aucun tunnel HTTPS trouvé"
        }
    } catch {
        Write-ColorOutput "yellow" "⚠️ Impossible de détecter ngrok (API non accessible)"
        Write-Host "💡 Assurez-vous que ngrok tourne: ngrok http 3003" -ForegroundColor Yellow
        exit 1
    }
}

if (-not $NgrokUrl) {
    Write-Host "❌ URL ngrok requise" -ForegroundColor Red
    Write-Host "Usage: ./test-domain.ps1 -NgrokUrl https://xyz.ngrok-free.app -Domain mondomaine.com" -ForegroundColor Yellow
    Write-Host "   ou: ./test-domain.ps1 -Domain mondomaine.com (détection auto)" -ForegroundColor Yellow
    exit 1
}

Write-ColorOutput "cyan" "🧪 Test de Domaines avec ngrok"
Write-ColorOutput "cyan" "================================"
Write-Host ""
Write-ColorOutput "blue" "🌐 Tunnel: $NgrokUrl"
Write-Host ""

# Fonction de test d'un domaine
function Test-Domain($domain, $path = "/") {
    Write-ColorOutput "blue" "🔍 Test: $domain$path"
    
    try {
        $headers = @{ "Host" = $domain }
        $response = Invoke-WebRequest -Uri "$NgrokUrl$path" -Headers $headers -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
        
        $statusCode = $response.StatusCode
        $location = $response.Headers.Location
        
        switch ($statusCode) {
            302 {
                Write-ColorOutput "green" "   ✅ Redirection vers: $location"
            }
            200 {
                Write-ColorOutput "green" "   ✅ Réponse OK (200)"
            }
            default {
                Write-ColorOutput "yellow" "   ⚠️ Code: $statusCode"
            }
        }
    } catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            $statusCode = [int]$errorResponse.StatusCode
            $statusText = $errorResponse.StatusDescription
            
            switch ($statusCode) {
                404 {
                    Write-ColorOutput "yellow" "   ⚠️ Domaine non trouvé (404) - Normal si pas en DB"
                }
                403 {
                    Write-ColorOutput "yellow" "   ⚠️ Custom domain non autorisé (403)"
                }
                default {
                    Write-ColorOutput "red" "   ❌ Erreur: $statusCode - $statusText"
                }
            }
        } else {
            Write-ColorOutput "red" "   ❌ Erreur réseau: $($_.Exception.Message)"
        }
    }
    Write-Host ""
}

# Tests prédéfinis ou domaine spécifique
if ($Domain) {
    # Test du domaine spécifié
    Test-Domain $Domain "/"
    Test-Domain $Domain "/health"
    Test-Domain $Domain "/api"
} else {
    # Tests multiples
    Write-ColorOutput "blue" "🎯 Tests automatiques..."
    Write-Host ""
    
    # 1. Health check direct
    Write-ColorOutput "blue" "1️⃣ Health check direct"
    try {
        $health = Invoke-RestMethod -Uri "$NgrokUrl/health" -TimeoutSec 5
        Write-ColorOutput "green" "   ✅ Serveur actif: $($health.status)"
    } catch {
        Write-ColorOutput "red" "   ❌ Serveur inaccessible"
    }
    Write-Host ""
    
    # 2. Tests de domaines fictifs
    Write-ColorOutput "blue" "2️⃣ Tests domaines fictifs (attendu: 404)"
    Test-Domain "domaine-inexistant.com"
    Test-Domain "test.example.com"
    
    # 3. Tests de domaines courants
    Write-ColorOutput "blue" "3️⃣ Tests domaines de test"
    Test-Domain "monsite.com"
    Test-Domain "entreprise.fr"
    Test-Domain "boutique.net"
    
    Write-ColorOutput "cyan" "💡 Pour tester un domaine spécifique:"
    Write-ColorOutput "cyan" "   ./test-domain.ps1 -Domain votredomaine.com"
}

Write-ColorOutput "cyan" "🎉 Tests terminés!"
Write-Host ""
Write-ColorOutput "yellow" "📋 Codes de réponse:"
Write-ColorOutput "green" "   ✅ 302 = Redirection réussie (domaine autorisé)"
Write-ColorOutput "yellow" "   ⚠️ 404 = Domaine non trouvé (pas en base)"
Write-ColorOutput "yellow" "   ⚠️ 403 = Domaine trouvé mais custom_domain non autorisé"
Write-Host ""
Write-ColorOutput "blue" "🔗 Interface ngrok: http://127.0.0.1:4040"