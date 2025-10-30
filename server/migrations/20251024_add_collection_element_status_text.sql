-- Migration: add collection_element_status_text and backfill from numeric column
-- Created: 2025-10-24 (Option 2)

BEGIN;

-- 1) Add new text column (nullable for now)
ALTER TABLE public.collection_element
  ADD COLUMN IF NOT EXISTS collection_element_status_text TEXT;

-- 2) Backfill values from existing numeric column
-- Map: 1 -> 'publish', 0 -> 'draft', other/NULL -> NULL
UPDATE public.collection_element
SET collection_element_status_text = CASE
  WHEN collection_element_status::int = 1 THEN 'publish'
  WHEN collection_element_status::int = 0 THEN 'draft'
  ELSE NULL
END
WHERE collection_element_status IS NOT NULL;

-- Note: Do not set NOT NULL or add CHECK constraints yet — wait until apps are updated.

COMMIT;

-- Rollback (manual):
-- ALTER TABLE public.collection_element DROP COLUMN IF EXISTS collection_element_status_text;

-- After verifying app changes, you may: (a) set NOT NULL and add CHECK constraint, (b) optionally drop the old numeric column.
-- Example finalization steps (run after full rollout):
-- ALTER TABLE public.collection_element ALTER COLUMN collection_element_status_text SET NOT NULL;
-- ALTER TABLE public.collection_element ADD CONSTRAINT collection_element_status_text_enum CHECK (collection_element_status_text IN ('publish','draft','wait'));
-- ALTER TABLE public.collection_element DROP COLUMN IF EXISTS collection_element_status;  -- optional
