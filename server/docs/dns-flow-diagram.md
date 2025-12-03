# Configuration DNS - Vue d'ensemble visuelle

## 📊 Schéma du flux DNS

```
┌─────────────────────────────────────────────────────────────────┐
│                     AVANT (domaine sur VPS)                      │
└─────────────────────────────────────────────────────────────────┘

    Utilisateur tape: monsite.com
           │
           ▼
    [DNS du registrar]
           │
           ▼
    Résout vers: IP du VPS (51.xxx.xxx.xxx)
           │
           ▼
    [Serveur VPS] ──► Site affiché
    


┌─────────────────────────────────────────────────────────────────┐
│                APRÈS (domaine sur Cloudflare)                    │
└─────────────────────────────────────────────────────────────────┘

    Utilisateur tape: monsite.com
           │
           ▼
    [DNS Cloudflare] ◄── Nameservers changés chez registrar
           │
           ▼
    Résout vers: Worker Cloudflare (auto-configuré via API)
           │
           ▼
    [Cloudflare Pages Worker] ──► Site affiché
           │
           └── Worker name = website.folder
```

## 🔄 Flux de configuration automatique

```
┌──────────────────────────────────────────────────────────────────┐
│  1. Utilisateur souscrit au plan Premium                         │
│     Interface WeNoble → /change-subscription-plan                │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. Système détecte custom_domain: true                          │
│     Récupère: website.folder = "mon-site-123"                    │
│     Récupère: website.website_slug = "monsite.com"               │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. Appel API Cloudflare                                         │
│     POST /accounts/{id}/pages/projects/mon-site-123/domains      │
│     Body: { "name": "monsite.com" }                              │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. Cloudflare configure le routage                              │
│     monsite.com ──► Worker "mon-site-123" ✅                     │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  5. Utilisateur peut accéder au site                             │
│     https://monsite.com ──► Fonctionne! 🎉                       │
└──────────────────────────────────────────────────────────────────┘
```

## 🌍 Configuration DNS selon la méthode

### Méthode 1: Nameservers Cloudflare (Recommandé)

```
┌─────────────────┐
│  Registrar      │
│  (OVH, Gandi)   │
└────────┬────────┘
         │ Change nameservers to:
         │ - ns1.cloudflare.com
         │ - ns2.cloudflare.com
         ▼
┌─────────────────┐
│  Cloudflare     │ ◄── Gère tous les DNS
│  DNS            │
└────────┬────────┘
         │ Auto-configure:
         │ monsite.com → mon-site-123.pages.dev
         ▼
┌─────────────────┐
│  Cloudflare     │
│  Pages Worker   │
└─────────────────┘

Avantages:
✅ Configuration 100% automatique
✅ SSL automatique
✅ Performance optimale
✅ Protection DDoS
```

### Méthode 2: CNAME externe

```
┌─────────────────┐
│  Registrar DNS  │
│  (externe)      │
└────────┬────────┘
         │ Ajoute CNAME:
         │ @ → mon-site-123.pages.dev
         ▼
┌─────────────────┐
│  Cloudflare     │
│  Pages Worker   │
└─────────────────┘

Limitations:
⚠️  Nécessite support CNAME sur l'apex
⚠️  Pas de protection DDoS
⚠️  SSL à configurer manuellement
```

## 📋 Table de correspondance

| Élément | Valeur | Où le trouver |
|---------|--------|---------------|
| `website.id` | UUID | Base de données |
| `website.folder` | "mon-site-123" | Base de données (nom Worker) |
| `website.website_slug` | "monsite.com" | Configuré par l'utilisateur |
| Cloudflare Project | mon-site-123 | Dashboard Cloudflare Pages |
| Domaine final | https://monsite.com | Navigateur utilisateur |

## 🔍 Vérification DNS

### Commandes de diagnostic

```bash
# 1. Vérifier les nameservers
nslookup -type=NS monsite.com

# Résultat attendu:
# ns1.cloudflare.com
# ns2.cloudflare.com


# 2. Vérifier la résolution du domaine
nslookup monsite.com

# Résultat attendu:
# IP Cloudflare (ex: 104.21.x.x, 172.67.x.x)


# 3. Tester l'accès HTTPS
curl -I https://monsite.com

# Résultat attendu:
# HTTP/2 200 OK
# server: cloudflare
```

## ⏰ Timeline de propagation

```
T+0min    │ Souscription Premium ✅
          │
T+1min    │ API Cloudflare configurée ✅
          │ Domaine ajouté au Worker ✅
          │
T+5min    │ Cloudflare génère le certificat SSL
          │
T+15min   │ HTTPS fonctionne si DNS déjà sur Cloudflare ✅
          │
          │ ────── OU SI CHANGEMENT DE NAMESERVERS ──────
          │
T+30min   │ Nameservers changés chez registrar
          │ Début propagation DNS...
          │
T+2h      │ DNS propagé chez la plupart des fournisseurs
          │
T+24h     │ DNS propagé globalement ✅
          │ Site accessible partout 🎉
```

## 🔐 Sécurité et certificats SSL

```
┌──────────────────────────────────────────────────────────────┐
│  Cloudflare génère automatiquement:                          │
│                                                               │
│  1. Certificat SSL/TLS                                       │
│     • Wildcard: *.monsite.com                                │
│     • Root: monsite.com                                      │
│     • Durée: 90 jours (renouvellement auto)                  │
│                                                               │
│  2. Configuration HTTPS                                      │
│     • TLS 1.2 minimum                                        │
│     • HTTP → HTTPS redirect automatique                      │
│     • HSTS activable                                         │
│                                                               │
│  3. Performance                                              │
│     • CDN global                                             │
│     • HTTP/2 et HTTP/3                                       │
│     • Brotli compression                                     │
└──────────────────────────────────────────────────────────────┘
```

## 🚨 Troubleshooting visuel

### Problème: DNS_PROBE_FINISHED_NXDOMAIN

```
Utilisateur ──► [DNS] ──X─► "Domaine introuvable"

Causes possibles:
├─ Nameservers pas encore propagés (attendre 24-48h)
├─ Nameservers mal configurés chez registrar
└─ Typo dans le nom de domaine

Solution:
nslookup -type=NS monsite.com
→ Vérifier que les nameservers sont bien ceux de Cloudflare
```

### Problème: ERR_SSL_VERSION_OR_CIPHER_MISMATCH

```
Utilisateur ──► [HTTPS] ──X─► "Erreur certificat SSL"

Causes possibles:
├─ Certificat SSL pas encore généré (< 30min)
└─ Configuration SSL incorrecte dans Cloudflare

Solution:
Attendre 30 minutes
Vérifier dans Cloudflare: SSL/TLS → Edge Certificates → Status: Active
```

### Problème: 404 Not Found

```
Utilisateur ──► [Cloudflare] ──► [Worker] ──X─► "Page non trouvée"

Causes possibles:
├─ Domaine pas configuré dans Cloudflare Pages
├─ website.folder incorrect dans la BDD
└─ Worker pas déployé

Solution:
1. Vérifier website.folder = nom exact du projet Cloudflare
2. Vérifier dans Cloudflare Pages que le domaine est listé
3. Appeler manuellement /configure-custom-domain/:websiteId
```

## 📊 Statistiques moyennes

| Métrique | Valeur moyenne |
|----------|----------------|
| Temps configuration API | < 1 minute |
| Génération SSL | 15-30 minutes |
| Propagation DNS (Cloudflare DNS) | 5-15 minutes |
| Propagation DNS (changement NS) | 24-48 heures |
| Disponibilité globale | > 99.9% |

## 🎯 Meilleurs pratiques

```
✅ RECOMMANDÉ                    ❌ À ÉVITER

Nameservers Cloudflare          │  Garder DNS chez registrar
Configuration automatique        │  Configuration manuelle
HTTPS uniquement                 │  HTTP mixte
Proxy Cloudflare activé         │  DNS only (grey cloud)
Domaine avec Cloudflare         │  Domaine externe sans NS
```

---

**Note**: Ces schémas sont disponibles pour l'équipe technique. Pour les utilisateurs finaux, référez-vous au guide simplifié `user-guide-custom-domain.md`.
