const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authToken');
const { supabaseServer } = require('../supabase');

// POST /user/change-email { newEmail, currentPassword }
router.post('/user/change-email', authenticateToken, async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const { newEmail, currentPassword } = req.body;
  if (!newEmail || !currentPassword) {
    console.error('newEmail et currentPassword requis');
    return res.status(400).json({ success: false, message: 'newEmail et currentPassword requis' });
  }
  try {
    const supabase = supabaseServer(token);
    // Re-auth with current password
    const { data: authUser, error: authGetError } = await supabase.auth.getUser(token);
    if (authGetError) return res.status(401).json({ success: false, message: 'Token invalide' });

    const currentEmail = authUser.user.email;
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: currentEmail, password: currentPassword });
    if (reauthError) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }
    // Update email (Supabase enverra un mail de confirmation si paramétré)
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({ email: newEmail }, { emailRedirectTo: `${req.headers.origin || 'http://localhost:5173'}/auth/callback` });
    if (updateError) {
      console.error('updateUser error:', updateError);
      return res.status(400).json({ success: false, message: updateError.message });
    }
    return res.json({ success: true, message: 'Email de confirmation envoyé', pendingEmail: updateData?.user?.new_email || null });
  } catch (e) {
    console.error('change-email error:', e);
    return res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});

// POST /user/change-password { currentPassword, newPassword }
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
    // Re-auth
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reauthError) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      return res.status(400).json({ success: false, message: updateError.message });
    }
    return res.json({ success: true, message: 'Mot de passe modifié' });
  } catch (e) {
    console.error('change-password error:', e);
    return res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});

router.get('/user/login-logs', authenticateToken, async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const { limit = 50, from, to } = req.query;

  try {
    const supabase = supabaseServer(token);
    const { data: authUser, error: authGetError } = await supabase.auth.getUser(token);
    if (authGetError || !authUser?.user?.id) {
      return res.status(401).json({ success: false, message: 'Token invalide' });
    }

    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    let query = supabase
      .from('user_login_logs')
      .select('id,user_id,ip,user_agent,success,method,location,created_at')
      .eq('user_id', authUser.user.id)
      .order('created_at', { ascending: false })
      .limit(lim);

    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;
    if (error) return res.status(400).json({ success: false, message: error.message });

    return res.json({ success: true, count: data.length, logs: data });
  } catch (e) {
    console.error('login-logs list error:', e);
    return res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});


router.post('/user/login-logs', authenticateToken, async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const { success = true, method = 'password', location = null } = req.body || {};

  // IP + User-Agent
  const ip =
    (req.headers['x-forwarded-for']?.toString().split(',')[0] ?? '') ||
    req.socket?.remoteAddress ||
    '';
  const user_agent = req.headers['user-agent'] || '';

  try {
    const supabase = supabaseServer(token);
    const { data: authUser, error: authGetError } = await supabase.auth.getUser(token);
    if (authGetError || !authUser?.user?.id) {
      return res.status(401).json({ success: false, message: 'Token invalide' });
    }

    const { error: insertError } = await supabase
      .from('user_login_logs')
      .insert({
        user_id: authUser.user.id,
        ip,
        user_agent,
        success,
        method,
        location
      });

    if (insertError) {
      return res.status(400).json({ success: false, message: insertError.message });
    }
    return res.json({ success: true, message: 'Log de connexion enregistré' });
  } catch (e) {
    console.error('login-logs insert error:', e);
    return res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});


module.exports = router;
