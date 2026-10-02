
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS attendance_scope_students boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attendance_scope_teachers boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attendance_scope_staff boolean NOT NULL DEFAULT false;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS attendance_scope_students boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attendance_scope_teachers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attendance_scope_staff boolean NOT NULL DEFAULT true;
