-- Version simplifiée pour tester et corriger l'ambiguïté workspace_slug
-- Créé le : 2025-01-22

-- Fonction simplifiée sans debug pour isoler le problème
CREATE OR REPLACE FUNCTION create_default_workspace_simple(user_id UUID, username TEXT)
RETURNS UUID AS $$
DECLARE
    workspace_id UUID;
    workspace_slug_var TEXT;  -- Renommer la variable pour éviter l'ambiguïté
    attempt_count INTEGER := 1;
    max_attempts INTEGER := 10;
    temp_count INTEGER;
BEGIN
    -- Vérifier que l'utilisateur existe
    SELECT COUNT(*) INTO temp_count FROM users u WHERE u.id = user_id;
    IF temp_count = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Vérifier que l'utilisateur n'a pas déjà un workspace par défaut
    SELECT COUNT(*) INTO temp_count FROM workspaces w WHERE w.created_by = user_id AND w.is_default = true;
    IF temp_count > 0 THEN
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
    
    -- Ajouter l'utilisateur comme admin de son workspace
    INSERT INTO user_workspaces (user_id, workspace_id, role)
    VALUES (user_id, workspace_id, 'admin');
    
    RETURN workspace_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erreur lors de la création du workspace pour l''utilisateur %: % - État SQL: %', user_id, SQLERRM, SQLSTATE;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction de test simplifiée
CREATE OR REPLACE FUNCTION test_simple_workspace_creation()
RETURNS TABLE(user_id UUID, workspace_id UUID, status TEXT, error_message TEXT) AS $$
DECLARE
    user_record RECORD;
    new_workspace_id UUID;
BEGIN
    -- Tester avec un seul utilisateur
    SELECT u.id, u.username INTO user_record
    FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM workspaces w 
        WHERE w.created_by = u.id AND w.is_default = true
    )
    LIMIT 1;
    
    IF user_record.id IS NOT NULL THEN
        BEGIN
            SELECT create_default_workspace_simple(user_record.id, user_record.username) INTO new_workspace_id;
            
            user_id := user_record.id;
            workspace_id := new_workspace_id;
            status := CASE 
                WHEN new_workspace_id IS NOT NULL THEN 'SUCCESS'
                ELSE 'FAILED'
            END;
            error_message := CASE 
                WHEN new_workspace_id IS NOT NULL THEN ''
                ELSE 'Fonction a retourné NULL'
            END;
            
        EXCEPTION
            WHEN OTHERS THEN
                user_id := user_record.id;
                workspace_id := NULL;
                status := 'FAILED';
                error_message := SQLERRM;
        END;
        
        RETURN NEXT;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
