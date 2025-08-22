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

// Déconnexion
export const signOut = async () => {
  await supabase.auth.signOut();
  Cookies.remove('token');
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
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.access_token) {
    Cookies.set('token', session.access_token, {
      expires: 30,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax'
    });
  } else {
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