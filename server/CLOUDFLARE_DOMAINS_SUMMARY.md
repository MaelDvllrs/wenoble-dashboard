# Système de Gestion des Domaines Personnalisés Cloudflare

> ⚠️ **IMPORTANT**: La redirection des domaines sur Cloudflare se fera séparément et pas sur ce serveur. 
> Ce fichier est conservé pour référence historique.

<!--
## 📋 Résumé des changements

Ce système permet la gestion automatique des domaines personnalisés sur Cloudflare Pages. Lorsqu'un utilisateur souscrit à un plan avec la fonctionnalité `custom_domain`, le domaine est automatiquement configuré pour pointer vers le bon Worker Cloudflare.

## 🎯 Problème résolu

**Avant**: Les domaines personnalisés pointaient vers le VPS de production, même après migration vers Cloudflare Pages.

**Après**: Les domaines personnalisés sont automatiquement configurés pour pointer vers les Workers Cloudflare correspondants via l'API Cloudflare Pages.

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers

1. **`server/cloudflare/cloudflareDomains.js`**
   - Service de gestion des domaines via l'API Cloudflare
   - Fonctions: `addCustomDomain`, `removeCustomDomain`, `listCustomDomains`, `getDomainStatus`

2. **`server/cloudflare/README.md`**
   - Documentation technique du service Cloudflare
   - Guide d'obtention des credentials API

3. **`server/migrations/add_folder_to_websites.sql`**
   - Migration SQL pour ajouter le champ `folder` à la table `websites`
   - Ce champ contient le nom du projet Cloudflare Pages (Worker name)

4. **`server/docs/cloudflare-domain-configuration-guide.md`**
   - Guide complet d'utilisation du système
   - Flux complets, troubleshooting, exemples

5. **`server/.env.example`**
   - Template des variables d'environnement avec documentation

### Fichiers modifiés

1. **`server/website/website.js`**
   - Import du service Cloudflare
   - Ajout de 4 nouvelles routes API:
     - `POST /configure-custom-domain/:websiteId` - Configure un domaine
     - `GET /list-custom-domains/:websiteId` - Liste les domaines
     - `DELETE /remove-custom-domain/:websiteId` - Supprime un domaine
     - `GET /check-domain-status/:websiteId` - Vérifie le statut

2. **`server/subscription/subscription.js`**
   - Intégration automatique dans `POST /change-subscription-plan`
   - Détection des plans avec `custom_domain: true`
   - Configuration automatique du domaine lors de la souscription

## 🔧 Configuration requise

### 1. Variables d'environnement

Ajoutez dans `.env`:

```env
CLOUDFLARE_ACCOUNT_ID=votre_account_id
CLOUDFLARE_API_TOKEN=votre_api_token
```

**Obtenir les credentials:**

1. **Account ID**: 
   - Allez sur https://dash.cloudflare.com
   - Sélectionnez votre compte
   - L'ID est visible dans la barre latérale droite

2. **API Token**:
   - Allez dans **My Profile** → **API Tokens**
   - Créez un token avec permission: **Account > Cloudflare Pages > Edit**

### 2. Migration de la base de données

```bash
# Exécutez la migration SQL
psql -h [host] -U [user] -d [database] -f server/migrations/add_folder_to_websites.sql
```

Cette migration ajoute le champ `folder` à la table `websites`.

### 3. Configuration des sites

Pour chaque site web, configurez le champ `folder` avec le nom du projet Cloudflare Pages:

```sql
UPDATE websites 
SET folder = 'nom-du-projet-cloudflare-pages' 
WHERE id = 'website-id';
```

## 🚀 Fonctionnement

### Configuration automatique (lors de souscription)

```
┌─────────────────────────────────────────────────────┐
│  1. Utilisateur souscrit à un plan Premium          │
│     (avec custom_domain: true)                      │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  2. Route /change-subscription-plan appelée         │
│     - Création/mise à jour de l'abonnement          │
│     - Détection de la feature custom_domain         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  3. Vérification des prérequis                      │
│     - website.folder existe? (projet Cloudflare)    │
│     - website.website_slug existe? (domaine)        │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  4. Configuration Cloudflare automatique            │
│     addCustomDomain(folder, website_slug)           │
│     POST /accounts/{id}/pages/projects/{folder}/domains │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  5. Domaine configuré ✅                            │
│     Le domaine pointe maintenant vers le Worker    │
└─────────────────────────────────────────────────────┘
```

### Configuration manuelle (si besoin)

L'utilisateur peut aussi configurer manuellement via:

```javascript
POST /configure-custom-domain/:websiteId
{
  "domain": "example.com"
}
```

## 🔒 Sécurité

- ✅ Authentification JWT requise
- ✅ Vérification de l'accès au site web
- ✅ Vérification de la feature `custom_domain` dans l'abonnement
- ✅ Validation du projet Cloudflare existant
- ✅ Gestion gracieuse des erreurs (ne bloque pas la souscription)

## 📊 Architecture de la base de données

### Table `websites`

```sql
CREATE TABLE websites (
  id UUID PRIMARY KEY,
  website_name TEXT,
  website_slug TEXT,      -- Domaine personnalisé (ex: "example.com")
  folder TEXT,            -- Nom du projet Cloudflare Pages (Worker name)
  workspace_id UUID,
  ...
);
```

**Mapping**:
- `folder` → Nom du projet dans Cloudflare Pages (ex: "mon-site-123")
- `website_slug` → Domaine personnalisé de l'utilisateur (ex: "example.com")

## 🧪 Tests

### Checklist de test

- [ ] Variables d'environnement configurées
- [ ] Migration SQL exécutée
- [ ] Champ `folder` rempli pour un site test
- [ ] Plan avec `custom_domain: true` créé
- [ ] Test de souscription: domaine configuré automatiquement
- [ ] Vérification dans dashboard Cloudflare: domaine présent
- [ ] Test de configuration manuelle via API
- [ ] Test de suppression de domaine
- [ ] Test de listing des domaines

### Commandes de test

```bash
# 1. Vérifier la configuration
curl http://localhost:3002/list-custom-domains/WEBSITE_ID \
  -H "Authorization: Bearer TOKEN"

# 2. Configurer manuellement
curl -X POST http://localhost:3002/configure-custom-domain/WEBSITE_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "test.example.com"}'

# 3. Vérifier le statut
curl http://localhost:3002/check-domain-status/WEBSITE_ID?domain=test.example.com \
  -H "Authorization: Bearer TOKEN"
```

## 📖 Documentation

### Documentation technique (développeurs)
- **Guide technique**: `server/cloudflare/README.md`
- **Guide complet**: `server/docs/cloudflare-domain-configuration-guide.md`
- **Template .env**: `server/.env.example`
- **Deployment checklist**: `server/DEPLOYMENT_CHECKLIST.md`

### Documentation DNS (admins/support)
- **Guide DNS détaillé**: `server/docs/dns-configuration-guide.md`
- **Schémas de flux**: `server/docs/dns-flow-diagram.md`

### Documentation utilisateur (clients finaux)
- **Guide utilisateur simplifié**: `server/docs/user-guide-custom-domain.md`

## 🐛 Troubleshooting

### Erreur: "Variables d'environnement Cloudflare manquantes"

→ Ajoutez `CLOUDFLARE_ACCOUNT_ID` et `CLOUDFLARE_API_TOKEN` dans `.env`

### Erreur: "Aucun projet Cloudflare associé"

→ Configurez le champ `folder` dans la table `websites`

### Erreur: "Project not found" (API Cloudflare)

→ Vérifiez que le nom dans `folder` correspond à un projet existant dans Cloudflare Pages

### Le domaine ne pointe pas vers le Worker

1. Vérifiez que le domaine est ajouté dans Cloudflare Pages dashboard
2. Vérifiez que les DNS pointent vers Cloudflare
3. Attendez la propagation DNS (jusqu'à 48h)

## 🎉 Avantages

✅ **Configuration automatique**: Plus besoin de configuration manuelle des domaines
✅ **Sécurisé**: Vérifie les autorisations avant toute action
✅ **Fail-safe**: Les erreurs Cloudflare ne bloquent pas les souscriptions
✅ **Flexible**: Configuration manuelle possible si besoin
✅ **Transparent**: Logs détaillés pour le debugging

## 📝 Notes importantes

1. Le champ `folder` doit correspondre **exactement** au nom du projet Cloudflare Pages
2. Le système fonctionne même si Cloudflare n'est pas configuré (skip avec warning)
3. Les domaines doivent être configurés dans Cloudflare DNS avant d'être ajoutés
4. La propagation DNS peut prendre jusqu'à 48h

## 🔄 Prochaines étapes

1. [ ] Exécuter la migration SQL en production
2. [ ] Configurer les variables d'environnement Cloudflare
3. [ ] Remplir le champ `folder` pour tous les sites existants
4. [ ] Tester avec un site de développement
5. [ ] Déployer en production
6. [ ] Monitorer les logs pour les premières souscriptions

## 📞 Support

En cas de problème:
1. Vérifiez les logs du serveur (recherchez `[Cloudflare]` et `[Subscription]`)
2. Vérifiez le dashboard Cloudflare Pages
3. Consultez la documentation dans `server/docs/`

-->

**Note**: La gestion des domaines Cloudflare sera implémentée séparément du serveur principal.
