create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role);
$$;

create or replace function private.has_role_in_school(_user_id uuid, _role public.app_role, _school_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role and school_id=_school_id);
$$;

create or replace function private.get_user_school_id(_user_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where user_id=_user_id limit 1;
$$;

create or replace function private.get_student_id_for_user(_user_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.students where user_id=_user_id and is_active=true limit 1;
$$;

revoke execute on function private.has_role(uuid, public.app_role) from public;
revoke execute on function private.has_role_in_school(uuid, public.app_role, uuid) from public;
revoke execute on function private.get_user_school_id(uuid) from public;
revoke execute on function private.get_student_id_for_user(uuid) from public;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function private.has_role_in_school(uuid, public.app_role, uuid) to authenticated, service_role;
grant execute on function private.get_user_school_id(uuid) to authenticated, service_role;
grant execute on function private.get_student_id_for_user(uuid) to authenticated, service_role;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security invoker set search_path = public as $$
  select private.has_role(_user_id, _role);
$$;

create or replace function public.has_role_in_school(_user_id uuid, _role public.app_role, _school_id uuid)
returns boolean language sql stable security invoker set search_path = public as $$
  select private.has_role_in_school(_user_id, _role, _school_id);
$$;

create or replace function public.get_user_school_id(_user_id uuid)
returns uuid language sql stable security invoker set search_path = public as $$
  select private.get_user_school_id(_user_id);
$$;

create or replace function public.get_student_id_for_user(_user_id uuid)
returns uuid language sql stable security invoker set search_path = public as $$
  select private.get_student_id_for_user(_user_id);
$$;

create or replace function private.get_school_info_safe(_school_id uuid, _caller uuid)
returns table(
  id uuid, school_name text, school_logo text, school_address text,
  school_phone text, school_email text, eiin text, website text,
  principal_name text, established_year integer, default_version text,
  student_login_enabled boolean, teacher_login_enabled boolean,
  is_active boolean, principal_signature text, registrar_signature text,
  school_code text, bkash_merchant text, nagad_merchant text,
  sslcommerz_store_id text, mobile_banking_number text, bank_details text,
  plan_name text, max_students integer, max_teachers integer
)
language sql stable security definer set search_path = public as $$
  select s.id, s.school_name, s.school_logo, s.school_address,
         s.school_phone, s.school_email, s.eiin, s.website,
         s.principal_name, s.established_year, s.default_version,
         s.student_login_enabled, s.teacher_login_enabled, s.is_active,
         s.principal_signature, s.registrar_signature, s.school_code,
         case when private.has_role(_caller,'school_admin'::app_role) or private.has_role(_caller,'sub_admin'::app_role) or private.has_role(_caller,'master_admin'::app_role) then s.bkash_merchant end,
         case when private.has_role(_caller,'school_admin'::app_role) or private.has_role(_caller,'sub_admin'::app_role) or private.has_role(_caller,'master_admin'::app_role) then s.nagad_merchant end,
         case when private.has_role(_caller,'school_admin'::app_role) or private.has_role(_caller,'sub_admin'::app_role) or private.has_role(_caller,'master_admin'::app_role) then s.sslcommerz_store_id end,
         case when private.has_role(_caller,'school_admin'::app_role) or private.has_role(_caller,'sub_admin'::app_role) or private.has_role(_caller,'master_admin'::app_role) then s.mobile_banking_number end,
         case when private.has_role(_caller,'school_admin'::app_role) or private.has_role(_caller,'sub_admin'::app_role) or private.has_role(_caller,'master_admin'::app_role) then s.bank_details end,
         s.plan_name, s.max_students, s.max_teachers
  from public.schools s
  where s.id = _school_id
    and (s.id = private.get_user_school_id(_caller) or private.has_role(_caller,'master_admin'::app_role));
$$;
revoke execute on function private.get_school_info_safe(uuid, uuid) from public;
grant execute on function private.get_school_info_safe(uuid, uuid) to authenticated, service_role;

create or replace function public.get_school_info_safe(_school_id uuid)
returns table(
  id uuid, school_name text, school_logo text, school_address text,
  school_phone text, school_email text, eiin text, website text,
  principal_name text, established_year integer, default_version text,
  student_login_enabled boolean, teacher_login_enabled boolean,
  is_active boolean, principal_signature text, registrar_signature text,
  school_code text, bkash_merchant text, nagad_merchant text,
  sslcommerz_store_id text, mobile_banking_number text, bank_details text,
  plan_name text, max_students integer, max_teachers integer
)
language sql stable security invoker set search_path = public as $$
  select * from private.get_school_info_safe(_school_id, auth.uid());
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "Students can submit homework" on public.homework_submissions;
create policy "Students can submit homework"
on public.homework_submissions for insert to authenticated
with check (
  school_id = public.get_user_school_id(auth.uid())
  and (
    public.has_role(auth.uid(),'school_admin'::app_role)
    or public.has_role(auth.uid(),'sub_admin'::app_role)
    or public.has_role(auth.uid(),'teacher'::app_role)
    or public.has_role(auth.uid(),'master_admin'::app_role)
    or (public.has_role(auth.uid(),'student'::app_role) and student_id = public.get_student_id_for_user(auth.uid()))
  )
);

drop policy if exists "Students can create payments" on public.payments;
create policy "Students can create payments"
on public.payments for insert to authenticated
with check (
  school_id = public.get_user_school_id(auth.uid())
  and (
    public.has_role(auth.uid(),'school_admin'::app_role)
    or public.has_role(auth.uid(),'sub_admin'::app_role)
    or public.has_role(auth.uid(),'master_admin'::app_role)
    or (public.has_role(auth.uid(),'student'::app_role) and student_id = public.get_student_id_for_user(auth.uid()))
  )
);

drop policy if exists "Anyone authenticated can read platform settings" on public.platform_settings;
create policy "Master admins can read platform settings"
on public.platform_settings for select to authenticated
using (public.has_role(auth.uid(),'master_admin'::app_role));

drop policy if exists "School admins manage school roles" on public.user_roles;
create policy "School admins assign teacher or student roles"
on public.user_roles for all to authenticated
using (
  school_id = public.get_user_school_id(auth.uid())
  and public.has_role(auth.uid(),'school_admin'::app_role)
  and role in ('teacher'::app_role,'student'::app_role)
)
with check (
  school_id = public.get_user_school_id(auth.uid())
  and public.has_role(auth.uid(),'school_admin'::app_role)
  and role in ('teacher'::app_role,'student'::app_role)
);

revoke select (bkash_merchant, nagad_merchant, sslcommerz_store_id, mobile_banking_number, bank_details)
  on public.schools from anon, authenticated;

revoke select (phone, email, address, blood_group)
  on public.staff from anon, authenticated;

do $$
declare col text;
declare cols text[] := array['phone','email','address','blood_group',
  'can_manage_payments','can_use_ai_tools','can_manage_homework',
  'can_manage_attendance','can_manage_marks','can_manage_students',
  'can_manage_classes','can_manage_subjects'];
begin
  foreach col in array cols loop
    if exists(select 1 from information_schema.columns
              where table_schema='public' and table_name='teachers' and column_name=col) then
      execute format('revoke select (%I) on public.teachers from anon, authenticated', col);
    end if;
  end loop;
end$$;

drop policy if exists "Public can view payment receipts" on storage.objects;
create policy "Admins and owners can view payment receipts"
on storage.objects for select to authenticated
using (
  bucket_id='payment-receipts'
  and (
    public.has_role(auth.uid(),'school_admin'::app_role)
    or public.has_role(auth.uid(),'sub_admin'::app_role)
    or public.has_role(auth.uid(),'master_admin'::app_role)
    or auth.uid()::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "Authenticated users can upload payment receipts" on storage.objects;
create policy "Users upload payment receipts to own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id='payment-receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Public can view school logos" on storage.objects;
drop policy if exists "Public can view signatures" on storage.objects;
drop policy if exists "Public can view student photos" on storage.objects;
drop policy if exists "Public can view teacher photos" on storage.objects;
drop policy if exists "Anyone can view staff photos" on storage.objects;
drop policy if exists "Anyone can view homework files" on storage.objects;
drop policy if exists "Authenticated can view homework files" on storage.objects;

drop policy if exists "Authenticated can upload student photos" on storage.objects;
create policy "Admins or teachers can upload student photos"
on storage.objects for insert to authenticated
with check (
  bucket_id='student-photos'
  and (
    public.has_role(auth.uid(),'school_admin'::app_role)
    or public.has_role(auth.uid(),'sub_admin'::app_role)
    or public.has_role(auth.uid(),'teacher'::app_role)
    or public.has_role(auth.uid(),'master_admin'::app_role)
  )
);

drop policy if exists "Authenticated can upload teacher photos" on storage.objects;
create policy "Admins can upload teacher photos"
on storage.objects for insert to authenticated
with check (
  bucket_id='teacher-photos'
  and (
    public.has_role(auth.uid(),'school_admin'::app_role)
    or public.has_role(auth.uid(),'sub_admin'::app_role)
    or public.has_role(auth.uid(),'master_admin'::app_role)
  )
);

drop policy if exists "Authenticated can upload signatures" on storage.objects;
create policy "Admins can upload signatures"
on storage.objects for insert to authenticated
with check (
  bucket_id='signatures'
  and (
    public.has_role(auth.uid(),'school_admin'::app_role)
    or public.has_role(auth.uid(),'sub_admin'::app_role)
    or public.has_role(auth.uid(),'master_admin'::app_role)
  )
);