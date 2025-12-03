#!/usr/bin/env pwsh
# Script de diagnostic DNS pour domaines sans enregistrement

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain
)

function Write-ColorOutput($Color, $Message) {
    $colors = @{
        reset = "`e[0m"
        red = "`e[31m"
        green = "`e[32m"
        yellow = "`e[33m"
        blue = "`e[34m"
        cyan = "`e[36m"
        magenta = "`e[35m"
    }
    Write-Host "$($colors[$Color])$Message$($colors.reset)"
}

Write-ColorOutput "cyan" "🔍 Diagnostic DNS pour: $Domain"
Write-ColorOutput "cyan" "=================================="
Write-Host ""

# 1. Test avec différents serveurs DNS
Write-ColorOutput "blue" "1️⃣ Test avec différents serveurs DNS..."
$dnsServers = @(
    @{ name = "Google DNS"; server = "8.8.8.8" },
    @{ name = "Cloudflare DNS"; server = "1.1.1.1" },
    @{ name = "OpenDNS"; server = "208.67.222.222" }
)

foreach ($dns in $dnsServers) {
    Write-Host "   🌐 Test avec $($dns.name) ($($dns.server))..." -ForegroundColor Gray
    try {
        $result = & nslookup $Domain $dns.server 2>$null
        if ($result -match "Address.*:" -and $result -notmatch "can't find" -and $result -notmatch "Aucun") {
            Write-ColorOutput "green" "   ✅ Résolu avec $($dns.name)"
            $result | Where-Object { $_ -match "Address.*:" -and $_ -notmatch "^Server" } | ForEach-Object {
                Write-Host "      $_" -ForegroundColor Green
            }
        } else {
            Write-ColorOutput "yellow" "   ⚠️ Pas d'enregistrement avec $($dns.name)"
        }
    } catch {
        Write-ColorOutput "red" "   ❌ Erreur avec $($dns.name)"
    }
}
Write-Host ""

# 2. Vérifier la validité du domaine
Write-ColorOutput "blue" "2️⃣ Vérification du domaine..."
try {
    $whoisResult = & nslookup -type=NS $Domain 8.8.8.8 2>$null
    if ($whoisResult -match "nameserver") {
        Write-ColorOutput "green" "   ✅ Domaine valide avec serveurs DNS"
        $whoisResult | Where-Object { $_ -match "nameserver" } | ForEach-Object {
            Write-Host "      $_" -ForegroundColor Green
        }
    } else {
        Write-ColorOutput "yellow" "   ⚠️ Aucun serveur DNS trouvé"
        Write-ColorOutput "cyan" "   💡 Le domaine peut ne pas être enregistré ou configuré"
    }
} catch {
    Write-ColorOutput "red" "   ❌ Impossible de vérifier les serveurs DNS"
}
Write-Host ""

# 3. Test de connectivité web
Write-ColorOutput "blue" "3️⃣ Test de connectivité HTTP..."
$protocols = @("http", "https")
foreach ($protocol in $protocols) {
    $url = "$protocol://$Domain"
    Write-Host "   🔍 Test: $url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-ColorOutput "green" "   ✅ $protocol accessible - Code: $($response.StatusCode)"
    } catch {
        $errorDetails = $_.Exception.Message
        if ($errorDetails -match "could not be resolved") {
            Write-ColorOutput "yellow" "   ⚠️ $protocol - DNS non résolu"
        } elseif ($errorDetails -match "timeout") {
            Write-ColorOutput "yellow" "   ⚠️ $protocol - Timeout"
        } else {
            Write-ColorOutput "yellow" "   ⚠️ $protocol - $errorDetails"
        }
    }
}
Write-Host ""

# 4. Instructions de configuration
Write-ColorOutput "cyan" "📋 Instructions de Configuration DNS"
Write-ColorOutput "cyan" "===================================="
Write-Host ""

Write-ColorOutput "blue" "Si vous gérez ce domaine, voici comment configurer le DNS:"
Write-Host ""

Write-ColorOutput "yellow" "Option 1 - CNAME vers ngrok (Recommandé pour tests):"
Write-Host "   Type: CNAME" -ForegroundColor White
Write-Host "   Nom: @ (ou www pour sous-domaine)" -ForegroundColor White
Write-Host "   Valeur: 74763f344144.ngrok-free.app" -ForegroundColor White
Write-Host "   TTL: 300 (5 minutes)" -ForegroundColor White
Write-Host ""

Write-ColorOutput "yellow" "Option 2 - Record A vers IP ngrok:"
# Obtenir l'IP de ngrok
Write-Host "   🔍 Recherche de l'IP ngrok..." -ForegroundColor Gray
try {
    $ngrokIP = & nslookup 74763f344144.ngrok-free.app 8.8.8.8 2>$null | Where-Object { $_ -match "Address.*: \d" } | Select-Object -First 1
    if ($ngrokIP) {
        $ip = ($ngrokIP -split ": ")[1].Trim()
        Write-Host "   Type: A" -ForegroundColor White
        Write-Host "   Nom: @ (ou www)" -ForegroundColor White
        Write-Host "   Valeur: $ip" -ForegroundColor White
        Write-Host "   TTL: 300" -ForegroundColor White
    } else {
        Write-Host "   ⚠️ Impossible d'obtenir l'IP ngrok automatiquement" -ForegroundColor Yellow
        Write-Host "   Utilisez: nslookup 74763f344144.ngrok-free.app pour l'obtenir" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️ Utilisez: nslookup 74763f344144.ngrok-free.app pour obtenir l'IP" -ForegroundColor Yellow
}
Write-Host ""

Write-ColorOutput "blue" "Hebergeurs courants:"
Write-Host "   - Hostinger: Panel -> Domaines -> Gestion DNS" -ForegroundColor Cyan
Write-Host "   - OVH: Manager -> Domaines -> Zone DNS" -ForegroundColor Cyan
Write-Host "   - Cloudflare: Dashboard -> DNS" -ForegroundColor Cyan
Write-Host "   - Namecheap: Account -> Domain List -> Manage" -ForegroundColor Cyan
Write-Host ""

Write-ColorOutput "magenta" "Temps de propagation DNS:"
Write-Host "   - 5-30 minutes en general" -ForegroundColor Yellow
Write-Host "   - Jusqu'a 24-48h dans certains cas" -ForegroundColor Yellow
Write-Host ""

Write-ColorOutput "green" "Apres configuration DNS:"
Write-Host "   1. Attendre 15-30 minutes" -ForegroundColor White
Write-Host "   2. Re-tester: ./diagnose-ngrok.ps1" -ForegroundColor White
Write-Host "   3. Puis: ./test-domain-cname.ps1 -Domain $Domain" -ForegroundColor White