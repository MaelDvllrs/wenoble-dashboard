-- Script de test pour les nouvelles fonctionnalités de profil utilisateur
-- À exécuter dans Dashboard Supabase > SQL Editor

-- 1. Vérifier que les colonnes first_name et last_name ont été ajoutées
SELECT 'VÉRIFICATION STRUCTURE TABLE users:' as test;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('first_name', 'last_name', 'username', 'email')
ORDER BY column_name;

-- 2. Vérifier la table profile_images
SELECT 'VÉRIFICATION STRUCTURE TABLE profile_images:' as test;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profile_images'
ORDER BY ordinal_position;

-- 3. Test d'insertion d'un profil utilisateur complet (simulation)
SELECT 'TEST DONNÉES PROFIL:' as test;

-- Compter les utilisateurs actuels
SELECT 
  'Utilisateurs totaux' as type,
  COUNT(*) as count
FROM public.users
UNION ALL
SELECT 
  'Utilisateurs avec first_name' as type,
  COUNT(*) as count
FROM public.users 
WHERE first_name IS NOT NULL AND first_name != ''
UNION ALL
SELECT 
  'Utilisateurs avec last_name' as type,
  COUNT(*) as count
FROM public.users 
WHERE last_name IS NOT NULL AND last_name != ''
UNION ALL
SELECT 
  'Images de profil' as type,
  COUNT(*) as count
FROM public.profile_images;

-- 4. Test de mise à jour d'un utilisateur existant (si il y en a un)
DO $$
DECLARE
    existing_user_id UUID;
BEGIN
    -- Prendre le premier utilisateur existant
    SELECT id INTO existing_user_id 
    FROM public.users 
    LIMIT 1;

    IF existing_user_id IS NOT NULL THEN
        -- Tester la mise à jour des nouveaux champs
        UPDATE public.users 
        SET 
            first_name = 'Test',
            last_name = 'User Updated'
        WHERE id = existing_user_id;
        
        RAISE NOTICE '✅ Test mise à jour réussi pour utilisateur: %', existing_user_id;
        
        -- Vérifier la mise à jour
        PERFORM * FROM public.users 
        WHERE id = existing_user_id 
        AND first_name = 'Test' 
        AND last_name = 'User Updated';
        
        IF FOUND THEN
            RAISE NOTICE '✅ Vérification mise à jour réussie';
        ELSE
            RAISE WARNING '❌ Erreur dans la vérification de mise à jour';
        END IF;
        
    ELSE
        RAISE NOTICE '⚠️ Aucun utilisateur existant pour le test';
    END IF;
END $$;

SELECT '✅ TESTS TERMINÉS - Vérifiez les résultats ci-dessus' as status;