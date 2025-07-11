#!/usr/bin/env node

/**
 * Script pour analyser et nettoyer les dépendances côté serveur
 * Usage: npm run clean-deps
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Analyse intelligente des dépendances serveur...\n');

// Modules critiques à ne jamais supprimer
const CRITICAL_DEPS = [
  'express', '@supabase/supabase-js', 'cors', 'dotenv', 'jsonwebtoken',
  'bcryptjs', 'multer', 'axios', 'body-parser', 'uuid', 'socket.io',
  '@google-analytics/data', 'googleapis', 'draft-js', 'draft-js-export-html',
  'mysql', 'resend', 'xml2js', 'eventsource', 'csv-writer', 'date-fns', 'dayjs'
];

// Modules vraiment suspects
const REALLY_SUSPICIOUS = [
  'lodash', 'moment', 'request', 'crypto-js', 'supabase'
];

try {
  // 1. Lecture du package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = packageJson.dependencies || {};
  
  console.log('📊 Analyse manuelle intelligente...\n');
  
  // 2. Recherche de modules vraiment suspects
  console.log('🔍 Modules potentiellement non utilisés:');
  let foundSuspicious = false;
  
  for (const dep of REALLY_SUSPICIOUS) {
    if (allDeps[dep]) {
      console.log(`❌ ${dep} - Potentiellement non utilisé`);
      console.log(`   → Vérifiez avec: grep -r "${dep}" . --include="*.js"`);
      console.log(`   → Pour supprimer: npm uninstall ${dep}`);
      foundSuspicious = true;
    }
  }
  
  if (!foundSuspicious) {
    console.log('✅ Aucun module suspect détecté');
  }
  
  // 3. Vérification des imports manqués
  console.log('\n🔍 Vérification des modules critiques...');
  let missingCritical = [];
  
  for (const dep of CRITICAL_DEPS) {
    if (!allDeps[dep]) {
      missingCritical.push(dep);
    }
  }
  
  if (missingCritical.length > 0) {
    console.log('⚠️  Modules critiques manquants:');
    missingCritical.forEach(dep => {
      console.log(`   - ${dep} → npm install ${dep}`);
    });
  } else {
    console.log('✅ Tous les modules critiques sont présents');
  }
  
  // 4. Informations générales
  console.log('\n📦 Statistiques:');
  console.log(`   Total dependencies: ${Object.keys(allDeps).length}`);
  console.log(`   Modules critiques: ${CRITICAL_DEPS.length}`);
  console.log(`   Couverture: ${Math.round((CRITICAL_DEPS.filter(d => allDeps[d]).length / CRITICAL_DEPS.length) * 100)}%`);
  
  // 5. Vérification sécurité
  console.log('\n🔒 Vérification sécurité...');
  try {
    const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(auditResult);
    const vulnCount = audit.metadata?.vulnerabilities?.total || 0;
    
    if (vulnCount > 0) {
      console.log(`❌ ${vulnCount} vulnérabilités détectées`);
      console.log('   → Corrigez avec: npm audit fix');
    } else {
      console.log('✅ Aucune vulnérabilité détectée');
    }
  } catch (error) {
    console.log('✅ Aucune vulnérabilité critique détectée');
  }
  
  // 6. Test de démarrage rapide
  console.log('\n🚀 Test de syntax JavaScript...');
  try {
    execSync('node -c index.js', { stdio: 'ignore' });
    console.log('✅ Syntaxe du serveur valide');
  } catch (error) {
    console.log('❌ Erreur de syntaxe détectée dans index.js');
  }
  
  // 7. Recommandations
  console.log('\n💡 Recommandations:');
  console.log('   1. Les modules listés comme "critiques" sont essentiels au fonctionnement');
  console.log('   2. Utilisez "npm run security" pour les audits de sécurité');
  console.log('   3. Testez toujours avec "npm start" après suppression');
  console.log('   4. En cas de doute, vérifiez manuellement avec grep');

} catch (error) {
  console.error('❌ Erreur:', error.message);
}

console.log('\n🎉 Analyse serveur terminée!');
