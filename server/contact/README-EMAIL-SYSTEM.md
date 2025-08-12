# Système d'emails de contact (Supabase)

## Vue d'ensemble

Le nouveau système d'emails de contact permet de configurer des adresses email spécifiques pour chaque site web, remplaçant l'ancien système qui utilisait uniquement les emails des utilisateurs. Le système utilise Supabase pour la gestion des données.

## Nouvelles fonctionnalités

### 1. Configuration des emails par site web
- Chaque site web peut avoir plusieurs adresses email configurées
- Un email principal obligatoire
- Possibilité d'activer/désactiver individuellement chaque email
- Interface d'administration dédiée accessible via le bouton ⚙️ dans la liste des contacts

### 2. Table `website_email`
```sql
CREATE TABLE website_email (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. API pour la gestion des emails (Supabase)

#### Routes disponibles :
- `GET /contact/getWebsiteEmails` - Récupérer les emails d'un site web
- `POST /contact/addWebsiteEmail` - Ajouter un nouvel email
- `DELETE /contact/deleteWebsiteEmail` - Supprimer un email
- `PUT /contact/setPrimaryEmail` - Définir un email comme principal
- `PUT /contact/toggleEmailActive` - Activer/désactiver un email

#### Authentification :
- Utilise le middleware `authenticateToken`
- Utilise `supabaseServer(token)` pour les requêtes authentifiées
- Vérifie les droits admin via `user_website` table

## Migration

### Exécution des migrations
```bash
cd server/migrations
node run-contact-email-migrations.js
```

### Étapes de migration :
1. **Création de la table `website_email`** avec contraintes et index
2. **Ajout de `website_id`** à la table `contact_website`
3. **Initialisation des emails par défaut** basés sur les emails des administrateurs

## Utilisation

### Interface d'administration
1. Aller dans **Dashboard > Contact**
2. Cliquer sur le bouton ⚙️ **Paramètres**
3. Gérer les emails :
   - Ajouter de nouveaux emails
   - Définir l'email principal
   - Activer/désactiver les emails
   - Supprimer les emails inutiles

### Envoi de formulaires de contact
Les formulaires de contact doivent maintenant inclure le `websiteId` :

```javascript
const formData = {
    apiKey: 'your-api-key',
    websiteId: 'website-id', // NOUVEAU : obligatoire
    emailSender: 'contact@example.com',
    subject: 'Nouveau message',
    html: '<p>Contenu du message</p>'
};
```

## Règles métier

### Contraintes
- Au moins un email doit être actif par site web
- Un seul email principal par site web
- L'email principal ne peut pas être désactivé s'il est le seul actif
- Seuls les administrateurs peuvent gérer les emails

### Notifications
- Tous les utilisateurs ayant accès au site web reçoivent les notifications
- Les emails sont envoyés à tous les destinataires actifs configurés

## Backward Compatibility

### Données existantes
- Les messages existants seront associés automatiquement au premier site web de l'utilisateur admin
- Les emails par défaut sont créés automatiquement à partir des emails des administrateurs

### Migration en douceur
1. Les anciens formulaires continueront de fonctionner temporairement
2. Ajout progressif du `websiteId` dans les formulaires
3. Dépréciation de l'ancien système une fois tous les formulaires mis à jour

## Avantages

1. **Flexibilité** : Chaque site web peut avoir ses propres destinataires
2. **Scalabilité** : Support de multiples emails par site
3. **Gestion centralisée** : Interface unique pour tous les emails
4. **Notifications améliorées** : Tous les collaborateurs sont informés
5. **Sécurité** : Séparation claire des emails par site web

## Support

En cas de problème :
1. Vérifier que les migrations ont été exécutées
2. Confirmer qu'au moins un email est configuré et actif
3. Vérifier que le `websiteId` est bien transmis dans les formulaires
4. Consulter les logs serveur pour les erreurs détaillées
