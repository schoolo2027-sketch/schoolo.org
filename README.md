<<<<<<< HEAD
# Schoolo.org - School Management Platform

A modern, comprehensive multi-tenant school management web application built with React, TypeScript, Tailwind CSS, Vite, and Supabase.

---

## 🚀 Features

- **Multi-tenant Architecture**: Supports Master Admin, School Admin, Sub Admin, Teacher, Student, and Accounts roles.
- **Academic Management**: Class & Section management, Academic Year transitions, Student Promotions, and Subject assignments.
- **Attendance Engine**: Daily student & staff attendance with summary dashboards and instant status logs.
- **Grading & Results**: Grade calculation, marksheet generation, grade sheets, and printable transcripts.
- **Fee Management & Accounts**: Tuition fees, invoice generation, payment receipts, expense logging, and financial statements.
- **Notices & Communication**: School announcements, notice board with filterable targets.

---

## 🛠️ Connecting Your Custom Supabase Project

This application is completely independent and can connect to any standalone Supabase instance.

### 1. Create a Supabase Project
1. Go to [Supabase](https://supabase.com) and create a new project.
2. Under **Project Settings -> API**, retrieve:
   - **Project URL** (`https://xyzcompany.supabase.co`)
   - **Project Anon / Public Key** (`eyJhbGci...`)

### 2. Apply Database Migrations
All SQL schema definitions and migrations are available in the `/supabase/migrations/` directory. You can run them in the Supabase SQL Editor in chronological order or use the Supabase CLI:
```bash
supabase db push
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Build for production
npm run build
```
=======
# schoolo.org
>>>>>>> 5cb9f9327d9ea0b1aff5ed5e656a8122a951b962
