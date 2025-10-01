# API Externe WeNoble

Cette API permet aux utilisateurs externes d'ajouter des éléments à une collection et de publier un site web en utilisant une clé d'authentification.

## Authentification

Toutes les requêtes doivent inclure une clé API valide dans les headers :
- `x-api-key: VOTRE_CLE_API` 
- ou `api-key: VOTRE_CLE_API`

La clé API doit être un token JWT valide généré par le système WeNoble.

## Base URL

```
http://localhost:3002/external-api
```

## Endpoints

### 1. Créer un élément de collection

**POST** `/collection/{collectionId}/elements`

Ajoute un nouvel élément à une collection spécifiée.

#### Paramètres de l'URL
- `collectionId` (obligatoire) : ID de la collection

#### Corps de la requête
```json
{
  "name": "Nom de l'élément",
  "slug": "slug-de-element", 
  "status": 1,
  "fields": {
    "description": "Description de l'élément",
    "content": "Contenu riche de l'article",
    "photo": "https://example.com/image.jpg",
    "photo_avec_details": {
      "url": "https://example.com/main-image.jpg",
      "alt": "Photo avec description détaillée",
      "name": "Photo détaillée"
    },
    "galerie": [
      "https://example.com/gallery1.jpg",
      {
        "url": "https://example.com/gallery2.jpg",
        "alt": "Deuxième image de la galerie",
        "name": "Galerie 2"
      }
    ]
  }
}
```

#### Paramètres
- `name` (string, obligatoire) : Nom de l'élément
- `slug` (string, obligatoire) : Slug unique pour l'élément
- `status` (integer, optionnel) : Statut de l'élément (0 = brouillon, 1 = publié). Par défaut: 0
- `fields` (object, optionnel) : Champs personnalisés de l'élément. **La clé doit être le nom du champ** tel que défini dans la configuration de la collection (pas l'ID)

**Note** : Dans l'exemple ci-dessus, `"photo"` et `"photo_avec_details"` sont deux champs différents qui montrent les deux formats possibles pour les images (simple vs détaillé). Dans un projet réel, vous n'auriez probablement qu'un seul champ photo selon vos besoins.

#### Réponse de succès (201)
```json
{
  "success": true,
  "message": "Élément de collection créé avec succès",
  "element": {
    "id": 123,
    "name": "Nom de l'élément",
    "slug": "slug-de-element",
    "status": 1,
    "collection_id": 456,
    "created_at": "2025-09-29T10:00:00.000Z"
  },
  "processedFields": {
    "description": {
      "type": "text",
      "value": "Description de l'élément"
    }
  }
}
```

#### Exemple de requête
```bash
curl -X POST "http://localhost:3002/external-api/collection/1/elements" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon nouvel article",
    "slug": "mon-nouvel-article",
    "status": 1,
    "fields": {
      "description": "Une description de l'\''article",
      "content": "Le contenu principal de l'\''article"
    }
  }'
```

### 2. Publier un site web

**POST** `/websites/publish`

Déclenche la publication/génération statique du site web associé au token API.

#### Réponse de succès (200)
```json
{
  "success": true,
  "message": "Publication du site déclenchée avec succès",
  "website_id": "123",
  "folder_project": "/path/to/project",
  "timestamp": "2025-09-29T10:00:00.000Z"
}
```

#### Exemple de requête
```bash
curl -X POST "http://localhost:3002/external-api/websites/publish" \
  -H "x-api-key: YOUR_API_KEY"
```

### 3. Récupérer les collections du site

**GET** `/collections`

Récupère la liste des collections du site web associé au token API.

#### Réponse de succès (200)
```json
{
  "success": true,
  "collections": [
    {
      "id": 1,
      "collection_name": "Articles",
      "collection_slug": "articles",
      "created_at": "2025-09-29T10:00:00.000Z",
      "updated_at": "2025-09-29T10:00:00.000Z"
    }
  ]
}
```

#### Exemple de requête
```bash
curl -X GET "http://localhost:3002/external-api/collections" \
  -H "x-api-key: YOUR_API_KEY"
```

### 4. Récupérer la configuration d'une collection

**GET** `/collections/{collectionId}/config`

Récupère la configuration des champs d'une collection.

#### Paramètres de l'URL
- `collectionId` (obligatoire) : ID de la collection

#### Réponse de succès (200)
```json
{
  "success": true,
  "config": [
    {
      "id": 1,
      "tab_field": "text",
      "name_field": "Description",
      "description_field": "Description de l'élément"
    },
    {
      "id": 2,
      "tab_field": "richText",
      "name_field": "Contenu",
      "description_field": "Contenu principal de l'article"
    }
  ]
}
```

#### Exemple de requête
```bash
curl -X GET "http://localhost:3002/external-api/collections/1/config" \
  -H "x-api-key: YOUR_API_KEY"
```

### 5. Récupérer les éléments d'une collection

**GET** `/collections/{collectionId}/elements`

Récupère la liste des éléments d'une collection avec pagination.

#### Paramètres de l'URL
- `collectionId` (obligatoire) : ID de la collection

#### Paramètres de requête (optionnels)
- `status` (integer) : Filtrer par statut (0 = brouillon, 1 = publié)
- `limit` (integer) : Nombre d'éléments par page (défaut: 50, max: 100)
- `offset` (integer) : Décalage pour la pagination (défaut: 0)

#### Réponse de succès (200)
```json
{
  "success": true,
  "collection": {
    "id": "827cf408-3f8b-405b-b475-8d69fd2d6ff3",
    "name": "Articles"
  },
  "elements": [
    {
      "id": 123,
      "name": "Mon article",
      "slug": "mon-article",
      "status": 1,
      "created_at": "2025-10-01T10:00:00.000Z",
      "updated_at": "2025-10-01T10:30:00.000Z",
      "published_at": "2025-10-01T10:30:00.000Z",
      "created_by": "user-uuid",
      "published_by": "user-uuid"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

#### Exemples de requêtes
```bash
# Récupérer tous les éléments
curl -X GET "http://localhost:3002/external-api/collections/827cf408-3f8b-405b-b475-8d69fd2d6ff3/elements" \
  -H "x-api-key: YOUR_API_KEY"

# Récupérer seulement les éléments publiés
curl -X GET "http://localhost:3002/external-api/collections/827cf408-3f8b-405b-b475-8d69fd2d6ff3/elements?status=1" \
  -H "x-api-key: YOUR_API_KEY"

# Récupérer avec pagination
curl -X GET "http://localhost:3002/external-api/collections/827cf408-3f8b-405b-b475-8d69fd2d6ff3/elements?limit=10&offset=20" \
  -H "x-api-key: YOUR_API_KEY"
```

## Types de champs supportés

### Text
Champ texte simple. Utilisez le nom du champ comme clé.
```json
{
  "fields": {
    "nom_du_champ": "Valeur texte"
  }
}
```

### RichText  
Champ de texte enrichi. Utilisez le nom du champ comme clé. Peut accepter :
- Une chaîne de caractères (sera convertie en format DraftJS)
- Un objet DraftJS complet

```json
{
  "fields": {
    "contenu": "Texte simple qui sera converti",
    "contenu_avance": {
      "blocks": [...],
      "entityMap": {...}
    }
  }
}
```

### Image
Champ image. Utilisez le nom du champ comme clé. Peut accepter :
- Une URL simple (sera utilisée comme url, alt et name)
- Un objet avec url, alt et name

```json
{
  "fields": {
    "photo": "https://example.com/image.jpg",
    "photo_avancee": {
      "url": "https://example.com/image.jpg",
      "alt": "Description de l'image",
      "name": "Nom de l'image"
    }
  }
}
```

**Note** : Si seule l'URL est fournie, elle sera utilisée pour l'alt et le name également.

### Gallery
Champ galerie d'images. Utilisez le nom du champ comme clé. Doit être un tableau d'images. Chaque image peut être :
- Une URL simple (sera utilisée comme url, alt et name)
- Un objet avec url, alt et name

```json
{
  "fields": {
    "galerie_simple": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg"
    ],
    "galerie_avancee": [
      {
        "url": "https://example.com/image1.jpg",
        "alt": "Première image",
        "name": "Image 1"
      },
      {
        "url": "https://example.com/image2.jpg",
        "alt": "Deuxième image", 
        "name": "Image 2"
      }
    ],
    "galerie_mixte": [
      "https://example.com/simple.jpg",
      {
        "url": "https://example.com/avancee.jpg",
        "alt": "Image avec description",
        "name": "Image avancée"
      }
    ]
  }
}
```

## Codes d'erreur

- `400` : Requête invalide (paramètres manquants)
- `401` : Clé API manquante ou invalide
- `404` : Ressource non trouvée (collection, site web)
- `409` : Conflit (slug déjà existant)
- `500` : Erreur serveur

## Workflow recommandé

1. **Obtenir les collections** : `GET /collections`
2. **Obtenir la configuration** : `GET /collections/{collectionId}/config`
3. **Lister les éléments existants** : `GET /collections/{collectionId}/elements` (optionnel)
4. **Créer un élément** : `POST /collection/{collectionId}/elements`
5. **Publier le site** : `POST /websites/publish`

## Exemple complet

```javascript
const API_KEY = 'your_api_key_here';
const BASE_URL = 'http://localhost:3002/external-api';

// 1. Récupérer les collections
const collections = await fetch(`${BASE_URL}/collections`, {
  headers: { 'x-api-key': API_KEY }
}).then(r => r.json());

// 2. Créer un nouvel élément
const newElement = await fetch(`${BASE_URL}/collection/1/elements`, {
  method: 'POST',
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Mon article',
    slug: 'mon-article',
    status: 1,
    fields: {
      // Utilisez le nom du champ (name_field) comme clé, pas l'ID
      description: 'Description de l\'article',
      content: 'Contenu de l\'article'
    }
  })
}).then(r => r.json());

// 3. Publier le site
const publish = await fetch(`${BASE_URL}/websites/publish`, {
  method: 'POST',
  headers: { 'x-api-key': API_KEY }
}).then(r => r.json());
```