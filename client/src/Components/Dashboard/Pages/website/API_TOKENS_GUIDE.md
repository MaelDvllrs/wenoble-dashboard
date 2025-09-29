# Guide d'utilisation des Tokens API WeNoble

## Qu'est-ce qu'un token API ?

Un token API est une clé d'accès sécurisée qui permet aux applications externes d'interagir avec votre CMS WeNoble. Chaque token est lié à un site web spécifique et possède des permissions définies.

## Création d'un token API

1. **Accédez aux paramètres du site** : Rendez-vous dans Dashboard > Sites Web > [Votre site] > Paramètres
2. **Section Tokens API** : Scrollez jusqu'à la section "Tokens API"
3. **Créer un token** : Cliquez sur le bouton "Créer un token"
4. **Configurez le token** :
   - **Nom** : Donnez un nom descriptif (ex: "Application mobile", "Webhook Zapier")
   - **Permissions** : Sélectionnez les permissions nécessaires
5. **Sauvegardez le token** : ⚠️ **Important** : Le token ne sera affiché qu'une seule fois !

## Types de permissions

### CMS
- **Description** : Accès complet au système de gestion de contenu
- **Autorise** :
  - Créer des éléments de collection
  - Publier le site web
  - Lire les configurations de collection

## Sécurité des tokens

### ✅ Bonnes pratiques
- **Stockage sécurisé** : Ne jamais exposer le token dans le code front-end
- **Noms descriptifs** : Utilisez des noms clairs pour identifier l'usage
- **Rotation régulière** : Remplacez les tokens anciens ou compromis
- **Permissions minimales** : N'accordez que les permissions nécessaires

### ❌ À éviter
- Partager le token par email ou chat non sécurisé
- Stocker le token dans un repository Git public
- Utiliser le même token pour plusieurs applications
- Laisser des tokens inactifs

## Utilisation du token

### Headers HTTP requis
```http
x-api-key: YOUR_TOKEN_HERE
Content-Type: application/json
```

### URL de base
```
https://api.wenoble.fr/external-api
```

### Exemple d'utilisation
```javascript
const response = await fetch('https://api.wenoble.fr/external-api/collection/1/elements', {
  method: 'POST',
  headers: {
    'x-api-key': 'your_token_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Mon nouvel article',
    slug: 'mon-nouvel-article',
    status: 1,
    fields: {
      description: 'Description de l\'article'
    }
  })
});
```

## Gestion des tokens

### Visualisation
- **Dashboard** : Tous vos tokens sont visibles dans les paramètres du site
- **Statut** : Active/Inactive clairement affiché
- **Dernière utilisation** : Date de la dernière utilisation du token

### Actions disponibles
- **Activer/Désactiver** : Basculer rapidement un token sans le supprimer
- **Supprimer** : Suppression définitive (révoque immédiatement l'accès)
- **Monitorer** : Voir quand le token a été utilisé pour la dernière fois

### États d'un token
- **Actif** 🟢 : Le token fonctionne normalement
- **Inactif** 🟡 : Le token existe mais est désactivé temporairement
- **Supprimé** 🔴 : Le token n'existe plus et ne fonctionnera plus

## Cas d'usage courants

### 1. Application mobile
```javascript
// Création d'un article depuis une app mobile
const createArticle = async (title, content) => {
  const response = await fetch('/external-api/collection/1/elements', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.WENOBLE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: title,
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      status: 1,
      fields: { content }
    })
  });
  return response.json();
};
```

### 2. Webhook (Zapier, Make.com)
```javascript
// Webhook qui reçoit des données d'un formulaire et crée un article
exports.handler = async (event) => {
  const { title, description } = JSON.parse(event.body);
  
  await fetch('https://api.wenoble.fr/external-api/collection/2/elements', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.WENOBLE_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: title,
      slug: generateSlug(title),
      status: 0, // Brouillon
      fields: { description }
    })
  });
};
```

### 3. Script d'import
```python
import requests
import csv

API_BASE = "https://api.wenoble.fr/external-api"
TOKEN = "your_token_here"

def import_articles_from_csv(file_path):
    with open(file_path, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            response = requests.post(
                f"{API_BASE}/collection/1/elements",
                headers={
                    'x-api-key': TOKEN,
                    'Content-Type': 'application/json'
                },
                json={
                    'name': row['title'],
                    'slug': row['slug'],
                    'status': 1,
                    'fields': {
                        'content': row['content'],
                        'author': row['author']
                    }
                }
            )
            print(f"Article créé: {response.json()}")
```

## Dépannage

### Token invalide
- **Vérifiez** que le token n'a pas été supprimé
- **Vérifiez** que le token est actif
- **Vérifiez** le format du header (`x-api-key` ou `api-key`)

### Permissions insuffisantes
- **Vérifiez** que le token a la permission "CMS"
- **Vérifiez** que vous accédez au bon site web

### Erreur 404 sur les collections
- **Vérifiez** l'ID de la collection
- **Vérifiez** que la collection appartient au bon site web

## Support

En cas de problème avec vos tokens API :
1. Vérifiez les logs d'utilisation dans le dashboard
2. Testez avec un nouveau token temporaire
3. Contactez le support WeNoble avec les détails de l'erreur