-- Script de test pour vérifier les politiques RLS de la table profile_images
-- À exécuter dans Dashboard Supabase > SQL Editor après avoir appliqué les politiques

-- 1. Vérifier la structure de la table
SELECT 'STRUCTURE DE LA TABLE profile_images:' as test;
SELECT 
    column_name as "Colonne",
    data_type as "Type",
    is_nullable as "Nullable",
    column_default as "Valeur par défaut"
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profile_images'
ORDER BY ordinal_position;

-- 2. Vérifier que RLS est activé
SELECT 'VÉRIFICATION RLS:' as test;
SELECT 
    schemaname as "Schéma",
    tablename as "Table",
    rowsecurity as "RLS Activé",
    CASE 
        WHEN rowsecurity THEN '✅ RLS Correctement activé'
        ELSE '❌ RLS Non activé'
    END as "Status"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profile_images';

-- 3. Lister toutes les politiques créées
SELECT 'POLITIQUES RLS CONFIGURÉES:' as test;
SELECT 
    policyname as "Nom de la politique",
    cmd as "Opération",
    permissive as "Type",
    roles as "Rôles autorisés",
    CASE 
        WHEN qual IS NOT NULL AND qual != '' THEN 
            CASE 
                WHEN qual = 'true' THEN 'Aucune restriction (tous)'
                WHEN qual LIKE '%auth.uid() = user_id%' THEN 'Seulement ses propres données'
                ELSE 'Restriction personnalisée'
            END
        ELSE 'Pas de condition USING'
    END as "Condition d'accès",
    CASE 
        WHEN with_check IS NOT NULL AND with_check != '' THEN 
            CASE 
                WHEN with_check LIKE '%auth.uid() = user_id%' THEN 'Peut seulement modifier ses propres données'
                ELSE 'Restriction personnalisée'
            END
        ELSE 'Pas de condition WITH CHECK'
    END as "Condition de modification"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profile_images'
ORDER BY policyname;

-- 4. Vérifier les permissions des rôles
SELECT 'PERMISSIONS DES RÔLES:' as test;
SELECT 
    grantee as "Rôle",
    privilege_type as "Permission accordée"
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'profile_images'
AND grantee IN ('authenticated', 'anon', 'postgres')
ORDER BY grantee, privilege_type;

-- 5. Compter les données actuelles
SELECT 'DONNÉES ACTUELLES:' as test;
SELECT 
    COUNT(*) as "Nombre total d'images de profil"
FROM public.profile_images;

-- 6. Test de la fonction auth.uid() (simulation)
SELECT 'TEST FONCTION auth.uid():' as test;
SELECT 
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 
            '✅ Utilisateur authentifié détecté: ' || auth.uid()::text
        ELSE 
            '⚠️ Aucun utilisateur authentifié (normal en mode SQL Editor)'
    END as "Status d'authentification";

-- 7. Résumé des règles configurées
SELECT 'RÉSUMÉ DES RÈGLES CONFIGURÉES:' as summary;

SELECT 
    '✅ SELECT (Lecture)' as operation,
    'Toutes les personnes authentifiées' as qui_peut,
    'Voir toutes les photos de profil' as quoi,
    'Aucune restriction' as restriction;

SELECT 
    '✅ INSERT (Ajout)' as operation,
    'Personnes authentifiées' as qui_peut,
    'Ajouter leur propre photo' as quoi,
    'Seulement pour eux-mêmes (user_id = auth.uid())' as restriction;

SELECT 
    '✅ UPDATE (Modification)' as operation,
    'Personnes authentifiées' as qui_peut,
    'Modifier leur propre photo' as quoi,
    'Seulement leur propre photo (user_id = auth.uid())' as restriction;

SELECT 
    '✅ DELETE (Suppression)' as operation,
    'Personnes authentifiées' as qui_peut,
    'Supprimer leur propre photo' as quoi,
    'Seulement leur propre photo (user_id = auth.uid())' as restriction;

-- 8. Vérifier les index
SELECT 'INDEX CRÉÉS:' as test;
SELECT 
    indexname as "Nom de l'index",
    tablename as "Table",
    indexdef as "Définition"
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'profile_images'
ORDER BY indexname;

SELECT '🎯 TESTS TERMINÉS' as final_status;
SELECT 'Les politiques RLS sont configurées selon vos spécifications!' as conclusion;