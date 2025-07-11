# Guide de nettoyage des modules non utilisés

## Résumé des actions effectuées

### 🗑️ Modules supprimés
- `@ffmpeg/core` - Outil de manipulation vidéo non utilisé
- `@ffmpeg/ffmpeg` - Outil de manipulation vidéo non utilisé  
- `socket.io-client` - Client WebSocket non utilisé côté client
- `@types/react-dom` - Types TypeScript non nécessaires

### 🧹 Imports nettoyés
- Suppression d'imports non utilisés dans `App.jsx` :
  - `createContext, useState, useCallback` 
  - `SnackbarContext` (doublon avec Theme/snackbar.jsx)
- Nettoyage de la configuration Vite (retrait de l'exclusion @ffmpeg)

### 📊 Économies réalisées
- **Taille du package.json** : Réduction des dépendances installées
- **Temps d'installation** : Réduction du temps `npm install`
- **Bundle size** : Potentielle réduction du bundle final
- **Sécurité** : Moins de dépendances = moins de vulnérabilités potentielles

## 🔧 Outils installés

### Scripts NPM ajoutés
```bash
npm run clean-deps    # Lance l'analyse et le nettoyage des dépendances
npm run analyze       # Lance seulement l'analyse depcheck
```

### Configuration
- `.depcheckrc` : Configuration de depcheck pour ignorer les faux positifs
- `scripts/clean-unused-deps.js` : Script automatisé de nettoyage

## 📋 Processus de nettoyage futur

### 1. Analyse régulière
```bash
npm run analyze
```

### 2. Nettoyage manuel
```bash
# Pour supprimer des dépendances spécifiques
npm uninstall package1 package2

# Pour supprimer des devDependencies
npm uninstall --save-dev package1 package2
```

### 3. Vérification après nettoyage
```bash
npm run build    # Vérifier que la build fonctionne
npm run dev      # Tester en développement
```

## ⚠️ Attention aux faux positifs

Certaines dépendances peuvent être utilisées de manière dynamique :
- Plugins Vite/Webpack
- Polyfills
- Types TypeScript (si vous utilisez TypeScript)
- Dépendances utilisées uniquement en production

## 🎯 Bonnes pratiques

### 1. Audit régulier
- Lancez `npm run analyze` chaque mois
- Vérifiez avant chaque release majeure

### 2. Installation prudente
```bash
# Préférez --save-exact pour fixer les versions
npm install package --save-exact

# Distinguez dependencies vs devDependencies
npm install package --save-dev  # pour les outils de dev
```

### 3. Documentation
- Documentez les dépendances "spéciales" (utilisées dynamiquement)
- Maintenez un fichier DEPENDENCIES.md si nécessaire

## 🔍 Commandes utiles

```bash
# Analyse des dépendances installées
npm list --depth=0

# Vérification des vulnérabilités
npm audit

# Mise à jour des dépendances
npm update

# Bundle analyzer (nécessite webpack-bundle-analyzer)
npm install --save-dev webpack-bundle-analyzer
npx webpack-bundle-analyzer dist/static/js/*.js
```

## 📈 Impact sur les performances

Le nettoyage effectué contribue à :
- ✅ Réduction de l'empreinte du projet
- ✅ Installation plus rapide
- ✅ Moins de vulnérabilités potentielles
- ✅ Bundle plus léger (selon les modules supprimés)
- ✅ Maintenance plus simple

---

*Dernière mise à jour : $(date)*
