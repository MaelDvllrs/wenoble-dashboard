# Test du système d'édition

## Flow complet

### 1. Modification de texte
1. Utilisateur clique sur un élément texte
2. `handleElementSelect` est appelé
3. Utilisateur modifie le texte dans l'input
4. `handleTextChange` est appelé
   - Met à jour le texte dans l'iframe
   - Génère le `elementPath` via `getElementPath()`
   - Ajoute/met à jour l'édition dans `elementEdits`
5. Bouton "Enregistrer (X)" devient actif
6. Utilisateur clique sur "Enregistrer"
7. `handleSave` envoie POST à `/api/websites/:websiteId/edits/bulk`
8. Backend reçoit les éditions
9. Backend retourne succès
10. `elementEdits` est vidé

### 2. Modification d'image
1. Utilisateur clique sur une image
2. `handleElementSelect` est appelé
3. Utilisateur clique sur "Remplacer l'image"
4. Sélectionne un fichier
5. `FileReader.onload` est déclenché
   - Convertit le fichier en base64
   - Met à jour l'image dans l'iframe
   - Génère le `elementPath` via `getElementPath()`
   - Ajoute/met à jour l'édition dans `elementEdits` avec type: 'image'
6. Bouton "Enregistrer (X)" devient actif
7. Utilisateur clique sur "Enregistrer"
8. `handleSave` envoie POST à `/api/websites/:websiteId/edits/bulk`
9. Backend reçoit base64, upload vers Supabase Storage
10. Backend retourne URL publique dans la réponse
11. `elementEdits` est vidé

## Vérifications

### Frontend
- ✅ `getElementPath()` génère des sélecteurs CSS stables
- ✅ `handleTextChange` met à jour `elementEdits`
- ✅ Input d'image met à jour `elementEdits`
- ✅ `handleSave` utilise `/api/websites/` (corrigé)
- ✅ Bouton désactivé quand `elementEdits.length === 0`
- ✅ Affiche le nombre d'éditions en cours

### Backend
- ✅ Routes montées dans `index.js`
- ✅ Controller valide les données
- ✅ Service gère l'upsert
- ✅ Repository stocke en mémoire (à remplacer par DB)
- ✅ ImageUploadService upload vers Supabase

### Base de données
- ⏳ Créer la table `website_edits` (SQL fourni)
- ⏳ Créer le bucket Supabase `website-edits`

## Tests manuels à effectuer

### Test 1: Édition de texte
```
1. Ouvrir StaticEditor
2. Cliquer sur un titre (h1, h2, etc.)
3. Modifier le texte dans le panneau latéral
4. Vérifier que le texte change dans l'iframe
5. Vérifier que le bouton affiche "Enregistrer (1)"
6. Cliquer sur Enregistrer
7. Vérifier dans la console réseau: POST /api/websites/.../edits/bulk
8. Vérifier la réponse 200 avec success: true
```

### Test 2: Édition d'image
```
1. Ouvrir StaticEditor
2. Cliquer sur une image
3. Cliquer sur "Remplacer l'image"
4. Sélectionner une image locale
5. Vérifier que l'image change dans l'iframe
6. Vérifier que le bouton affiche "Enregistrer (1)"
7. Cliquer sur Enregistrer
8. Vérifier dans la console réseau: POST avec base64 dans body
9. Vérifier la réponse contient une URL Supabase
```

### Test 3: Éditions multiples
```
1. Modifier 2 textes différents
2. Modifier 1 image
3. Vérifier que le bouton affiche "Enregistrer (3)"
4. Cliquer sur Enregistrer
5. Vérifier que les 3 éditions sont envoyées
6. Vérifier la réponse count: 3
```

### Test 4: Upsert (même élément modifié 2 fois)
```
1. Modifier un texte: "Version 1"
2. Vérifier "Enregistrer (1)"
3. Modifier le MÊME texte: "Version 2"
4. Vérifier toujours "Enregistrer (1)" (pas 2!)
5. Sauvegarder
6. Vérifier qu'une seule édition est envoyée avec "Version 2"
```

## Problèmes potentiels

### 1. Repository en mémoire
**Symptôme:** Les éditions disparaissent au redémarrage du serveur
**Solution:** Remplacer `editRepository.js` par implémentation Supabase

### 2. Bucket non créé
**Symptôme:** Erreur 404 lors de l'upload d'image
**Solution:** Créer manuellement le bucket ou appeler `imageUploadService.ensureBucketExists()`

### 3. Base64 trop volumineux
**Symptôme:** Erreur 413 Request Entity Too Large
**Solution:** Augmenter limite dans Express `express.json({ limit: '500mb' })`

### 4. CORS
**Symptôme:** Erreur CORS lors de l'appel API
**Solution:** Vérifier la configuration CORS dans `index.js`

### 5. Token manquant
**Symptôme:** 401 Unauthorized
**Solution:** Vérifier que le token est bien passé dans le header Authorization

## Migration vers production

### Étape 1: Base de données
```sql
-- Exécuter dans Supabase SQL Editor
-- Voir: server/migrations/create-website-edits-table.sql
```

### Étape 2: Repository Supabase
Remplacer l'implémentation in-memory par:
```javascript
const { supabaseServerAdmin } = require('../supabase');

async create(editData) {
  const { data, error } = await supabaseServerAdmin()
    .from('website_edits')
    .insert([editData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### Étape 3: Storage
Créer le bucket dans Supabase Dashboard ou via API

### Étape 4: Chargement des éditions
Ajouter dans `useEffect` de StaticEditor:
```javascript
// Charger les éditions existantes au chargement de la page
const loadEdits = async () => {
  const response = await fetch(
    `${config.apiUrl}/api/websites/${selectedWebsite.id}/edits?page=${currentPage}`,
    { headers: { Authorization: `Bearer ${token}` }}
  );
  const data = await response.json();
  
  // Appliquer les éditions à l'iframe
  data.data.forEach(edit => {
    const element = iframe.querySelector(edit.elementPath);
    if (element) {
      if (edit.editType === 'text') {
        element.textContent = edit.value;
      } else if (edit.editType === 'image') {
        element.src = edit.value;
      }
    }
  });
};
```
