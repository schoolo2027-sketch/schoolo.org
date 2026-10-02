
-- Safely seed default classes only if school exists, or fallback safely
DO $$
DECLARE
  v_school_id UUID;
BEGIN
  -- Find the specified school, or the first active school, or create placeholder if none exists
  SELECT id INTO v_school_id FROM public.schools WHERE id = '40e5c1dd-4d30-4a9f-8514-63107bb47cae';
  
  IF v_school_id IS NULL THEN
    SELECT id INTO v_school_id FROM public.schools ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_school_id IS NULL THEN
    INSERT INTO public.schools (id, school_name, established_year, school_address, is_active)
    VALUES ('40e5c1dd-4d30-4a9f-8514-63107bb47cae', 'Main Campus', 2026, 'Dhaka, Bangladesh', true)
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_school_id;
    
    IF v_school_id IS NULL THEN
      v_school_id := '40e5c1dd-4d30-4a9f-8514-63107bb47cae';
    END IF;
  END IF;

  -- Create classes for the school if not already existing
  IF v_school_id IS NOT NULL THEN
    INSERT INTO public.classes (school_id, class_name, shift, version, academic_year, numeric_level) VALUES
    (v_school_id, 'Play', 'morning', 'bangla', 2026, 0),
    (v_school_id, 'Nursery', 'morning', 'bangla', 2026, 1),
    (v_school_id, 'KG', 'morning', 'bangla', 2026, 2),
    (v_school_id, 'Class 1', 'morning', 'bangla', 2026, 3),
    (v_school_id, 'Class 2', 'morning', 'bangla', 2026, 4),
    (v_school_id, 'Class 3', 'morning', 'bangla', 2026, 5),
    (v_school_id, 'Class 4', 'morning', 'bangla', 2026, 6),
    (v_school_id, 'Class 5', 'morning', 'bangla', 2026, 7),
    (v_school_id, 'Class 6', 'morning', 'bangla', 2026, 8),
    (v_school_id, 'Class 7', 'morning', 'bangla', 2026, 9),
    (v_school_id, 'Class 8', 'morning', 'bangla', 2026, 10),
    (v_school_id, 'Class 9', 'morning', 'bangla', 2026, 11),
    (v_school_id, 'Class 10', 'morning', 'bangla', 2026, 12)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
