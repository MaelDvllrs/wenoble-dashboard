#!/usr/bin/env node

/**
 * Script amélioré pour analyser les dépendances
 * Usage: npm run clean-deps
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧹 Analyse des dépendances...\n');

// Modules de base à ne jamais supprimer
const CORE_DEPS = [
  'react', 'react-dom', '@vitejs/plugin-react', 'vite',
  'eslint', 'eslint-plugin-react', 'eslint-plugin-react-hooks'
];

// Modules suspectés d'être non utilisés (à vérifier manuellement)
const SUSPICIOUS_DEPS = [
  'socket.io-client', '@ffmpeg/core', '@ffmpeg/ffmpeg'
];

try {
  // 1. Lecture du package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  console.log('� Analyse manuelle des dépendances...\n');
  
  // 2. Vérification des modules suspects
  console.log('🔍 Vérification des modules potentiellement non utilisés:');
  
  for (const dep of SUSPICIOUS_DEPS) {
    if (allDeps[dep]) {
      console.log(`❌ ${dep} - Trouvé dans package.json mais semble non utilisé`);
      
      // Recherche dans le code source
      try {
        const grepResult = execSync(`grep -r "${dep}" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" | head -5 || echo "Aucune utilisation trouvée"`, 
          { encoding: 'utf8', stdio: 'pipe' });
        
        if (grepResult.trim() === 'Aucune utilisation trouvée') {
          console.log(`   → À supprimer: npm uninstall ${dep}`);
        } else {
          console.log(`   → Utilisation trouvée: ${grepResult.split('\n')[0]}`);
        }
      } catch (e) {
        console.log(`   → À vérifier manuellement`);
      }
    }
  }
  
  // 3. Vérification des tailles
  console.log('\n� Informations sur les dépendances:');
  try {
    const nodeModulesSize = execSync('du -sh node_modules/ 2>/dev/null || echo "N/A"', { encoding: 'utf8' }).trim();
    console.log(`   Taille node_modules: ${nodeModulesSize}`);
  } catch (e) {
    console.log('   Taille node_modules: Non disponible sur Windows');
  }
  
  const depCount = Object.keys(packageJson.dependencies || {}).length;
  const devDepCount = Object.keys(packageJson.devDependencies || {}).length;
  console.log(`   Dependencies: ${depCount}`);
  console.log(`   DevDependencies: ${devDepCount}`);
  
  // 4. Recommandations
  console.log('\n💡 Recommandations:');
  console.log('   1. Supprimez les modules confirmés comme non utilisés');
  console.log('   2. Testez la build après chaque suppression: npm run build');
  console.log('   3. Vérifiez que l\'app fonctionne: npm run dev');
  
  // 5. Test de build
  console.log('\n� Test de la build actuelle...');
  try {
    execSync('npm run build', { stdio: 'ignore' });
    console.log('✅ Build réussie');
  } catch (error) {
    console.log('❌ Erreur de build détectée');
  }

} catch (error) {
  console.error('❌ Erreur:', error.message);
}

console.log('\n🎉 Analyse terminée!');
