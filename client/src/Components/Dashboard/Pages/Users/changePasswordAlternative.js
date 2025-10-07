// Alternative simple : déconnexion propre après changement de mot de passe
// À utiliser si la reconnexion automatique pose des problèmes

const changePasswordSimple = async (e) => {
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
    
    const response = await Axios.post(`${apiUrl}/user/change-password`, {
      currentPassword: password.current,
      newPassword: password.new
    }, { headers: { 'Authorization': `Bearer ${token}` } });
    
    if (response.data.success) {
      setPassword({ current: '', new: '', confirm: '' });
      showSnackbar('success', 'Mot de passe modifié avec succès. Reconnexion en cours...');
      
      // Attendre 2 secondes puis déconnecter proprement
      setTimeout(() => {
        // Supprimer le token des cookies
        Cookies.remove('token');
        // Rediriger vers la page de connexion
        window.location.href = '/login';
      }, 2000);
    }
  } catch (e) {
    console.error('changePassword failed:', e);
    const errorMessage = e.response?.data?.message || 'Échec du changement de mot de passe';
    showSnackbar('error', errorMessage);
  }
};