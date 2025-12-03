#!/usr/bin/env pwsh
# Script PowerShell pour démarrer le serveur avec ngrok

Write-Host "🌐 Démarrage du serveur de domaines avec ngrok" -ForegroundColor Cyan
Write-Host ""

# Vérifier si ngrok est installé
try {
    $ngrokVersion = & ngrok version 2>$null
    Write-Host "✅ ngrok détecté: $($ngrokVersion[0])" -ForegroundColor Green
} catch {
    Write-Host "❌ ngrok n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pour installer ngrok:" -ForegroundColor Yellow
    Write-Host "  1. Télécharger depuis https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "  2. Ou via chocolatey: choco install ngrok" -ForegroundColor Yellow  
    Write-Host "  3. Ou via npm: npm install -g ngrok" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

Write-Host ""

# Démarrer le serveur en arrière-plan
Write-Host "🚀 Démarrage du serveur sur port 3003..." -ForegroundColor Blue
$serverJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    npm run dev 
}

# Attendre que le serveur démarre
Start-Sleep -Seconds 3

# Tester si le serveur répond
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3003/health" -TimeoutSec 5
    Write-Host "✅ Serveur démarré avec succès" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Le serveur met plus de temps à démarrer..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌐 Exposition avec ngrok..." -ForegroundColor Magenta
Write-Host ""
Write-Host "📝 Notes:" -ForegroundColor Yellow
Write-Host "  - URL ngrok affichée ci-dessous" -ForegroundColor Yellow
Write-Host "  - Interface web: http://127.0.0.1:4040" -ForegroundColor Yellow
Write-Host "  - Ctrl+C pour arrêter" -ForegroundColor Yellow
Write-Host ""

# Démarrer ngrok avec gestion d'erreurs
Write-Host "🌐 Exposition avec ngrok..." -ForegroundColor Magenta
Write-Host ""
Write-Host "📝 Notes:" -ForegroundColor Yellow
Write-Host "  - URL ngrok affichée ci-dessous" -ForegroundColor Yellow
Write-Host "  - Interface web: http://127.0.0.1:4040" -ForegroundColor Yellow
Write-Host "  - Ctrl+C pour arrêter" -ForegroundColor Yellow
Write-Host ""

# Démarrer ngrok avec logs et gestion d'erreurs
try {
    Write-Host "🔄 Tentative de lancement ngrok..." -ForegroundColor Blue
    & ngrok http 3003 --log=stdout --log-level=info
} catch {
    Write-Host ""
    Write-Host "❌ Erreur ngrok:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solutions:" -ForegroundColor Yellow
    Write-Host "  1. Créer compte gratuit: https://dashboard.ngrok.com/" -ForegroundColor Yellow
    Write-Host "  2. Ajouter authtoken: ngrok config add-authtoken VOTRE_TOKEN" -ForegroundColor Yellow
    Write-Host "  3. Lancer le diagnostic: ./diagnose-ngrok.ps1" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Appuyez sur Entrée pour continuer"
} finally {
    # Nettoyer à la fermeture
    Write-Host ""
    Write-Host "🧹 Nettoyage..." -ForegroundColor Yellow
    Stop-Job -Job $serverJob -Force
    Remove-Job -Job $serverJob -Force
    Write-Host "👋 Tunnel ngrok fermé" -ForegroundColor Cyan
}