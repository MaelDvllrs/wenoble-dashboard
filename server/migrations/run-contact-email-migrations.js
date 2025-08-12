#!/usr/bin/env node

/**
 * Script de migration pour le système d'emails de contact
 * Ce script exécute les migrations nécessaires pour mettre en place le nouveau système d'emails
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Configuration de la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration(filename, description) {
  try {
    console.log(`\n🔄 Exécution de la migration: ${description}`);
    
    const migrationPath = path.join(__dirname, filename);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    
    console.log(`✅ Migration réussie: ${description}`);
  } catch (error) {
    console.error(`❌ Erreur lors de la migration ${description}:`, error.message);
    throw error;
  }
}

async function runContactEmailMigrations() {
  console.log('🚀 Début des migrations pour le système d\'emails de contact\n');
  
  try {
    // 1. Créer la table website_email
    await runMigration(
      'create_website_email_table.sql',
      'Création de la table website_email'
    );
    
    // 2. Ajouter website_id à contact_website
    await runMigration(
      'add_website_id_to_contact_website.sql',
      'Ajout de website_id à la table contact_website'
    );
    
    // 3. Initialiser les emails par défaut
    await runMigration(
      'initialize_default_emails.sql',
      'Initialisation des emails par défaut'
    );
    
    console.log('\n🎉 Toutes les migrations ont été exécutées avec succès !');
    console.log('\n📝 Résumé des changements:');
    console.log('   - Table website_email créée');
    console.log('   - Colonne website_id ajoutée à contact_website');
    console.log('   - Emails par défaut initialisés pour les sites existants');
    console.log('\n⚠️  Important:');
    console.log('   - Les formulaires de contact doivent maintenant envoyer le websiteId');
    console.log('   - Les emails sont maintenant configurables via l\'interface d\'administration');
    
  } catch (error) {
    console.error('\n💥 Erreur lors de l\'exécution des migrations:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Exécuter les migrations si le script est appelé directement
if (require.main === module) {
  runContactEmailMigrations();
}

module.exports = { runContactEmailMigrations };
