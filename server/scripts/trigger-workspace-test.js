// Script pour créer un utilisateur de test et déclencher les logs
// À exécuter dans votre terminal ou via un client REST

// URL de votre API (remplacez par votre port)
const API_URL = 'http://localhost:3001'; // ou votre port

// 1. Créer un utilisateur de test
async function createTestUser() {
  const testEmail = `test-workspace-${Date.now()}@example.com`;
  const testUsername = `testuser${Date.now()}`;
  
  console.log('🚀 Creation utilisateur test:', testEmail);
  
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        username: testUsername
      })
    });
    
    const result = await response.json();
    console.log('✅ Utilisateur créé:', result);
    
    if (result.success) {
      console.log('');
      console.log('📧 IMPORTANT: Allez vérifier votre email de test et cliquez sur le lien de confirmation');
      console.log('📊 Puis consultez Dashboard Supabase > Logs > Postgres Logs');
      console.log('🔍 Recherchez les logs avec 🚀, ✅, ❌, 🏢');
      console.log('');
      console.log('Email de test:', testEmail);
      console.log('Username:', testUsername);
    }
    
    return { email: testEmail, username: testUsername, result };
    
  } catch (error) {
    console.error('❌ Erreur création utilisateur:', error);
    return null;
  }
}

// 2. Alternative: Tester avec un utilisateur existant
async function debugExistingUser(userEmail) {
  console.log('🔍 Debug utilisateur existant:', userEmail);
  
  try {
    const response = await fetch(`${API_URL}/auth/admin/debug-workspace-creation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_email: userEmail
      })
    });
    
    const result = await response.json();
    console.log('📊 Résultats debug:', JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur debug:', error);
    return null;
  }
}

// Utilisation - choisissez une option:

// Option A: Créer un nouvel utilisateur (recommandé)
console.log('=== CRÉATION NOUVEL UTILISATEUR DE TEST ===');
createTestUser();

// Option B: Debug utilisateur existant (décommentez et remplacez l'email)
// console.log('=== DEBUG UTILISATEUR EXISTANT ===');
// debugExistingUser('email-utilisateur-existant@example.com');