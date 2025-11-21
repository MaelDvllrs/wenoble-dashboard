#!/usr/bin/env pwsh
# Test de l'auto-configuration DNS

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$true)]
    [string]$Project,
    
    [string]$WorkspaceId = "test-workspace-123"
)

Write-Host "=== Test Auto-Configuration DNS ===" -ForegroundColor Cyan
Write-Host "Domaine: $Domain" -ForegroundColor Yellow
Write-Host "Projet: $Project" -ForegroundColor Yellow
Write-Host ""

# URL de votre domain-server
$BaseURL = "https://74763f344144.ngrok-free.app"

# 1. Configuration automatique
Write-Host "1. Configuration automatique du custom domain..." -ForegroundColor Blue
try {
    $configResponse = Invoke-RestMethod -Uri "$BaseURL/api/auto-config/auto-configure" -Method POST -Headers @{
        "Content-Type" = "application/json"
        "ngrok-skip-browser-warning" = "true"
    } -Body (@{
        website_slug = $Domain
        folder_project = $Project  
        workspace_id = $WorkspaceId
    } | ConvertTo-Json)
    
    if ($configResponse.success) {
        Write-Host "   ✅ Configuration réussie !" -ForegroundColor Green
        Write-Host ""
        
        # Afficher les instructions DNS
        Write-Host "📋 Instructions DNS Générées:" -ForegroundColor Cyan
        $dns = $configResponse.dns_instructions.basic_config
        Write-Host "   Type: $($dns.type)" -ForegroundColor White
        Write-Host "   Nom: $($dns.name)" -ForegroundColor White  
        Write-Host "   Valeur: $($dns.content)" -ForegroundColor White
        Write-Host "   TTL: $($dns.ttl)" -ForegroundColor White
        Write-Host ""
        
        # Détection hébergeur
        $detected = $configResponse.dns_instructions.detected_provider
        if ($detected -ne "generic") {
            Write-Host "🎯 Hébergeur détecté: $detected" -ForegroundColor Yellow
            $provider = $configResponse.dns_instructions.providers.$detected
            Write-Host "   Temps de propagation estimé: $($provider.propagation_time)" -ForegroundColor Gray
        }
        
    } else {
        Write-Host "   ❌ Erreur: $($configResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Erreur API: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Vérification du statut
Write-Host "2. Vérification du statut..." -ForegroundColor Blue
try {
    $statusResponse = Invoke-RestMethod -Uri "$BaseURL/api/auto-config/status/$Domain" -Headers @{
        "ngrok-skip-browser-warning" = "true"
    }
    
    if ($statusResponse.success) {
        Write-Host "   ✅ Statut récupéré" -ForegroundColor Green
        Write-Host "   DB configuré: $($statusResponse.db_configured)" -ForegroundColor White
        
        $cfStatus = $statusResponse.cloudflare_status
        if ($cfStatus.success) {
            Write-Host "   Statut Cloudflare: $($cfStatus.status)" -ForegroundColor White
        } else {
            Write-Host "   ⚠️ Cloudflare: $($cfStatus.error)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ⚠️ Status check failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# 3. Instructions utilisateur
Write-Host "📱 Prochaines étapes pour l'utilisateur:" -ForegroundColor Magenta
Write-Host "1. Allez dans votre gestionnaire DNS" -ForegroundColor White
Write-Host "2. Ajoutez l'enregistrement CNAME ci-dessus" -ForegroundColor White  
Write-Host "3. Attendez 15-30 minutes pour la propagation" -ForegroundColor White
Write-Host "4. Testez votre domaine: https://$Domain" -ForegroundColor White
Write-Host ""

# 4. Vérification DNS
Write-Host "🔍 Vérification DNS actuelle:" -ForegroundColor Blue
try {
    $dnsResult = nslookup $Domain 8.8.8.8 2>$null
    if ($dnsResult -match "pages\.dev") {
        Write-Host "   ✅ DNS déjà configuré !" -ForegroundColor Green
    } elseif ($dnsResult -match "NXDOMAIN|can't find") {
        Write-Host "   ⏳ DNS pas encore configuré" -ForegroundColor Yellow
    } else {
        Write-Host "   ⚠️ DNS pointe vers autre chose" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⏳ DNS en cours de propagation" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Auto-configuration terminée !" -ForegroundColor Green