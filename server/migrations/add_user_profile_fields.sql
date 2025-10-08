-- Migration pour ajouter les champs first_name et last_name à la table users
-- À exécuter dans Dashboard Supabase > SQL Editor

-- 1. Ajouter les colonnes first_name et last_name si elles n'existent pas
DO $$ 
BEGIN
    -- Ajouter first_name si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'first_name'
    ) THEN
        ALTER TABLE public.users ADD COLUMN first_name TEXT;
        RAISE NOTICE '✅ Colonne first_name ajoutée à la table users';
    ELSE
        RAISE NOTICE '⚠️ Colonne first_name existe déjà';
    END IF;

    -- Ajouter last_name si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'last_name'
    ) THEN
        ALTER TABLE public.users ADD COLUMN last_name TEXT;
        RAISE NOTICE '✅ Colonne last_name ajoutée à la table users';
    ELSE
        RAISE NOTICE '⚠️ Colonne last_name existe déjà';
    END IF;
END $$;

-- 2. Vérifier la structure de la table
SELECT 'STRUCTURE DE LA TABLE users:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

SELECT '✅ MIGRATION TERMINÉE - Champs first_name et last_name ajoutés' as status;