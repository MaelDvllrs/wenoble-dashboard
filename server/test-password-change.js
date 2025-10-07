// Script de test simple pour le changement de mot de passe
// Usage: node test-password-change.js

const axios = require('axios');

const testPasswordChange = async () => {
  console.log('🧪 Test du changement de mot de passe...\n');
  
  try {
    // D'abord, tester sans token (doit échouer)
    console.log('1. Test sans token (doit échouer):');
    try {
      await axios.post('http://localhost:3001/api/users/change-password', {
        currentPassword: 'test123',
        newPassword: 'newtest123'
      });
    } catch (e) {
      console.log('✅ Échec attendu:', e.response?.status, e.response?.data?.message);
    }
    
    console.log('\n2. Pour tester avec un vrai token:');
    console.log('- Connectez-vous sur l\'application');
    console.log('- Récupérez le token depuis les cookies du navigateur');
    console.log('- Utilisez ce script avec le token:');
    console.log(`
const token = 'VOTRE_TOKEN_ICI';
const response = await axios.post('http://localhost:3001/api/users/change-password', {
  currentPassword: 'votre_mot_de_passe_actuel',
  newPassword: 'nouveau_mot_de_passe'
}, {
  headers: { Authorization: \`Bearer \${token}\` }
});
console.log('Résultat:', response.data);
    `);
    
  } catch (error) {
    console.error('❌ Erreur de test:', error.message);
  }
};

// Exécuter le test
testPasswordChange();