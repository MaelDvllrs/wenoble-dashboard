# Configuration de la Confirmation d'Email - Supabase

## Problème résolu
Lors de l'inscription, l'utilisateur reçoit bien l'email de confirmation mais la confirmation ne fonctionne pas car Supabase ne sait pas comment traiter la redirection.

## Solution mise en place

### 1. Page de Confirmation d'Email
**Fichier :** `client/src/Auth/EmailConfirmation.jsx`
- Traite les paramètres de confirmation (`access_token`, `refresh_token`, `type`)
- Établit la session utilisateur
- Affiche le statut de confirmation (succès/erreur)

### 2. Route ajoutée
**Route :** `/email-confirmation`
- Accessible depuis `App.jsx`
- Gère la redirection après clic sur le lien d'email

## Configuration Supabase Dashboard

### 1. URL de redirection
Dans votre Dashboard Supabase :
1. **Authentication → URL Configuration**
2. **Site URL :** `http://localhost:3000` (en dev) ou votre domaine en prod
3. **Redirect URLs :** Ajouter :
   ```
   http://localhost:3000/email-confirmation
   http://localhost:3000/oauth-callback
   ```

### 2. Template d'email (Optionnel)
Dans **Authentication → Email Templates → Confirm signup** :
```html
<h2>Confirmez votre inscription</h2>
<p>Suivez ce lien pour confirmer votre inscription :</p>
<p><a href="{{ .ConfirmationURL }}">Confirmer mon compte</a></p>
```

### 3. Variables d'environnement
La variable `{{ .ConfirmationURL }}` sera automatiquement :
```
https://votre-projet.supabase.co/auth/v1/verify?token=xxx&type=signup&redirect_to=http://localhost:3000/email-confirmation
```

## Test du flux complet

### 1. Inscription
```bash
# L'utilisateur s'inscrit
POST /register
{
  "email": "test@example.com",
  "password": "password123",
  "username": "testuser"
}
```

### 2. Email reçu
L'utilisateur reçoit un email avec un lien qui ressemble à :
```
https://zaagwamadxckevfocnul.supabase.co/auth/v1/verify?token=xxx&type=signup&redirect_to=http://localhost:3000/email-confirmation
```

### 3. Clic sur le lien
1. Supabase traite la confirmation
2. Redirige vers `/email-confirmation` avec les tokens en paramètres
3. La page `EmailConfirmation.jsx` traite les tokens
4. Le trigger PostgreSQL crée le profil utilisateur
5. L'utilisateur voit un message de succès

### 4. Connexion
L'utilisateur peut maintenant se connecter normalement.

## Débogage

### Vérifier les paramètres URL
Dans `EmailConfirmation.jsx`, les logs montrent :
```javascript
console.log('Confirmation parameters:', { access_token, refresh_token, type });
```

### Vérifier la base de données
```sql
-- Voir les utilisateurs confirmés
SELECT id, email, email_confirmed_at FROM auth.users;

-- Voir les profils créés
SELECT id, email, username FROM public.users;
```

### Erreurs communes
1. **URL de redirection non configurée** → Ajouter dans Supabase Dashboard
2. **Tokens manquants** → Vérifier la configuration du template d'email
3. **Trigger non installé** → Exécuter les migrations SQL