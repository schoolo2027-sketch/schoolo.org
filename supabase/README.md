# Supabase Database & Migration Guide for Production

This directory contains the database structure, migrations, and production-ready schema for **Schoolo / Shikkha School Management System**.

---

## ⚡ 1-Click Production Setup (Recommended)

To deploy the entire database schema from scratch on any new Supabase project:

1. Open your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Select your Project -> Click **SQL Editor** (left menu).
3. Open or copy the entire contents of [`/supabase/full_production_schema.sql`](./full_production_schema.sql).
4. Paste it into the SQL Editor and click **Run**.

✅ **What this does:**
- Creates all 35+ tables (Schools, Profiles, Classes, Subjects, Subject Setups, Students, Teachers, Staff, Attendance, Exams, Marks, Accounts, Fees, Payments, Notices, SMS, Homework, etc.).
- Sets up NCTB / Bangladesh Board grading system, CQ/MCQ/Practical division, 1st & 2nd combined papers, and 4th/Optional subject bonus logic.
- Creates all custom ENUM types, helper security functions, and automated updated_at triggers.
- Configures Row Level Security (RLS) tenant isolation.
- Initializes Storage Buckets (`school-assets`, `student-photos`, `teacher-photos`, `staff-photos`, `documents`, `homework-attachments`).
- Enables Supabase Realtime for instant live syncing.

---

## 📦 Using Supabase CLI for Migrations

If you prefer versioned migration workflows with the Supabase CLI:

```bash
# 1. Link to your remote Supabase project
supabase link --project-ref your-project-id

# 2. Push all pending migrations in /supabase/migrations/
supabase db push

# 3. (Optional) Reset local development database
supabase db reset
```

---

## 📂 Migration Directory Structure

- `/supabase/full_production_schema.sql` : The complete, single-file production-ready database snapshot.
- `/supabase/migrations/` : Chronological, immutable migration history for incremental database updates.
- `/supabase/config.toml` : Supabase project configuration file.
