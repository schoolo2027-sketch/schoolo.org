
-- Safely create sections for existing classes of the school
DO $$
DECLARE
  v_school_id UUID;
  r_class RECORD;
BEGIN
  -- Find school
  SELECT id INTO v_school_id FROM public.schools WHERE id = '40e5c1dd-4d30-4a9f-8514-63107bb47cae';
  IF v_school_id IS NULL THEN
    SELECT id INTO v_school_id FROM public.schools ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_school_id IS NOT NULL THEN
    -- Loop through junior classes and add default Section A
    FOR r_class IN SELECT id, class_name FROM public.classes WHERE school_id = v_school_id
    LOOP
      IF r_class.class_name IN ('Class 9', 'Class 10') THEN
        INSERT INTO public.sections (school_id, class_id, section_name)
        VALUES 
          (v_school_id, r_class.id, 'Science'),
          (v_school_id, r_class.id, 'Business Studies')
        ON CONFLICT DO NOTHING;
      ELSE
        INSERT INTO public.sections (school_id, class_id, section_name)
        VALUES 
          (v_school_id, r_class.id, 'A')
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END $$;
