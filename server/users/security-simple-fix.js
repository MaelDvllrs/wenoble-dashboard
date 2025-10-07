// Solution alternative : utiliser la déconnexion propre avec message explicatif
// À remplacer dans security.js si la reconnexion automatique ne fonctionne pas

router.post('/user/change-password', authenticateToken, async (req, res) => {
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
    
    // Vérifier l'ancien mot de passe en tentant une connexion
    const { supabaseServerAdmin } = require('../supabase');
    const tempSupabase = supabaseServerAdmin();
    
    const { error: reauthError } = await tempSupabase.auth.signInWithPassword({ 
      email, 
      password: currentPassword 
    });
    
    if (reauthError) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }
    
    // Déconnecter la session temporaire
    await tempSupabase.auth.signOut();
    
    // Mettre à jour le mot de passe (invalide automatiquement tous les tokens)
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      return res.status(400).json({ success: false, message: updateError.message });
    }
    
    console.log('Mot de passe changé avec succès pour:', email);
    
    // Retourner un succès avec instruction de reconnexion
    return res.json({ 
      success: true, 
      message: 'Mot de passe modifié avec succès. Reconnexion en cours...',
      requiresReconnection: true,
      sessionInvalidated: true
    });
    
  } catch (e) {
    console.error('change-password error:', e);
    return res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});