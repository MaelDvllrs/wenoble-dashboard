-- Fonction SQL pour créer automatiquement un workspace de base pour chaque nouvel utilisateur
-- Créé le : 2025-01-22

-- 1. Créer la fonction pour créer un workspace par défaut
CREATE OR REPLACE FUNCTION create_default_workspace_for_user(user_id UUID, username TEXT)
RETURNS UUID AS $$
DECLARE
    workspace_id UUID;
    workspace_slug_var TEXT;  -- Renommer pour éviter l'ambiguïté avec la colonne workspace_slug
    attempt_count INTEGER := 1;
    max_attempts INTEGER := 10;
    temp_count INTEGER;
BEGIN
    -- Vérifier que l'utilisateur existe
    SELECT COUNT(*) INTO temp_count FROM users WHERE id = user_id;
    
    IF temp_count = 0 THEN
        RAISE WARNING 'Utilisateur avec ID % non trouvé', user_id;
        RETURN NULL;
    END IF;
    
    -- Vérifier que l'utilisateur n'a pas déjà un workspace par défaut
    SELECT COUNT(*) INTO temp_count FROM workspaces WHERE created_by = user_id AND is_default = true;
    
    IF temp_count > 0 THEN
        RAISE WARNING 'L''utilisateur % a déjà un workspace par défaut', user_id;
        RETURN NULL;
    END IF;
    
    -- Générer un slug unique pour le workspace
    workspace_slug_var := LOWER(REPLACE(COALESCE(username, 'user'), ' ', '-')) || '-workspace';
    
    -- Vérifier l'unicité du slug et ajouter un suffixe si nécessaire
    WHILE EXISTS (SELECT 1 FROM workspaces w WHERE w.workspace_slug = workspace_slug_var) AND attempt_count <= max_attempts LOOP
        workspace_slug_var := LOWER(REPLACE(COALESCE(username, 'user'), ' ', '-')) || '-workspace-' || attempt_count;
        attempt_count := attempt_count + 1;
    END LOOP;
    
    -- Si on n'arrive pas à générer un slug unique, utiliser l'UUID
    IF attempt_count > max_attempts THEN
        workspace_slug_var := 'workspace-' || REPLACE(user_id::TEXT, '-', '');
    END IF;
    
    -- Créer le workspace par défaut
    BEGIN
        INSERT INTO workspaces (
            workspace_name, 
            workspace_slug, 
            workspace_description, 
            created_by, 
            is_default
        ) VALUES (
            COALESCE(username, 'Utilisateur') || ' - Workspace Personnel',
            workspace_slug_var,
            'Workspace personnel par défaut créé automatiquement',
            user_id,
            true
        ) RETURNING id INTO workspace_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Erreur lors de l''insertion dans workspaces: % - État SQL: %', SQLERRM, SQLSTATE;
            RETURN NULL;
    END;
    
    -- Vérifier que l'insertion a bien fonctionné
    IF workspace_id IS NULL THEN
        RAISE WARNING 'L''insertion dans workspaces n''a pas retourné d''ID';
        RETURN NULL;
    END IF;
    
    -- Ajouter l'utilisateur comme admin de son workspace
    BEGIN
        INSERT INTO user_workspaces (user_id, workspace_id, role)
        VALUES (user_id, workspace_id, 'admin');
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Erreur lors de l''insertion dans user_workspaces: % - État SQL: %', SQLERRM, SQLSTATE;
            -- On ne retourne pas NULL ici car le workspace a été créé
            -- Mais on log l'erreur
        RETURN workspace_id;
    END;
    
    -- Retourner l'ID du workspace créé
    RETURN workspace_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur globale, on log et on retourne NULL
        RAISE WARNING 'Erreur globale lors de la création du workspace pour l''utilisateur %: % - État SQL: %', user_id, SQLERRM, SQLSTATE;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Créer une fonction trigger pour automatiser la création
CREATE OR REPLACE FUNCTION trigger_create_default_workspace()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    -- Créer le workspace par défaut pour le nouvel utilisateur
    SELECT create_default_workspace_for_user(NEW.id, NEW.username) INTO new_workspace_id;
    
    -- Log pour le debugging
    IF new_workspace_id IS NOT NULL THEN
        RAISE LOG 'Workspace par défaut créé pour l''utilisateur % (ID: %)', NEW.username, NEW.id;
    ELSE
        RAISE WARNING 'Échec de la création du workspace par défaut pour l''utilisateur % (ID: %)', NEW.username, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Créer le trigger sur la table users
DROP TRIGGER IF EXISTS after_user_insert_create_workspace ON users;
CREATE TRIGGER after_user_insert_create_workspace
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_workspace();

-- 4. Fonction pour créer un workspace par défaut pour tous les utilisateurs existants qui n'en ont pas
CREATE OR REPLACE FUNCTION create_missing_default_workspaces()
RETURNS TABLE(user_id UUID, workspace_id UUID, status TEXT, error_message TEXT) AS $$
DECLARE
    user_record RECORD;
    new_workspace_id UUID;
    error_msg TEXT := '';
BEGIN
    -- Parcourir tous les utilisateurs qui n'ont pas de workspace par défaut
    FOR user_record IN 
        SELECT u.id, u.username 
        FROM users u
        WHERE NOT EXISTS (
            SELECT 1 FROM workspaces w 
            WHERE w.created_by = u.id AND w.is_default = true
        )
    LOOP
        BEGIN
            -- Créer le workspace pour cet utilisateur
            SELECT create_default_workspace_for_user(user_record.id, user_record.username) INTO new_workspace_id;
            
            -- Retourner le résultat
            user_id := user_record.id;
            workspace_id := new_workspace_id;
            status := CASE 
                WHEN new_workspace_id IS NOT NULL THEN 'SUCCESS'
                ELSE 'FAILED'
            END;
            error_message := CASE 
                WHEN new_workspace_id IS NOT NULL THEN ''
                ELSE 'Fonction create_default_workspace_for_user a retourné NULL'
            END;
            
        EXCEPTION
            WHEN OTHERS THEN
                user_id := user_record.id;
                workspace_id := NULL;
                status := 'FAILED';
                error_message := SQLERRM;
        END;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonction pour vérifier l'intégrité des workspaces
CREATE OR REPLACE FUNCTION check_workspace_integrity()
RETURNS TABLE(
    user_id UUID, 
    username TEXT, 
    has_default_workspace BOOLEAN, 
    is_admin_of_default BOOLEAN,
    issue_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        EXISTS(SELECT 1 FROM workspaces w WHERE w.created_by = u.id AND w.is_default = true) as has_default_workspace,
        EXISTS(
            SELECT 1 FROM user_workspaces uw 
            JOIN workspaces w ON w.id = uw.workspace_id 
            WHERE uw.user_id = u.id 
            AND w.created_by = u.id 
            AND w.is_default = true 
            AND uw.role = 'admin'
        ) as is_admin_of_default,
        CASE 
            WHEN NOT EXISTS(SELECT 1 FROM workspaces w WHERE w.created_by = u.id AND w.is_default = true) 
            THEN 'Pas de workspace par défaut'
            WHEN NOT EXISTS(
                SELECT 1 FROM user_workspaces uw 
                JOIN workspaces w ON w.id = uw.workspace_id 
                WHERE uw.user_id = u.id 
                AND w.created_by = u.id 
                AND w.is_default = true 
                AND uw.role = 'admin'
            ) 
            THEN 'Pas admin de son workspace par défaut'
            ELSE 'OK'
        END as issue_description
    FROM users u
    ORDER BY u.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- 6. Ajouter des commentaires pour la documentation
COMMENT ON FUNCTION create_default_workspace_for_user(UUID, TEXT) IS 
'Crée un workspace par défaut pour un utilisateur donné avec un slug unique';

COMMENT ON FUNCTION trigger_create_default_workspace() IS 
'Fonction trigger qui crée automatiquement un workspace par défaut lors de la création d''un utilisateur';

COMMENT ON FUNCTION create_missing_default_workspaces() IS 
'Crée des workspaces par défaut pour tous les utilisateurs existants qui n''en ont pas - retourne les détails des erreurs';

COMMENT ON FUNCTION check_workspace_integrity() IS 
'Vérifie l''intégrité des workspaces par défaut pour tous les utilisateurs';

-- 7. Instructions d''utilisation
-- Pour créer des workspaces pour tous les utilisateurs existants :
-- SELECT * FROM create_missing_default_workspaces();

-- Pour vérifier l'intégrité des workspaces :
-- SELECT * FROM check_workspace_integrity();

-- Pour créer manuellement un workspace pour un utilisateur spécifique :
-- SELECT create_default_workspace_for_user('USER_ID_HERE', 'USERNAME_HERE');






