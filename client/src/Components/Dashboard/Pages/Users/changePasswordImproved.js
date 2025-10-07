// Version côté client qui gère proprement la déconnexion après changement de mot de passe
// À utiliser dans AccountSecurity.jsx

const changePasswordWithProperLogout = async (e) => {
  e.preventDefault();
  try {
    if (!password.current) {
      showSnackbar('error', 'Entrez votre mot de passe actuel');
      return;
    }
    if (!password.new || password.new.length < 8) {
      showSnackbar('error', 'Mot de passe trop court (min 8)');
      return;
    }
    if (password.new !== password.confirm) {
      showSnackbar('error', 'Confirmation incorrecte');
      return;
    }
    
    console.log('🔐 Changement de mot de passe en cours...');
    
    const response = await Axios.post(`${apiUrl}/user/change-password`, {
      currentPassword: password.current,
      newPassword: password.new
    }, { headers: { 'Authorization': `Bearer ${token}` } });
    
    console.log('📥 Réponse serveur:', response.data);
    
    if (response.data.success) {
      setPassword({ current: '', new: '', confirm: '' });
      
      if (response.data.requiresTokenUpdate && response.data.newToken) {
        // Cas 1: Nouveau token reçu, le mettre à jour
        console.log('🔄 Mise à jour du token...');
        Cookies.set('token', response.data.newToken, { 
          expires: 7,
          secure: window.location.protocol === 'https:',
          sameSite: 'strict'
        });
        showSnackbar('success', 'Mot de passe modifié avec succès');
        
        // Recharger après 2 secondes pour s'assurer que tout fonctionne
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
      } else if (response.data.requiresReconnection || response.data.sessionInvalidated) {
        // Cas 2: Déconnexion nécessaire (plus courant et plus sécurisé)
        console.log('🚪 Déconnexion sécurisée en cours...');
        showSnackbar('success', 'Mot de passe modifié avec succès. Reconnexion automatique...');
        
        // Attendre 3 secondes pour que l'utilisateur voie le message
        setTimeout(() => {
          // Supprimer le token
          Cookies.remove('token');
          
          // Rediriger vers la page de connexion avec un message
          const loginUrl = new URL('/login', window.location.origin);
          loginUrl.searchParams.set('message', 'password-changed');
          window.location.href = loginUrl.toString();
        }, 3000);
        
      } else {
        // Cas 3: Succès simple
        showSnackbar('success', 'Mot de passe modifié avec succès');
      }
    }
  } catch (e) {
    console.error('❌ Erreur changement mot de passe:', e);
    
    // Vérifier si c'est une erreur de session invalide
    if (e.response?.status === 401 || e.message?.includes('AuthSessionMissingError')) {
      console.log('🔓 Session expirée détectée, redirection vers login...');
      showSnackbar('warning', 'Session expirée. Reconnexion nécessaire.');
      
      setTimeout(() => {
        Cookies.remove('token');
        window.location.href = '/login';
      }, 2000);
      
    } else {
      const errorMessage = e.response?.data?.message || 'Échec du changement de mot de passe';
      showSnackbar('error', errorMessage);
    }
  }
};