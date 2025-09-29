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
    "autre_champ": "Valeur du champ"
  }
}
```

#### Paramètres
- `name` (string, obligatoire) : Nom de l'élément
- `slug` (string, obligatoire) : Slug unique pour l'élément
- `status` (integer, optionnel) : Statut de l'élément (0 = brouillon, 1 = publié). Par défaut: 0
- `fields` (object, optionnel) : Champs personnalisés de l'élément. **La clé doit être le nom du champ** tel que défini dans la configuration de la collection (pas l'ID)

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

## Codes d'erreur

- `400` : Requête invalide (paramètres manquants)
- `401` : Clé API manquante ou invalide
- `404` : Ressource non trouvée (collection, site web)
- `409` : Conflit (slug déjà existant)
- `500` : Erreur serveur

## Workflow recommandé

1. **Obtenir les collections** : `GET /collections`
2. **Obtenir la configuration** : `GET /collections/{collectionId}/config`
3. **Créer un élément** : `POST /collection/{collectionId}/elements`
4. **Publier le site** : `POST /websites/publish`

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