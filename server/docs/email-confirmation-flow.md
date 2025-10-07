# Gestion des Profils Utilisateur avec Confirmation Email

Quand la confirmation par email est activée dans Supabase, les utilisateurs ne sont pas immédiatement "confirmés" après l'inscription. Le profil utilisateur doit être créé après la confirmation de l'email.

## Méthodes implémentées :

### 1. Trigger PostgreSQL avec Table Temporaire (Recommandé) ✅
**Fichier :** `migrations/create_user_profile_trigger_with_pending.sql`

**Fonctionnement :**
- Se déclenche automatiquement quand `email_confirmed_at` passe de NULL à une date
- Utilise une table temporaire `pending_user_profiles` pour stocker les usernames OAuth
- Crée automatiquement le profil dans `public.users` avec le bon username
- Nettoie automatiquement la table temporaire après utilisation

**Gestion du Username :**
- **Inscription classique :** Username stocké dans `raw_user_meta_data`
- **OAuth :** Username stocké dans `pending_user_profiles` temporairement
- **Fallback :** Partie avant @ de l'email

**Avantages :**
- Automatique, aucune intervention nécessaire
- Gère correctement les usernames pour OAuth et inscription classique
- Fonctionne même si l'utilisateur confirme son email hors de l'application
- Très fiable

### 2. Fallback lors du Login ✅
**Localisation :** Endpoint `/login` dans `auth.js`

**Fonctionnement :**
- Vérifie si le profil existe lors de chaque connexion
- Crée le profil s'il manque
- Utilise les données de `auth.users`

**Avantages :**
- Sécurité supplémentaire au cas où le trigger échoue
- Récupère automatiquement les profils manqués

### 3. Webhook (Optionnel) ✅
**Endpoint :** `POST /webhook/user-confirmed`

**Fonctionnement :**
- Supabase peut appeler ce webhook lors d'événements
- Crée le profil quand l'email est confirmé
- Alternative au trigger PostgreSQL

## Configuration Supabase :

### Activer la confirmation email :
1. Dashboard Supabase → Authentication → Settings
2. ✅ Enable email confirmations
3. Configurer les templates d'email

### Installer le trigger (Recommandé) :
```sql
-- Exécuter le contenu de migrations/create_user_profile_trigger.sql
-- dans l'éditeur SQL de Supabase
```

### Configurer le webhook (Optionnel) :
1. Dashboard Supabase → Database → Webhooks
2. Ajouter un webhook :
   - Table: `auth.users`
   - Events: `UPDATE`
   - URL: `https://votre-domaine.com/webhook/user-confirmed`

## Flux complet :

1. **Inscription :** Utilisateur s'inscrit → Supabase crée l'utilisateur avec `email_confirmed_at = NULL`
2. **Email :** Utilisateur reçoit l'email de confirmation
3. **Confirmation :** Utilisateur clique sur le lien → `email_confirmed_at` est mis à jour
4. **Trigger :** Se déclenche automatiquement → Crée le profil dans `public.users`
5. **Login :** Utilisateur se connecte → Vérification fallback au cas où

## Structure des tables :

### Table principale `public.users` :
```sql
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table temporaire `public.pending_user_profiles` :
```sql
CREATE TABLE public.pending_user_profiles (
  user_id UUID PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  oauth_provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Utilisation :** Stocke temporairement les usernames des utilisateurs OAuth en attente de confirmation d'email.

## Test :
1. S'inscrire avec un nouvel email
2. Vérifier que le profil n'est PAS créé immédiatement
3. Confirmer l'email via le lien reçu
4. Vérifier que le profil est maintenant créé dans `public.users`