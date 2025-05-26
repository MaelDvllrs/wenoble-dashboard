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
      persistSession: true
    }
  }
);

// Authentification avec email/mot de passe
export const signInWithEmail = async (email, password, rememberMe = false) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  
  // Stocker le token dans un cookie pour les API existantes
  if (data.session) {
    Cookies.set('token', data.session.access_token, {
      expires: rememberMe ? 7 : 1,
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