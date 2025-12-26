# Configuration Supabase Storage pour les images

## 1. Créer le bucket dans Supabase Dashboard

1. Accéder à votre projet Supabase
2. Aller dans **Storage** dans le menu latéral
3. Cliquer sur **New Bucket**
4. Configurer le bucket :
   - **Name:** `website-edits`
   - **Public bucket:** ✓ Coché (pour URLs publiques)
   - **File size limit:** 10 MB
   - **Allowed MIME types:** image/* (optionnel)

## 2. Ou laisser l'API créer automatiquement

Le service `imageUploadService.js` peut créer le bucket automatiquement au premier upload via :

```javascript
await imageUploadService.ensureBucketExists();
```

## 3. Structure de stockage

Les images sont organisées ainsi :

```
website-edits/
  └── {websiteId}/
      └── {page-path}/
          ├── 1735034400000-a1b2c3d4e5f6.jpg
          ├── 1735034401234-b2c3d4e5f6g7.png
          └── ...
```

**Exemple:**
```
website-edits/
  └── website-abc/
      ├── root/
      │   ├── 1735034400000-xyz123.jpg
      │   └── 1735034401000-abc456.png
      └── about/
          └── 1735034402000-def789.jpg
```

## 4. URLs publiques générées

Format : 
```
https://[project-id].supabase.co/storage/v1/object/public/website-edits/{websiteId}/{page-path}/{filename}
```

Exemple :
```
https://abcdefgh.supabase.co/storage/v1/object/public/website-edits/website-abc/root/1735034400000-xyz123.jpg
```

## 5. Politique de sécurité (RLS)

Le bucket est **public** pour permettre l'accès direct aux images via URL.

Pour un contrôle plus strict, désactivez le mode public et ajoutez des politiques RLS :

```sql
-- Lecture publique
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'website-edits');

-- Écriture authentifiée seulement
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'website-edits' 
  AND auth.role() = 'authenticated'
);

-- Suppression par propriétaire
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'website-edits'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 6. Nettoyage des images

Pour supprimer une image lors de la suppression d'une édition :

```javascript
const imageUploadService = require('./imageUploadService');

// Dans deleteEdit
if (edit.editType === 'image' && edit.value) {
  await imageUploadService.deleteImage(edit.value);
}
```

## 7. Limites et quotas

- **Taille max par fichier:** 10 MB (configurable)
- **Formats supportés:** JPEG, PNG, GIF, WebP, SVG
- **Stockage total:** Selon votre plan Supabase (1 GB gratuit)
- **Bande passante:** Selon votre plan Supabase (2 GB/mois gratuit)

## 8. Optimisation

### Compression d'images

Ajouter une compression avant upload :

```javascript
const sharp = require('sharp');

// Dans imageUploadService.uploadImage
if (contentType.startsWith('image/')) {
  buffer = await sharp(buffer)
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}
```

### Cache HTTP

Les images sont servies avec `cache-control: max-age=31536000` (1 an).

### CDN

Supabase Storage utilise automatiquement un CDN pour la distribution mondiale.
