// Version simplifiée de la route change-password qui déconnecte l'utilisateur
// À utiliser comme remplacement dans security.js si la reconnexion automatique pose problème

router.post('/user/change-password-simple', authenticateToken, async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'currentPassword et newPassword requis' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'Mot de passe trop court (min 8)' });
  }
  
  try {
    const supabase = supabaseServer(token);
    const { data: authUser, error: authGetError } = await supabase.auth.getUser(token);
    if (authGetError) return res.status(401).json({ success: false, message: 'Token invalide' });
    
    const email = authUser.user.email;
    
    // Vérifier l'ancien mot de passe
    const { error: reauthError } = await supabase.auth.signInWithPassword({ 
      email, 
      password: currentPassword 
    });
    if (reauthError) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }
    
    // Mettre à jour le mot de passe (invalide automatiquement tous les tokens)
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      return res.status(400).json({ success: false, message: updateError.message });
    }
    
    // Informer le client que le mot de passe a été changé et qu'il doit se reconnecter
    return res.json({ 
      success: true, 
      message: 'Mot de passe modifié avec succès',
      requiresReconnection: true
    });
    
  } catch (e) {
    console.error('change-password error:', e);
    return res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});