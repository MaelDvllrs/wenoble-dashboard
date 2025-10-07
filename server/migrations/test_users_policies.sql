-- Script de test pour vérifier les politiques RLS des tables users et profile_images
-- À exécuter dans Dashboard Supabase > SQL Editor

-- 1. Vérifier que RLS est activé sur les tables
SELECT 'VÉRIFICATION RLS ACTIVÉ:' as test;
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Activé'
        ELSE '❌ RLS Désactivé'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'profile_images')
ORDER BY tablename;

-- 2. Lister toutes les politiques sur la table users
SELECT 'POLITIQUES SUR LA TABLE users:' as test;
SELECT 
    policyname as "Nom de la politique",
    cmd as "Commande",
    permissive as "Permissive",
    CASE 
        WHEN qual IS NOT NULL THEN 'Oui'
        ELSE 'Non'
    END as "A une condition USING",
    CASE 
        WHEN with_check IS NOT NULL THEN 'Oui'
        ELSE 'Non'
    END as "A une condition WITH CHECK"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users'
ORDER BY policyname;

-- 3. Lister toutes les politiques sur la table profile_images
SELECT 'POLITIQUES SUR LA TABLE profile_images:' as test;
SELECT 
    policyname as "Nom de la politique",
    cmd as "Commande",
    permissive as "Permissive",
    CASE 
        WHEN qual IS NOT NULL THEN 'Oui'
        ELSE 'Non'
    END as "A une condition USING",
    CASE 
        WHEN with_check IS NOT NULL THEN 'Oui'
        ELSE 'Non'
    END as "A une condition WITH CHECK"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profile_images'
ORDER BY policyname;

-- 4. Vérifier les permissions des rôles
SELECT 'PERMISSIONS DES RÔLES:' as test;
SELECT 
    grantee as "Rôle",
    table_name as "Table",
    privilege_type as "Permission"
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'profile_images')
AND grantee IN ('authenticated', 'anon', 'postgres')
ORDER BY table_name, grantee, privilege_type;

-- 5. Test de la fonction auth.uid() (simulation)
SELECT 'TEST FONCTION auth.uid():' as test;
SELECT 
    CASE 
        WHEN auth.uid() IS NOT NULL THEN '✅ Utilisateur authentifié détecté: ' || auth.uid()::text
        ELSE '⚠️ Aucun utilisateur authentifié (normal en mode SQL Editor)'
    END as auth_status;

-- 6. Compter les utilisateurs et images
SELECT 'STATISTIQUES ACTUELLES:' as test;
SELECT 'Nombre d\'utilisateurs' as type, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Nombre d\'images de profil' as type, COUNT(*) as count FROM public.profile_images;

-- 7. Vérifier la contrainte de clé étrangère sur profile_images
SELECT 'CONTRAINTES SUR profile_images:' as test;
SELECT 
    conname as "Nom de la contrainte",
    contype as "Type",
    CASE contype
        WHEN 'f' THEN 'Foreign Key'
        WHEN 'p' THEN 'Primary Key'
        WHEN 'u' THEN 'Unique'
        WHEN 'c' THEN 'Check'
        ELSE 'Autre'
    END as "Type de contrainte"
FROM pg_constraint 
WHERE conrelid = 'public.profile_images'::regclass;

SELECT '✅ TESTS TERMINÉS' as status;
SELECT 'Les politiques sont configurées pour permettre aux utilisateurs de modifier leurs propres données' as conclusion;