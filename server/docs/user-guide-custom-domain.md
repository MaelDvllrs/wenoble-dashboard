# Configuration de votre Domaine Personnalisé

## 🎯 Vue d'ensemble simple

Pour utiliser votre propre domaine (ex: `monsite.com`) au lieu de `monsite.wenoble.fr`, suivez ces 3 étapes:

---

## Étape 1️⃣: Souscrire à un plan Premium

Votre domaine personnalisé sera actif une fois que vous aurez souscrit à un plan qui inclut cette fonctionnalité.

✅ **Plans compatibles**:
- Plan Premium
- Plan Business
- Plan Enterprise

---

## Étape 2️⃣: Configurer vos DNS

### Option A: Domaine déjà chez Cloudflare (Facile ✨)

Si votre domaine utilise déjà Cloudflare comme DNS:

1. **Rien à faire!** 🎉
2. La configuration est 100% automatique
3. Attendez 5-10 minutes maximum

### Option B: Domaine chez un autre fournisseur (Un peu plus long ⏰)

**Étape 2.1 - Ajouter votre domaine à Cloudflare**

1. Allez sur https://dash.cloudflare.com
2. Cliquez sur **"Add a Site"**
3. Entrez votre domaine (ex: `monsite.com`)
4. Choisissez le **plan Free** (gratuit, suffisant)
5. Cloudflare va scanner vos DNS existants
6. Cliquez sur **"Continue"**

**Étape 2.2 - Changer les nameservers chez votre registrar**

Cloudflare vous donnera 2 adresses comme:
```
ns1.cloudflare.com
ns2.cloudflare.com
```

Allez chez votre registrar (là où vous avez acheté le domaine):

**OVH**:
1. Espace client → Domaines → Votre domaine
2. Onglet "Serveurs DNS"
3. "Modifier les serveurs DNS"
4. Remplacez par ceux de Cloudflare

**Gandi**:
1. Domaines → Votre domaine
2. "Nameservers"
3. "Modifier"
4. "Nameservers externes"
5. Ajoutez ceux de Cloudflare

**Namecheap**:
1. Domain List → Manage
2. Nameservers → Custom DNS
3. Ajoutez ceux de Cloudflare

**GoDaddy**:
1. My Products → Domains
2. DNS → Nameservers → Change
3. Custom → Ajoutez ceux de Cloudflare

**Étape 2.3 - Attendre la propagation**

⏰ **Temps d'attente**: 24 à 48 heures maximum

Vous recevrez un email de Cloudflare quand ce sera actif.

---

## Étape 3️⃣: Vérifier que tout fonctionne

### Vérification simple

1. Ouvrez un navigateur privé (navigation privée)
2. Allez sur `https://votre-domaine.com`
3. Votre site devrait s'afficher! 🎉

### Si ça ne marche pas tout de suite

**C'est normal!** Le DNS peut prendre du temps à se propager.

**Que faire**:
1. ⏰ Attendez encore quelques heures
2. 🔄 Videz le cache de votre navigateur:
   - Chrome: `Ctrl + Shift + Suppr`
   - Firefox: `Ctrl + Shift + Suppr`
   - Safari: `Cmd + Option + E`
3. 💻 Videz le cache DNS de votre ordinateur:
   - Windows: Ouvrez PowerShell et tapez `ipconfig /flushdns`
   - Mac: Ouvrez Terminal et tapez `sudo killall -HUP mDNSResponder`

---

## 🔒 Certificat SSL (HTTPS)

**Bonne nouvelle**: Le certificat SSL est automatique et gratuit!

- ✅ Cloudflare génère un certificat SSL
- ✅ Votre site sera accessible en HTTPS
- ⏰ Le certificat est créé en 15-30 minutes

Si vous voyez une erreur SSL, attendez simplement 30 minutes.

---

## ⚡ Récapitulatif rapide

| Étape | Action | Temps |
|-------|--------|-------|
| 1️⃣ | Souscrire au plan Premium | Immédiat |
| 2️⃣ | Configurer les DNS | 5 min - 48h |
| 3️⃣ | Vérifier | Immédiat |

---

## ❓ Questions fréquentes

### Mon domaine est-il inclus?

Non, vous devez déjà posséder un domaine. Vous pouvez l'acheter chez:
- OVH (français)
- Gandi (français)
- Namecheap (international)
- GoDaddy (international)

**Prix moyen**: 10-15€/an pour un `.com` ou `.fr`

### Puis-je utiliser un sous-domaine?

Oui! Par exemple `blog.monsite.com` fonctionne exactement pareil.

### Et si je change d'avis?

Vous pouvez revenir à `monsite.wenoble.fr` en annulant votre abonnement Premium. Votre domaine personnel ne sera plus actif mais restera votre propriété.

### Le www est-il nécessaire?

Non, les deux fonctionnent:
- ✅ `monsite.com` → Fonctionne
- ✅ `www.monsite.com` → Fonctionne aussi

Cloudflare redirige automatiquement.

### Puis-je utiliser plusieurs domaines?

Avec un seul abonnement Premium, vous avez droit à 1 domaine personnalisé par site.

### Que se passe-t-il avec mon ancien domaine?

Si vous aviez déjà un domaine (ex: `ancien.com`) et que vous en configurez un nouveau (ex: `nouveau.com`), l'ancien sera remplacé. Un seul domaine personnalisé actif à la fois.

---

## 🆘 Besoin d'aide?

### Problèmes courants

**"Mon domaine affiche une erreur 404"**
→ Attendez la propagation DNS (24-48h après changement nameservers)

**"J'ai une erreur SSL"**
→ Attendez 30 minutes, le certificat se génère automatiquement

**"Mon domaine ne résout pas"**
→ Vérifiez que les nameservers Cloudflare sont bien configurés chez votre registrar

**"Ça fonctionne sur mon téléphone mais pas mon PC"**
→ Videz le cache DNS de votre PC (voir Étape 3)

### Contacter le support

Si le problème persiste après 48h:

1. 📧 Contactez notre support
2. 📋 Indiquez:
   - Votre nom de domaine
   - Votre registrar (OVH, Gandi, etc.)
   - Quand avez-vous changé les nameservers
   - Le message d'erreur exact

---

## ✅ Checklist finale

Avant de contacter le support, vérifiez:

- [ ] J'ai un abonnement Premium actif
- [ ] Mon domaine est configuré dans mon compte WeNoble
- [ ] Les nameservers Cloudflare sont configurés chez mon registrar
- [ ] J'ai attendu au moins 24h après le changement de nameservers
- [ ] J'ai vidé mon cache navigateur et DNS
- [ ] J'ai testé en navigation privée

---

**🎉 Félicitations!** Votre site est maintenant accessible sur votre domaine personnel!
