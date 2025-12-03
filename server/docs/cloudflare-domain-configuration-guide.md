# Guide de Configuration des Domaines Personnalisés

## Vue d'ensemble

Ce système gère automatiquement la redirection des domaines personnalisés vers les Workers Cloudflare Pages. Lorsqu'un utilisateur souscrit à un plan avec la fonctionnalité `custom_domain`, le système configure automatiquement le domaine pour pointer vers le bon Worker.

## Architecture

```
┌─────────────────┐
│  Base de données │
│    websites      │
│                  │
│  - folder        │ ← Nom du Worker/Pages project
│  - website_slug  │ ← Domaine personnalisé
└────────┬─────────┘
         │
         ├─ Lors de la souscription
         │  à un plan avec custom_domain
         │
         ▼
┌─────────────────────┐
│  Cloudflare Pages   │
│  API Configuration  │
│                     │
│  POST /domains      │ ← Ajoute le domaine au projet
└─────────┬───────────┘
          │
          ▼
    ┌─────────────┐
    │   Worker    │ ← Le domaine pointe maintenant ici
    │  (folder)   │
    └─────────────┘
```

## Configuration

### 1. Variables d'environnement

Ajoutez dans `.env`:

```env
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=abc123def456
CLOUDFLARE_API_TOKEN=your_token_here
```

### 2. Migration de la base de données

Exécutez la migration SQL:

```bash
psql -h [host] -U [user] -d [database] -f server/migrations/add_folder_to_websites.sql
```

Cette migration ajoute le champ `folder` à la table `websites`.

### 3. Configuration des projets Cloudflare

Pour chaque site web, assurez-vous que le champ `folder` contient le nom exact du projet Cloudflare Pages:

```sql
UPDATE websites 
SET folder = 'nom-du-projet-pages' 
WHERE id = 'website-id';
```

**Important**: Le nom doit correspondre exactement au nom du projet dans Cloudflare Pages.

## Utilisation

### Configuration automatique (recommandé)

Le système configure automatiquement le domaine lorsque:

1. Un utilisateur souscrit à un plan avec `custom_domain: true`
2. Le site web a un `folder` configuré (projet Cloudflare)
3. Le site web a un `website_slug` configuré (domaine personnalisé)

**Aucune action manuelle n'est requise** - le domaine est configuré automatiquement dans Cloudflare Pages.

### Configuration manuelle

Si nécessaire, vous pouvez configurer un domaine manuellement:

```javascript
// Frontend
const response = await axios.post(
  `${apiUrl}/configure-custom-domain/${websiteId}`,
  { domain: 'example.com' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### Vérification de la configuration

Pour vérifier qu'un domaine est correctement configuré:

```javascript
// Frontend
const response = await axios.get(
  `${apiUrl}/check-domain-status/${websiteId}?domain=example.com`,
  { headers: { Authorization: `Bearer ${token}` } }
);

console.log(response.data.status);
```

## Flux complet

### Scénario 1: Nouveau client avec domaine personnalisé

1. **Client crée un site web**
   ```
   → Table websites: folder = NULL, website_slug = NULL
   → Abonnement gratuit créé (sans custom_domain)
   ```

2. **Site déployé sur Cloudflare Pages**
   ```
   → Table websites: folder = "mon-site-123"
   ```

3. **Client upgrade vers plan Premium**
   ```
   → Client ajoute son domaine: website_slug = "example.com"
   → Route /change-subscription-plan appelée
   → Vérification: plan.features.custom_domain = true
   → Configuration automatique: addCustomDomain("mon-site-123", "example.com")
   → Cloudflare Pages: domaine ajouté au projet
   ```

4. **Résultat**
   ```
   https://example.com → pointe vers Worker "mon-site-123"
   ```

### Scénario 2: Client existant qui upgrade

1. **Client a déjà un site sur plan gratuit**
   ```
   → folder = "ancien-site-456"
   → website_slug = "ancien.example.com" (mais non actif car pas de custom_domain)
   ```

2. **Client upgrade vers plan avec custom_domain**
   ```
   → Route /change-subscription-plan
   → Détection: nouveau plan a custom_domain
   → Configuration auto: addCustomDomain("ancien-site-456", "ancien.example.com")
   → Domaine configuré ✅
   ```

## Gestion des erreurs

### Erreur: "Aucun projet Cloudflare associé"

**Cause**: Le champ `folder` est NULL ou vide

**Solution**:
```sql
UPDATE websites 
SET folder = 'nom-du-projet' 
WHERE id = 'website-id';
```

### Erreur: "Project not found" (Cloudflare API)

**Cause**: Le nom dans `folder` ne correspond pas à un projet existant

**Solution**:
1. Vérifiez le nom exact dans le dashboard Cloudflare Pages
2. Mettez à jour la base de données avec le bon nom

### Erreur: "Variables d'environnement Cloudflare manquantes"

**Cause**: CLOUDFLARE_ACCOUNT_ID ou CLOUDFLARE_API_TOKEN non configurés

**Solution**: Ajoutez les variables dans `.env`

### Le domaine ne résout pas

**Causes possibles**:
1. DNS ne pointent pas vers Cloudflare
2. Propagation DNS en cours (peut prendre jusqu'à 48h)
3. Domaine pas encore validé dans Cloudflare

**Solutions**:
1. Vérifiez les nameservers: `dig NS example.com`
2. Attendez la propagation DNS
3. Vérifiez dans le dashboard Cloudflare Pages

## Sécurité

### Contrôles d'accès

- ✅ Authentification JWT obligatoire
- ✅ Vérification de l'accès au site web
- ✅ Vérification de la feature `custom_domain` dans l'abonnement
- ✅ Validation du projet Cloudflare existant

### Protection contre les abus

- Le système vérifie que l'utilisateur a bien accès au site web
- Le système vérifie que le plan actif inclut custom_domain
- Les erreurs Cloudflare ne bloquent pas la souscription (fail gracefully)

## API Endpoints

### POST /configure-custom-domain/:websiteId

Configure manuellement un domaine personnalisé.

**Sécurité**: Vérifie l'autorisation custom_domain avant de configurer.

### GET /list-custom-domains/:websiteId

Liste tous les domaines configurés pour un site.

### DELETE /remove-custom-domain/:websiteId

Supprime un domaine personnalisé de Cloudflare Pages.

### GET /check-domain-status/:websiteId

Vérifie le statut d'un domaine (actif, en attente de validation, etc.)

## Maintenance

### Vérifier les domaines configurés

```bash
# Lister tous les sites avec domaines personnalisés
SELECT id, website_name, folder, website_slug 
FROM websites 
WHERE website_slug IS NOT NULL 
AND folder IS NOT NULL;
```

### Synchroniser manuellement un domaine

```bash
# Si besoin de reconfigurer un domaine
curl -X POST https://api.votre-serveur.com/configure-custom-domain/WEBSITE_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'
```

## Troubleshooting

### Logs

Les logs incluent:
- `[Cloudflare]` - Actions API Cloudflare
- `[Subscription]` - Configuration automatique lors de souscription
- `[Domain Config]` - Configuration manuelle de domaines

### Debug mode

Pour voir tous les détails:

```javascript
// Dans cloudflareDomains.js, les console.log sont déjà présents
// Vérifiez les logs du serveur pour voir:
// - Les appels API Cloudflare
// - Les réponses
// - Les erreurs détaillées
```

## Références

- [Documentation Cloudflare Pages API](https://developers.cloudflare.com/api/operations/pages-project-add-domain)
- [Custom Domains for Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [DNS Configuration](https://developers.cloudflare.com/dns/)
