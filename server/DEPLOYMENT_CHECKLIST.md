# Checklist de Déploiement - Système Cloudflare Domains

Cette checklist vous guide à travers les étapes nécessaires pour déployer le système de gestion des domaines personnalisés Cloudflare.

## ✅ Phase 1: Préparation (Développement)

### 1.1 Configuration de l'environnement local

- [ ] Copier `.env.example` vers `.env` si pas déjà fait
- [ ] Obtenir les credentials Cloudflare:
  - [ ] Se connecter à https://dash.cloudflare.com
  - [ ] Copier l'Account ID depuis la barre latérale
  - [ ] Créer un API Token avec permission "Edit Cloudflare Pages"
- [ ] Ajouter les variables dans `.env`:
  ```env
  CLOUDFLARE_ACCOUNT_ID=votre_account_id
  CLOUDFLARE_API_TOKEN=votre_api_token
  ```

### 1.2 Migration de la base de données

- [ ] Vérifier que Supabase est accessible
- [ ] Exécuter la migration `add_folder_to_websites.sql`:
  ```bash
  psql -h [host] -U postgres -d postgres -f server/migrations/add_folder_to_websites.sql
  ```
- [ ] Vérifier que la colonne `folder` a été ajoutée:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'websites' AND column_name = 'folder';
  ```

### 1.3 Configuration d'un site de test

- [ ] Choisir un site web existant pour les tests
- [ ] Vérifier qu'il existe bien un projet dans Cloudflare Pages
- [ ] Noter le nom exact du projet (ex: "mon-site-123")
- [ ] Mettre à jour la base de données:
  ```sql
  UPDATE websites 
  SET folder = 'nom-exact-du-projet' 
  WHERE id = 'id-du-site-test';
  ```

### 1.4 Tests unitaires

- [ ] Redémarrer le serveur Node.js pour charger les nouvelles variables
- [ ] Tester la configuration Cloudflare:
  ```bash
  cd server
  node test-cloudflare-config.js nom-du-projet test.example.com
  ```
- [ ] Vérifier que le domaine apparaît dans le dashboard Cloudflare Pages

### 1.5 Tests d'intégration

- [ ] Créer/identifier un plan avec `custom_domain: true` dans `subscription_plans`
- [ ] Tester la souscription:
  ```bash
  # Utiliser Postman ou curl pour appeler:
  POST /change-subscription-plan
  {
    "websiteId": "id-du-site-test",
    "planId": "id-du-plan-premium"
  }
  ```
- [ ] Vérifier les logs du serveur:
  - [ ] `[Subscription] Plan avec custom_domain détecté...`
  - [ ] `[Cloudflare] Ajout du domaine...`
  - [ ] `[Subscription] ✅ Domaine personnalisé configuré automatiquement`
- [ ] Vérifier dans Cloudflare Pages que le domaine est ajouté

## ✅ Phase 2: Préparation Production

### 2.1 Variables d'environnement

- [ ] Configurer les variables sur le serveur de production:
  ```bash
  # Exemple avec systemd/service
  CLOUDFLARE_ACCOUNT_ID=production_account_id
  CLOUDFLARE_API_TOKEN=production_api_token
  ```
- [ ] Vérifier que le token a les bonnes permissions en production

### 2.2 Migration de la base de données production

⚠️ **IMPORTANT**: Faire un backup avant toute migration!

- [ ] Backup de la base de données:
  ```bash
  pg_dump -h [host] -U postgres -d postgres > backup_before_folder_column.sql
  ```
- [ ] Exécuter la migration:
  ```bash
  psql -h [prod-host] -U postgres -d postgres -f server/migrations/add_folder_to_websites.sql
  ```
- [ ] Vérifier que la colonne existe:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'websites' AND column_name = 'folder';
  ```

### 2.3 Configuration des sites existants

- [ ] Lister tous les sites qui ont un domaine personnalisé:
  ```sql
  SELECT id, website_name, website_slug, folder 
  FROM websites 
  WHERE website_slug IS NOT NULL;
  ```
- [ ] Pour chaque site, mettre à jour le champ `folder`:
  ```sql
  UPDATE websites 
  SET folder = 'nom-du-projet-cloudflare' 
  WHERE id = 'website-id';
  ```
- [ ] Créer un script de migration si nécessaire:
  ```javascript
  // scripts/migrate-cloudflare-projects.js
  const sites = [
    { id: 'xxx', folder: 'projet-1' },
    { id: 'yyy', folder: 'projet-2' }
  ];
  // ... logique de mise à jour
  ```

### 2.4 Tests en production (staging si disponible)

- [ ] Déployer le code sur un environnement de staging
- [ ] Tester avec un vrai site:
  1. [ ] Créer un nouveau site
  2. [ ] Le déployer sur Cloudflare Pages
  3. [ ] Noter le nom du projet
  4. [ ] Mettre à jour `folder` dans la BDD
  5. [ ] Souscrire à un plan premium
  6. [ ] Vérifier que le domaine est configuré automatiquement
- [ ] Vérifier que les anciennes fonctionnalités marchent toujours

## ✅ Phase 3: Déploiement

### 3.1 Déploiement du code

- [ ] Commit et push des changements:
  ```bash
  git add .
  git commit -m "feat: Add Cloudflare Pages domain management"
  git push origin main
  ```
- [ ] Déployer sur le serveur de production
- [ ] Redémarrer le serveur Node.js

### 3.2 Vérification post-déploiement

- [ ] Vérifier que le serveur démarre sans erreur
- [ ] Vérifier les logs pour les erreurs Cloudflare
- [ ] Tester l'endpoint de santé (health check)
- [ ] Tester une souscription de test

### 3.3 Monitoring

- [ ] Activer le monitoring des logs:
  - [ ] Rechercher `[Cloudflare]` pour les actions API
  - [ ] Rechercher `[Subscription]` pour les auto-configurations
- [ ] Configurer des alertes pour les erreurs Cloudflare (optionnel)
- [ ] Documenter les premières souscriptions avec custom_domain

## ✅ Phase 4: Documentation et Formation

### 4.1 Documentation utilisateur

- [ ] Créer un guide pour les utilisateurs:
  - Comment configurer leur DNS
  - Temps d'attente (propagation)
  - Que faire en cas de problème
- [ ] Ajouter des messages clairs dans l'UI:
  - "Votre domaine est en cours de configuration..."
  - "Configuration réussie! Propagation DNS en cours (jusqu'à 48h)"

### 4.2 Documentation support

- [ ] Former l'équipe support sur:
  - Comment vérifier qu'un domaine est configuré
  - Comment configurer manuellement si besoin
  - Troubleshooting commun
- [ ] Créer un runbook pour les problèmes courants

## ✅ Phase 5: Suivi

### 5.1 Première semaine

- [ ] Monitorer quotidiennement les logs
- [ ] Compter le nombre de domaines configurés automatiquement
- [ ] Identifier et résoudre les problèmes
- [ ] Collecter le feedback des utilisateurs

### 5.2 Premier mois

- [ ] Analyser les métriques:
  - Nombre de domaines configurés avec succès
  - Nombre d'erreurs
  - Temps moyen de configuration
- [ ] Optimiser si nécessaire
- [ ] Documenter les leçons apprises

## 🚨 Rollback Plan

En cas de problème critique:

### Option 1: Désactiver l'auto-configuration

```javascript
// Dans subscription.js, commenter le bloc:
// === CONFIGURATION AUTOMATIQUE DU DOMAINE PERSONNALISÉ ===
```

### Option 2: Rollback complet

1. [ ] Redéployer la version précédente du code
2. [ ] Les domaines déjà configurés resteront fonctionnels
3. [ ] La colonne `folder` peut rester (pas d'impact)

### Option 3: Rollback base de données

```sql
-- Si vraiment nécessaire (peu probable)
ALTER TABLE websites DROP COLUMN IF EXISTS folder;
```

## 📝 Notes

- Les domaines configurés avant le système restent sur le VPS
- Migration progressive possible: configurer `folder` site par site
- Le système est "fail-safe": erreur Cloudflare = warning, pas de blocage
- Les utilisateurs peuvent toujours configurer manuellement

## ✅ Checklist Finale

Avant de marquer comme "Production Ready":

- [ ] Tous les tests passent
- [ ] Migration SQL exécutée en production
- [ ] Variables d'environnement configurées
- [ ] Au moins un site test déployé avec succès
- [ ] Documentation à jour
- [ ] Équipe support formée
- [ ] Plan de rollback documenté
- [ ] Monitoring en place

---

**Date de déploiement prévu**: _______________

**Déployé par**: _______________

**Notes additionnelles**:
```
[Espace pour notes]
```
