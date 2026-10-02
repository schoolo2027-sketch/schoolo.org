# 🚀 Cloudflare Pages + Supabase Deployment Guide

এই প্রজেক্টটি **Cloudflare Pages (Frontend / Edge)** এবং **Supabase (Database / Auth / Realtime)**-এ কোনো স্ট্রাকচার পরিবর্তন না করেই সরাসরি ডিপ্লয় করার জন্য প্রস্তুত করা হয়েছে।

---

### ধাপ ১: Supabase প্রজেক্ট সেটআপ (Database)

1. [supabase.com](https://supabase.com)-এ গিয়ে একটি ফ্রি অ্যাকাউন্ট তৈরি করে নতুন প্রজেক্ট খুলুন (Region: **Singapore (ap-southeast-1)** সিলেক্ট করা ভালো, বাংলাদেশের জন্য দ্রুত কাজ করবে)।
2. **SQL Editor**-এ যান এবং এই প্রজেক্টের `supabase/full_production_schema.sql` অথবা `supabase/schema.sql` ফাইলের কোডগুলো পেস্ট করে **Run** চাপুন। (এটি স্বয়ংক্রিয়ভাবে সব টেবিল, RLS রুলস এবং ট্রিগার তৈরি করে দেবে)।
3. Supabase-এর **Project Settings -> API** থেকে নিচের ২টি কী কপি করুন:
   - `Project URL` (e.g. `https://xyzcompany.supabase.co`)
   - `anon public key` (e.g. `eyJhbGci...`)

---

### ধাপ ২: Cloudflare Pages-এ ডিপ্লয়মেন্ট (Frontend)

#### পদ্ধতি ১: GitHub কানেক্ট করে (সবচেয়ে সহজ ও অটোমেটিক)
1. আপনার কোডটি GitHub-এ পুশ করুন।
2. [Cloudflare Dashboard](https://dash.cloudflare.com) -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git** নির্বাচন করুন।
3. আপনার গিটহাব রিপোজিটরি সিলেক্ট করুন।
4. **Build settings** কনফিগার করুন:
   - **Framework preset:** `Vite` (অথবা `None`)
   - **Build command:** `npm run build` (অথবা `bun run build`)
   - **Build output directory:** `dist`
   - **Node.js Version:** `20` (অথবা `18`)
   - **Package Manager:** `npm` বা `bun` (উভয়টির জন্যই `package-lock.json` এবং `bun.lock` সম্পূর্ণ সিঙ্ক করা রয়েছে; কোনো `--frozen-lockfile` এরর আসবে না)।
5. **Environment variables** সেকশনে এই ভেরিয়েবলগুলো যুক্ত করুন:
   - `VITE_SUPABASE_URL`: আপনার Supabase প্রজেক্টের URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: আপনার Supabase anon key
   - `VITE_SUPABASE_ANON_KEY`: আপনার Supabase anon key
6. **Save and Deploy** চাপুন!

#### পদ্ধতি ২: Cloudflare Wrangler CLI দিয়ে (Direct Upload)
```bash
# ১. প্রোডাকশন বিল্ড তৈরি করুন
npm run build

# ২. সরাসরি Cloudflare Pages-এ ডিপ্লয় করুন
npx wrangler pages deploy dist --project-name=schoolo-org
# অথবা:
npm run deploy
```

---

### ✅ যা যা স্বয়ংক্রিয়ভাবে কনফিগার করা আছে:
- **`public/_redirects`**: Cloudflare Pages-এ React Router SPA রিফ্রেশ করলে যেন কোনো 404 পেজ না আসে।
- **`public/_headers`**: সিকিউর হেডার এবং স্ট্যাটিক অ্যাসেটস ক্যাশিং।
- **`wrangler.toml`**: Cloudflare CLI এর জন্য রেডিমেড কনফিগারেশন।
- **`src/integrations/supabase/client.ts`**: সরাসরি ক্লাউডফ্লেয়ার পরিবেশের সাথে অপ্টিমাইজড।
