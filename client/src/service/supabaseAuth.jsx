import { createClient } from '@supabase/supabase-js';
import Cookies from 'js-cookie';
import config from '../config';

// Créer une instance unique de Supabase
export const supabase = createClient(
  config.supabaseUrl, 
  config.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Authentification avec email/mot de passe
export const signInWithEmail = async (email, password, rememberMe = true) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  
  // Stocker le token dans un cookie pour les API existantes
  if (data.session) {
    // Expiration longue (30j) pour persister après fermeture du navigateur
    Cookies.set('token', data.session.access_token, {
      expires: rememberMe ? 30 : 7, // si besoin tu peux remettre 7 pour non-remember
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax'
    });
  }
  
  return data;
};

// Inscription avec email/mot de passe
export const signUpWithEmail = async (email, password, username) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
        is_admin: false
      }
    }
  });
  
  if (error) throw error;
  
  return data;
};

// Déconnexion
export const signOut = async () => {
  await supabase.auth.signOut();
  Cookies.remove('token');
};

// Réinitialisation du mot de passe
export const resetPassword = async (email) => {
  console.log('resetPassword appelé avec:', email);
  console.log('Redirect URL sera:', `${window.location.origin}/reset-password`);
  
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });
  
  console.log('Réponse Supabase resetPasswordForEmail:', { data, error });
  
  if (error) {
    console.error('Erreur Supabase:', error);
    throw error;
  }
  
  // Note: Supabase ne révèle pas si l'email existe ou non pour des raisons de sécurité
  // La fonction retourne toujours un succès, même si l'email n'existe pas
  console.log('✅ Demande de réinitialisation traitée par Supabase');
  
  return data;
};

// Changement d'email avec confirmation
export const changeEmail = async (newEmail, currentPassword) => {
  console.log('changeEmail appelé avec:', newEmail);
  
  // D'abord, vérifier le mot de passe actuel en tentant une reconnexion
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser?.user?.email) {
    throw new Error('Utilisateur non connecté');
  }
  
  const currentEmail = currentUser.user.email;
  
  // Vérifier le mot de passe actuel
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: currentEmail,
    password: currentPassword
  });
  
  if (signInError) {
    console.error('Mot de passe incorrect:', signInError);
    throw new Error('Mot de passe actuel incorrect');
  }
  
  // Changer l'email (Supabase enverra un email de confirmation automatiquement)
  const { data, error } = await supabase.auth.updateUser({
    email: newEmail
  });
  
  console.log('Réponse Supabase updateUser email:', { data, error });
  
  if (error) {
    console.error('Erreur changement email:', error);
    throw error;
  }
  
  console.log('✅ Demande de changement d\'email envoyée');
  return data;
};

// Authentification avec Google OAuth
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/oauth-callback`, // Redirection après authentification
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  });
  
  if (error) {
    console.error('Erreur lors de la connexion Google:', error);
    throw error;
  }
  
  return data;
};

// Récupérer la session actuelle
export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Récupérer l'utilisateur actuel
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// --- Persistence & Sync Cookie -> Access Token Rotation ---
// Sur chaque rafraîchissement ou changement d'état, on réécrit le cookie avec le nouvel access token.
// Cela évite qu'un token expiré reste dans le cookie pendant que Supabase en a généré un nouveau.
supabase.auth.onAuthStateChange((event, session) => {
  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.access_token) {
    Cookies.set('token', session.access_token, {
      expires: 30,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax'
    });
  }
  if (event === 'SIGNED_OUT') {
    Cookies.remove('token');
  }
});

// Initialisation à l'import (au démarrage de l'app) : si une session existe déjà en localStorage, synchroniser le cookie
(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const existing = Cookies.get('token');
      if (existing !== session.access_token) {
        Cookies.set('token', session.access_token, {
          expires: 30,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax'
        });
      }
    }
  } catch (e) {
    // silencieux
  }
})();