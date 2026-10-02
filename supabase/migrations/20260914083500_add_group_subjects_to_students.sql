-- Add group_subjects column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS group_subjects text;
