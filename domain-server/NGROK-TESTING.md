# 🌐 Guide de Test avec ngrok

## 🚀 Installation et Configuration de ngrok

### 1. Installation de ngrok
```bash
# Télécharger depuis https://ngrok.com/download
# Ou via chocolatey (Windows)
choco install ngrok

# Ou via npm
npm install -g ngrok
```

### 2. Configuration (optionnel mais recommandé)
```bash
# Créer un compte gratuit sur https://dashboard.ngrok.com/
# Récupérer votre authtoken
ngrok config add-authtoken VOTRE_TOKEN_ICI
```

## 🔗 Exposition du Serveur

### Démarrer le serveur de domaines
```bash
cd domain-server
npm run dev
```

### Exposer avec ngrok (nouveau terminal)
```bash
# Exposer le port 3003
ngrok http 3003

# Avec un sous-domaine personnalisé (compte payant)
ngrok http 3003 --subdomain=wenoble-domains

# Avec region spécifique
ngrok http 3003 --region=eu
```

**Sortie ngrok :**
```
ngrok                                                                                                                                                                                               
                                                                                                                                                                                                   
Session Status                online
Account                       Votre Email (Plan: Free)
Version                       3.0.0
Region                        United States (us)
Latency                       52ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://1234-abcd-efgh.ngrok-free.app -> http://localhost:3003

Connections                   ttl     opn     rt1     rt5     p50     p90
                             0       0       0.00    0.00    0.00    0.00
```

## 🧪 Tests avec ngrok

### 1. Test Health Check
```bash
# Utiliser l'URL ngrok
curl https://1234-abcd-efgh.ngrok-free.app/health
```

### 2. Test de Redirection de Domaine

#### Option A: Avec curl
```bash
# Simuler un domaine avec header Host
curl -H "Host: mondomaine.com" https://1234-abcd-efgh.ngrok-free.app/

# Avec un chemin spécifique
curl -H "Host: monsite.example.com" https://1234-abcd-efgh.ngrok-free.app/ma-page
```

#### Option B: DNS Temporaire
```bash
# Si vous contrôlez un domaine, pointez-le vers l'IP ngrok
# Récupérer l'IP de ngrok:
nslookup 1234-abcd-efgh.ngrok-free.app

# Puis créer un record A:
# montest.votredomaine.com -> IP_NGROK
```

#### Option C: Modification hosts + tunnel
```bash
# 1. Dans C:\Windows\System32\drivers\etc\hosts
127.0.0.1  montest.local

# 2. Tester localement d'abord
curl -H "Host: montest.local" http://localhost:3003/

# 3. Puis via ngrok
curl -H "Host: montest.local" https://1234-abcd-efgh.ngrok-free.app/
```

## 📱 Test depuis l'Extérieur

### Partager le Tunnel
L'URL ngrok est accessible depuis n'importe où ! Parfait pour :
- Tester depuis un autre ordinateur
- Tester depuis mobile
- Partager avec l'équipe

### Test avec Postman/Insomnia
1. **URL:** `https://1234-abcd-efgh.ngrok-free.app/`
2. **Headers:**
   ```
   Host: votredomaine.com
   ```

### Test avec Browser
Si vous avez un vrai domaine configuré :
1. Pointez un sous-domaine vers ngrok
2. Visitez directement `http://test.votredomaine.com`

## 🎯 Script de Test Automatisé pour ngrok

### Mise à jour du test avec URL ngrok
```bash
# Modifier test-local.js pour utiliser ngrok
NGROK_URL=https://1234-abcd-efgh.ngrok-free.app npm test
```

## 🌐 Tester avec un Vrai Domaine

### Méthode 1: Modifier le fichier hosts (Recommandée pour tests locaux)

**Sur Windows :**
1. **Ouvrir en administrateur** : `C:\Windows\System32\drivers\etc\hosts`
2. **Ajouter la ligne** (remplacez par votre URL ngrok) :
   ```
   # Format: IP_ngrok  votre-domaine.com
   # Obtenir l'IP de votre tunnel ngrok :
   nslookup 74763f344144.ngrok-free.app
   
   # Puis ajouter dans hosts (exemple) :
   3.123.45.67  mondomaine.com
   3.123.45.67  www.mondomaine.com
   ```
3. **Sauvegarder** et fermer
4. **Tester** : Aller sur `http://mondomaine.com` dans le navigateur

**Alternative plus simple - Redirection vers ngrok :**
```
# Dans C:\Windows\System32\drivers\etc\hosts
# Ajouter cette ligne (pas besoin d'IP) :
127.0.0.1  montest.local

# Puis tester avec header Host via ngrok :
curl -H "Host: montest.local" https://74763f344144.ngrok-free.app/
```

### Méthode 2: Test direct avec curl (Plus rapide)

```bash
# Tester n'importe quel domaine sans modifier hosts
curl -H "Host: mondomaine.com" https://74763f344144.ngrok-free.app/health

# Avec différents domaines
curl -H "Host: site1.com" https://74763f344144.ngrok-free.app/
curl -H "Host: site2.com" https://74763f344144.ngrok-free.app/test
curl -H "Host: entreprise.fr" https://74763f344144.ngrok-free.app/api
```

### Méthode 3: Postman/Insomnia (Interface graphique)

1. **URL** : `https://74763f344144.ngrok-free.app/`
2. **Headers** : 
   - `Host: mondomaine.com`
3. **Envoyer** la requête

### Méthode 4: Si vous possédez un vrai domaine (Hostinger, etc.)

**🌟 Solution Recommandée - Pointer vers ngrok :**

1. **Obtenir l'IP de votre tunnel ngrok :**
   ```bash
   nslookup 74763f344144.ngrok-free.app
   # Exemple de résultat: 3.134.213.146
   ```

2. **Dans votre panneau Hostinger :**
   - Aller dans **Gestion DNS**
   - Créer un **sous-domaine de test** (ex: `test.votredomaine.com`)
   - Ajouter un **Record A** :
     ```
     Nom: test
     Type: A
     Valeur: 3.134.213.146 (IP de ngrok)
     TTL: 300 (5 minutes)
     ```

3. **Attendre propagation DNS** (5-30 minutes)

4. **Tester votre domaine :**
   ```bash
   # Vérifier la propagation
   nslookup test.votredomaine.com
   
   # Tester la redirection
   curl http://test.votredomaine.com/health
   ```

**⚠️ Limitation :** L'IP ngrok change à chaque redémarrage (version gratuite)

**🔄 Alternative - Record CNAME :**
```
Nom: test
Type: CNAME  
Valeur: 74763f344144.ngrok-free.app
TTL: 300
```

**💡 Avantage CNAME :** Pas besoin de changer l'IP quand vous redémarrez ngrok (tant que vous gardez la même URL).

## 🧪 Tests Rapides avec votre Tunnel

**Votre tunnel actuel :** `https://74763f344144.ngrok-free.app`

```bash
# Health check
curl https://74763f344144.ngrok-free.app/health

# Test domaine fictif (devrait retourner 404)
curl -H "Host: domaine-inexistant.com" https://74763f344144.ngrok-free.app/

# Test avec un domaine de votre DB (si vous en avez)
curl -H "Host: VOTRE-SLUG.com" https://74763f344144.ngrok-free.app/
```

## 🌍 Configuration DNS avec Hostinger/OVH/Cloudflare

### Pour Hostinger
1. **Connexion** : Panel Hostinger → Domaines → Gestion DNS
2. **Nouveau Record** :
   ```
   Type: A ou CNAME
   Nom: test (ou subdomain de votre choix)
   Valeur: IP_ngrok ou tunnel_ngrok_url
   TTL: 300 (5 min pour tests rapides)
   ```

### Pour OVH
1. **Connexion** : Manager OVH → Domaines → Zone DNS
2. **Ajouter entrée** :
   ```
   Type: A
   Sous-domaine: test
   Cible: IP_de_ngrok
   ```

### Pour Cloudflare
1. **Connexion** : Dashboard Cloudflare → DNS
2. **Add record** :
   ```
   Type: A ou CNAME
   Name: test
   Content: IP_ngrok ou tunnel_url
   Proxy status: DNS only (nuage gris)
   ```

### Commandes utiles
```bash
# Obtenir l'IP actuelle de ngrok
nslookup 74763f344144.ngrok-free.app

# Vérifier la propagation DNS
nslookup test.votredomaine.com

# Test après propagation
curl http://test.votredomaine.com/health
```

**💡 Astuce :** Utilisez des TTL courts (300s) pendant les tests pour des changements DNS plus rapides.

## 🔍 Monitoring avec ngrok

### Interface Web ngrok
Visitez `http://127.0.0.1:4040` pour voir :
- 📊 **Requêtes en temps réel**
- 📝 **Headers et body**
- 🔄 **Réponses complètes**
- 📈 **Statistiques de trafic**

### Logs combinés
- **Terminal 1:** Logs du serveur de domaines
- **Terminal 2:** ngrok status
- **Browser:** Interface ngrok (http://127.0.0.1:4040)

## 🛠️ Commandes Utiles

### Redémarrage complet
```bash
# Terminal 1: Serveur
cd domain-server
npm run dev

# Terminal 2: ngrok  
ngrok http 3003

# Terminal 3: Tests
npm test
```

### Test de domaines multiples
```bash
# Différents domaines, même tunnel
curl -H "Host: site1.com" https://VOTRE-TUNNEL.ngrok-free.app/
curl -H "Host: site2.com" https://VOTRE-TUNNEL.ngrok-free.app/
curl -H "Host: site3.com" https://VOTRE-TUNNEL.ngrok-free.app/test
```

### Vérification des redirections
```bash
# Suivre les redirections
curl -L -H "Host: mondomaine.com" https://VOTRE-TUNNEL.ngrok-free.app/

# Voir uniquement les headers
curl -I -H "Host: mondomaine.com" https://VOTRE-TUNNEL.ngrok-free.app/
```

## ⚠️ Notes Importantes

### 🚨 Dépannage - ngrok se ferme immédiatement

#### Problème : Fenêtre ngrok s'ouvre et se ferme direct

**Causes possibles :**

1. **Port 3003 non accessible**
```bash
# Vérifier que le serveur tourne d'abord
cd domain-server
npm run dev
# PUIS dans un autre terminal :
ngrok http 3003
```

2. **ngrok non authentifié (version gratuite limitée)**
```bash
# S'inscrire gratuitement sur https://dashboard.ngrok.com/
# Récupérer l'authtoken et l'ajouter :
ngrok config add-authtoken VOTRE_TOKEN_ICI
```

3. **Conflit de port ou ngrok déjà lancé**
```bash
# Tuer tous les processus ngrok
taskkill /f /im ngrok.exe
# Ou sur Linux/Mac:
pkill ngrok

# Puis relancer
ngrok http 3003
```

4. **Utiliser PowerShell au lieu de CMD**
```powershell
# Ouvrir PowerShell en tant qu'admin et taper :
ngrok http 3003
```

5. **Version ngrok obsolète**
```bash
# Mettre à jour ngrok
choco upgrade ngrok
# Ou télécharger la dernière version depuis https://ngrok.com/download
```

**Solutions testées :**

**Solution 1 - Commande complète :**
```bash
# Dans PowerShell/Terminal, garder ouvert :
ngrok http 3003 --log=stdout
```

**Solution 2 - Avec configuration :**
```bash
# Si problème d'auth, forcer avec :
ngrok http 3003 --region=eu --log=stdout
```

**Solution 3 - Mode verbose :**
```bash
# Pour voir les erreurs :
ngrok http 3003 --log=stdout --log-level=debug
```

**Solution 4 - Script de debug :**
```bash
# Utiliser le script PowerShell fourni :
.\start-ngrok.ps1
# Il gère automatiquement les erreurs
```

### Limitations ngrok gratuit
- URL change à chaque redémarrage
- Pas de sous-domaine personnalisé
- Bannière ngrok sur les pages web

### Sécurité
- Ne pas exposer en production
- Surveiller l'interface web pour les requêtes suspectes
- Arrêter ngrok après les tests

### Performance
- Latence ajoutée (~50-200ms)
- Limite de bande passante (plan gratuit)

## 🎉 Workflow de Test Recommandé

1. **Démarrer le serveur:** `npm run dev`
2. **Exposer avec ngrok:** `ngrok http 3003`  
3. **Noter l'URL ngrok:** `https://1234-abcd-efgh.ngrok-free.app`
4. **Tester health:** `curl https://1234-abcd-efgh.ngrok-free.app/health`
5. **Tester domaines:** Utiliser les scripts ou curl avec headers Host
6. **Monitorer:** Interface web ngrok + logs serveur
7. **Nettoyer:** Ctrl+C sur ngrok et serveur

Voilà ! Avec ngrok, vous pouvez tester votre serveur de domaines comme s'il était en production ! 🌐✨