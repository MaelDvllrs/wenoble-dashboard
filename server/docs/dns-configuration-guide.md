# Guide de Configuration DNS pour Domaines Personnalisés

## 📋 Vue d'ensemble

Pour que votre domaine personnalisé fonctionne avec votre site sur Cloudflare Pages, vous devez configurer vos DNS pour pointer vers Cloudflare. Ce guide explique les différentes méthodes selon votre situation.

---

## 🎯 Méthode 1: Domaine géré par Cloudflare (Recommandé)

Si votre domaine est déjà enregistré chez Cloudflare ou si vous utilisez leurs nameservers, la configuration est automatique!

### Vérifier si votre domaine est sur Cloudflare

1. Connectez-vous à https://dash.cloudflare.com
2. Cherchez votre domaine dans la liste
3. Si présent → **Aucune configuration DNS manuelle nécessaire!**

### Ajouter un domaine à Cloudflare

Si votre domaine n'est pas encore sur Cloudflare:

1. **Ajouter le domaine**
   - Dashboard Cloudflare → **Add a Site**
   - Entrez votre domaine (ex: `example.com`)
   - Choisissez le plan Free (suffisant)

2. **Changer les nameservers**
   - Cloudflare vous donnera 2 nameservers:
     ```
     ns1.cloudflare.com
     ns2.cloudflare.com
     ```
   - Allez chez votre registrar (OVH, Gandi, Namecheap, etc.)
   - Remplacez les nameservers par ceux de Cloudflare
   - ⏰ Propagation: 24-48h

3. **Configuration automatique**
   - Une fois les nameservers actifs
   - Cloudflare Pages configure automatiquement les enregistrements DNS
   - Votre domaine pointe vers votre Worker ✅

---

## 🎯 Méthode 2: Domaine externe avec CNAME (si Cloudflare DNS)

Si votre domaine est géré ailleurs mais que vous voulez utiliser Cloudflare Pages:

### Configuration CNAME

⚠️ **Cette méthode nécessite que les nameservers pointent vers Cloudflare**

1. **Dans Cloudflare DNS**:
   ```
   Type: CNAME
   Name: @ (ou www)
   Target: votre-projet.pages.dev
   Proxy: Activé (orange cloud)
   TTL: Auto
   ```

2. **Pour les sous-domaines**:
   ```
   Type: CNAME
   Name: blog (ou autre)
   Target: votre-projet.pages.dev
   Proxy: Activé
   ```

### Exemple complet

Pour `example.com` → `mon-site.pages.dev`:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | @ | mon-site.pages.dev | ✅ Activé |
| CNAME | www | mon-site.pages.dev | ✅ Activé |

---

## 🎯 Méthode 3: Domaine externe avec enregistrements A (déconseillé)

Si vous ne pouvez pas changer les nameservers et que votre registrar ne supporte pas CNAME sur l'apex:

### Utiliser les IP de Cloudflare

⚠️ **Moins fiable car les IP peuvent changer**

```
Type: A
Name: @
Value: 172.67.X.X (IP fournie par Cloudflare)
TTL: 3600

Type: A
Name: @
Value: 104.21.X.X (IP fournie par Cloudflare)
TTL: 3600
```

**Note**: Contactez le support Cloudflare pour les IP exactes à utiliser pour votre projet Pages.

---

## 🔧 Configuration selon le registrar

### OVH

1. Espace client OVH → **Domaines** → Votre domaine
2. Onglet **Zone DNS**
3. **Modifier les serveurs DNS** (si méthode 1):
   ```
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```
4. Ou **Ajouter une entrée CNAME** (si méthode 2)

### Gandi

1. Gandi → **Domaines** → Votre domaine
2. **Nameservers** (si méthode 1):
   - Cliquez "Modifier"
   - Sélectionnez "Nameservers externes"
   - Ajoutez `ns1.cloudflare.com` et `ns2.cloudflare.com`

3. **Enregistrement DNS** (si méthode 2):
   - **Zone DNS** → **Ajouter**
   - Type: CNAME
   - Nom: @
   - Valeur: votre-projet.pages.dev

### Namecheap

1. Dashboard → **Domain List** → **Manage**
2. **Nameservers** → **Custom DNS**:
   ```
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```

### GoDaddy

1. My Products → **Domains** → Votre domaine
2. **DNS** → **Nameservers** → **Change**
3. Sélectionnez "Custom"
4. Ajoutez:
   ```
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```

---

## ✅ Vérification de la configuration

### Vérifier les nameservers

```bash
# Windows (PowerShell)
nslookup -type=NS example.com

# macOS/Linux
dig NS example.com +short
```

**Résultat attendu**:
```
ns1.cloudflare.com
ns2.cloudflare.com
```

### Vérifier les enregistrements DNS

```bash
# Windows
nslookup example.com

# macOS/Linux
dig example.com +short
```

**Résultat attendu**: IP de Cloudflare ou CNAME vers `.pages.dev`

### Tester la résolution

```bash
# Test simple
curl -I https://example.com

# Test avec trace
curl -v https://example.com
```

**Résultat attendu**: Réponse HTTP de votre site Cloudflare Pages

---

## ⏰ Temps de propagation

| Type de changement | Temps de propagation |
|-------------------|---------------------|
| Changement de nameservers | 24-48 heures |
| Modification CNAME | 1-4 heures |
| Modification A record | 1-4 heures |
| Cache DNS local | 0-15 minutes |

### Forcer la mise à jour du cache DNS

**Windows**:
```powershell
ipconfig /flushdns
```

**macOS**:
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Linux**:
```bash
sudo systemd-resolve --flush-caches
```

---

## 🚨 Problèmes courants

### Le domaine ne résout pas

**Causes possibles**:
1. ❌ Nameservers pas encore propagés
2. ❌ Enregistrement DNS incorrect
3. ❌ Cache DNS local

**Solutions**:
```bash
# 1. Vérifier les nameservers
nslookup -type=NS example.com

# 2. Vérifier avec DNS public (bypass cache)
nslookup example.com 8.8.8.8

# 3. Vider le cache DNS (voir commandes ci-dessus)
```

### ERR_SSL_VERSION_OR_CIPHER_MISMATCH

**Cause**: Le certificat SSL n'est pas encore émis par Cloudflare

**Solution**:
1. Attendre 15-30 minutes après la configuration DNS
2. Vérifier dans Cloudflare: **SSL/TLS** → **Edge Certificates**
3. Le certificat doit être "Active"

### Domaine redirige vers pages.dev

**Cause**: Le domaine personnalisé n'est pas configuré dans Cloudflare Pages

**Solution**:
1. Vérifier dans la base de données que `website.folder` est rempli
2. Vérifier que le plan a `custom_domain: true`
3. Appeler manuellement `/configure-custom-domain/:websiteId`

### DNS_PROBE_FINISHED_NXDOMAIN

**Cause**: Le domaine n'existe pas dans le DNS

**Solutions**:
1. Vérifier que les nameservers sont corrects
2. Attendre la propagation DNS (24-48h)
3. Vérifier que le domaine est bien enregistré

---

## 📝 Checklist de configuration

Avant de configurer votre domaine:

- [ ] Domaine enregistré et actif
- [ ] Accès au panneau de configuration du registrar
- [ ] Site déployé sur Cloudflare Pages
- [ ] Champ `folder` configuré dans la base de données
- [ ] Abonnement avec `custom_domain: true`

Étapes de configuration:

- [ ] Choisir la méthode (1, 2 ou 3)
- [ ] Configurer les DNS selon la méthode choisie
- [ ] Attendre la propagation DNS
- [ ] Vider le cache DNS local
- [ ] Tester la résolution du domaine
- [ ] Vérifier le certificat SSL
- [ ] Tester l'accès HTTPS au site

---

## 🎓 Recommandations

### Pour la meilleure expérience

✅ **DO**:
- Utiliser Cloudflare comme gestionnaire DNS (Méthode 1)
- Activer le proxy Cloudflare (orange cloud)
- Utiliser HTTPS uniquement
- Attendre 24-48h après changement de nameservers

❌ **DON'T**:
- Ne pas mélanger plusieurs méthodes
- Ne pas désactiver le proxy Cloudflare sans raison
- Ne pas utiliser des enregistrements A si CNAME possible
- Ne pas tester trop tôt (avant propagation DNS)

### Sécurité

- ✅ Activer "Always Use HTTPS" dans Cloudflare
- ✅ Utiliser "Automatic HTTPS Rewrites"
- ✅ Configurer HSTS (HTTP Strict Transport Security)
- ✅ Activer "Minimum TLS Version" à 1.2 minimum

---

## 🆘 Support

### Auto-diagnostic

```bash
# Script de diagnostic complet
echo "=== Diagnostic DNS pour example.com ==="
echo ""
echo "1. Nameservers:"
nslookup -type=NS example.com
echo ""
echo "2. Enregistrements A:"
nslookup -type=A example.com
echo ""
echo "3. Enregistrements CNAME:"
nslookup -type=CNAME example.com
echo ""
echo "4. Test de connexion:"
curl -I https://example.com
```

### Ressources utiles

- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
- [Cloudflare Pages Custom Domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [DNS Propagation Checker](https://dnschecker.org)
- [SSL Certificate Checker](https://www.sslshopper.com/ssl-checker.html)

---

## 📞 Contact

Si vous rencontrez des problèmes après avoir suivi ce guide:

1. Vérifiez que le domaine est correctement configuré dans WeNoble
2. Vérifiez les logs du serveur pour les erreurs Cloudflare
3. Contactez le support avec:
   - Nom du domaine
   - Capture d'écran de votre configuration DNS
   - Résultat de `nslookup -type=NS votre-domaine.com`
