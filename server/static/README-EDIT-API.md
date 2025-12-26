# Static Site Edit API

API pour gérer les éditions d'éléments de sites statiques via un éditeur visuel iframe.

## Architecture

```
editRoutes.js           → Définit les routes Express
editController.js       → Gère la logique HTTP (validation, réponses)
editService.js          → Contient la logique métier (upsert, soft delete)
editRepository.js       → Abstraction de la base de données
imageUploadService.js   → Upload des images vers Supabase Storage
```

## Modèle de données

```javascript
{
  id: string,
  websiteId: string,
  pagePath: string,        // ex: "/", "/about", "/blog/post"
  elementPath: string,     // ex: "body > section:nth-child(2) > h1"
  editType: "text" | "image",
  value: string,           // HTML pour text, URL publique Supabase pour image
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null   // Soft delete
}
```

## Gestion des images

Les images sont automatiquement uploadées vers **Supabase Storage** (bucket `website-edits`) :

- **Base64 → Upload automatique** : Les données base64 sont converties en fichiers et stockées
- **URL existante → Pas d'upload** : Les URLs HTTP/HTTPS sont conservées telles quelles
- **Organisation** : `websiteId/page-path/timestamp-random.ext`
- **URL publique** : Retournée et stockée dans la base de données

### Configuration Supabase Storage

1. Créer un bucket public `website-edits` dans Supabase Dashboard
2. Ou laisser l'API le créer automatiquement au premier upload
3. Limite : 10MB par fichier

## Routes disponibles

### 1. Sauvegarder une édition

```http
POST /api/websites/:websiteId/edits
Content-Type: application/json

{
  "pagePath": "/about",
  "elementPath": "body > section:nth-child(2) > h1",
  "editType": "text",
  "value": "<strong>New title</strong>"
}
```

**Pour une image (base64) :**
```json
{
  "pagePath": "/",
  "elementPath": "section > img",
  "editType": "image",
  "value": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Comportement:**
- Si `editType === "image"` et valeur en base64 → Upload automatique vers Supabase Storage
- Si une édition existe déjà pour `websiteId + pagePath + elementPath` → MAJ
- Sinon → Création

**Réponse (texte) :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "websiteId": "website-abc",
    "pagePath": "/about",
    "elementPath": "body > section:nth-child(2) > h1",
    "editType": "text",
    "value": "<strong>New title</strong>",
    "createdAt": "2025-12-24T10:00:00.000Z",
    "updatedAt": "2025-12-24T10:00:00.000Z",
    "deletedAt": null
  }
}
```

**Réponse (image) :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-456",
    "websiteId": "website-abc",
    "pagePath": "/",
    "elementPath": "section > img",
    "editType": "image",
    "value": "https://[project].supabase.co/storage/v1/object/public/website-edits/website-abc/root/1735034400000-a1b2c3d4e5f6.jpg",
    "createdAt": "2025-12-24T10:00:00.000Z",
    "updatedAt": "2025-12-24T10:00:00.000Z",
    "deletedAt": null
  }
}
```

### 2. Sauvegarder plusieurs éditions

```http
POST /api/websites/:websiteId/edits/bulk
Content-Type: application/json

{
  "edits": [
    {
      "pagePath": "/",
      "elementPath": "header > h1",
      "editType": "text",
      "value": "Welcome!"
    },
    {
      "pagePath": "/",
      "elementPath": "section > img",
      "editType": "image",
      "value": "data:image/png;base64,iVBORw0KGgoAAAANS..."
    }
  ]
}
```

**Note:** Les images en base64 sont automatiquement uploadées vers Supabase Storage.

**Réponse:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "uuid-1",
      "websiteId": "website-abc",
      "pagePath": "/",
      "elementPath": "header > h1",
      "editType": "text",
      "value": "Welcome!",
      "createdAt": "2025-12-24T10:00:00.000Z"
    },
    {
      "id": "uuid-2",
      "websiteId": "website-abc",
      "pagePath": "/",
      "elementPath": "section > img",
      "editType": "image",
      "value": "https://[project].supabase.co/storage/v1/object/public/website-edits/...",
      "createdAt": "2025-12-24T10:00:00.000Z"
    }
  ]
}
```

### 3. Récupérer les éditions d'une page

```http
GET /api/websites/:websiteId/edits?page=/about
```

**Réponse:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "1",
      "pagePath": "/about",
      "elementPath": "h1",
      "editType": "text",
      "value": "About Us",
      "createdAt": "2025-12-23T09:00:00.000Z"
    }
  ]
}
```

### 4. Supprimer une édition (soft delete)

```http
DELETE /api/websites/:websiteId/edits/:editId
```

**Note:** L'image associée (si stockée sur Supabase) peut être supprimée automatiquement.

**Réponse:**
```json
{
  "success": true,
  "message": "Edit deleted successfully"
}
```

### 5. Liste des pages éditées

```http
GET /api/websites/:websiteId/pages
```

**Réponse:**
```json
{
  "success": true,
  "count": 3,
  "data": ["/", "/about", "/contact"]
}
```

## Intégration dans Express

```javascript
const express = require('express');
const editRoutes = require('./static/editRoutes');

const app = express();

app.use(express.json());
app.use('/api', editRoutes);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Validation des données

Le controller valide :
- `pagePath` : requis, string
- `elementPath` : requis, string
- `editType` : requis, "text" ou "image"
- `value` : requis

## Implémentation base de données

Le repository actuel utilise une implémentation in-memory pour démo.

Pour production, remplacez par SQL (exemple inclus dans `editRepository.js`) ou MongoDB :

```javascript
// MongoDB example
async create(editData) {
  const result = await db.collection('site_edits').insertOne(editData);
  return { id: result.insertedId, ...editData };
}

async findByPath(siteId, pagePath, elementPath) {
  return await db.collection('site_edits').findOne({
    siteId,
    pagePath,
    elementPath
  });
}
```

## Gestion des erreurs

Toutes les routes retournent des erreurs standardisées :

```json
{
  "error": "Description de l'erreur",
  "message": "Détails techniques"
}
```

Codes HTTP :
- `200` : Succès
- `400` : Validation échouée
- `404` : Ressource non trouvée
- `500` : Erreur serveur

## Tests recommandés

```javascript
// Exemple de test avec supertest
const request = require('supertest');

describe('POST /api/sites/:siteId/edits', () => {
  it('should create a new edit', async () => {
    const res = await request(app)
      .post('/api/sites/site-123/edits')
      .send({
        pagePath: '/',
        elementPath: 'h1',
        editType: 'text',
        value: 'Hello'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```
