# Script pour configurer automatiquement le DNS dans Cloudflare
# Une fois que les nameservers sont changés et que la zone est active

$CLOUDFLARE_API_TOKEN = "mezFOkw_EAmVz7hTLyf3ugHZmSZIsDkvX7_njL2k"
$ZONE_ID = "62a33018498fa9444fbef3b755db5f36"
$DOMAIN = "testwenoble.fr"
$TARGET = "attique-test.pages.dev"

$headers = @{
    "Authorization" = "Bearer $CLOUDFLARE_API_TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "🔍 Vérification du statut de la zone..." -ForegroundColor Cyan

# Vérifier si la zone est active
$zone = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$ZONE_ID" -Method GET -Headers $headers

Write-Host "Zone: $($zone.result.name)"
Write-Host "Status: $($zone.result.status)"

if ($zone.result.status -ne "active") {
    Write-Host ""
    Write-Host "⚠️  La zone n'est pas encore active." -ForegroundColor Yellow
    Write-Host "Veuillez d'abord changer les nameservers chez Hostinger:" -ForegroundColor Yellow
    Write-Host ""
    $zone.result.name_servers | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
    Write-Host ""
    Write-Host "Une fois fait, attendez 15-60 minutes puis relancez ce script." -ForegroundColor Yellow
    exit
}

Write-Host "✅ Zone active!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Configuration du DNS..." -ForegroundColor Cyan

# Récupérer les DNS records existants
$existingRecords = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name=$DOMAIN" -Method GET -Headers $headers

# Supprimer les anciens A records si présents
foreach ($record in $existingRecords.result) {
    if ($record.type -eq "A" -or $record.type -eq "AAAA") {
        Write-Host "🗑️  Suppression ancien record $($record.type): $($record.content)" -ForegroundColor Yellow
        Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$($record.id)" -Method DELETE -Headers $headers | Out-Null
    }
}

# Vérifier si le CNAME existe déjà
$cnameExists = $existingRecords.result | Where-Object { $_.type -eq "CNAME" -and $_.name -eq $DOMAIN }

if ($cnameExists) {
    Write-Host "✅ CNAME déjà configuré: $DOMAIN -> $($cnameExists.content)" -ForegroundColor Green
} else {
    # Créer le CNAME record
    Write-Host "➕ Ajout du CNAME: $DOMAIN -> $TARGET" -ForegroundColor Cyan
    
    $body = @{
        type = "CNAME"
        name = "@"
        content = $TARGET
        ttl = 1  # Auto TTL
        proxied = $true  # Orange cloud (proxied)
    } | ConvertTo-Json

    try {
        $result = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" -Method POST -Headers $headers -Body $body
        
        if ($result.success) {
            Write-Host "✅ CNAME créé avec succès!" -ForegroundColor Green
            Write-Host "   $DOMAIN -> $TARGET (Proxied)" -ForegroundColor White
        } else {
            Write-Host "❌ Erreur lors de la création du CNAME:" -ForegroundColor Red
            $result.errors | ConvertTo-Json -Depth 3
        }
    } catch {
        Write-Host "❌ Exception: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔍 Vérification du statut Cloudflare Pages..." -ForegroundColor Cyan

# Vérifier le statut dans Cloudflare Pages
Start-Sleep -Seconds 5
$pagesDomains = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/b3e0bb239dc9ae2d7c5a10589e1f84b2/pages/projects/attique-test/domains" -Method GET -Headers $headers
$pagesDomain = $pagesDomains.result | Where-Object { $_.name -eq $DOMAIN }

Write-Host "Status: $($pagesDomain.status)"
Write-Host "Verification: $($pagesDomain.verification_data.status)"

if ($pagesDomain.status -eq "active") {
    Write-Host ""
    Write-Host "🎉 Configuration terminée! Le domaine est actif." -ForegroundColor Green
    Write-Host "Testez: https://$DOMAIN" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "⏳ Le domaine est en cours de validation..." -ForegroundColor Yellow
    Write-Host "Cela peut prendre 5-15 minutes." -ForegroundColor Yellow
    Write-Host "Cloudflare génère également le certificat SSL automatiquement." -ForegroundColor Yellow
}
