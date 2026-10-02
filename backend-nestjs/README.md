# 🏫 School Management & Result System (NestJS Backend)

একটি স্বয়ংসম্পূর্ণ এন্টারপ্রাইজ গ্রেড NestJS + Prisma REST API ব্যাকএন্ড যা সরাসরি **Supabase PostgreSQL** ডেটাবেজের সাথে সংযুক্ত হয়ে পরিচালিত হয়।

---

## 📦 প্রজেক্ট স্ট্রাকচার

```text
backend-nestjs/
├── prisma/
│   └── schema.prisma         # Supabase PostgreSQL ডেটাবেজ স্কিমা
├── src/
│   ├── auth/                 # JWT Authentication & Multi-Role Guards
│   ├── students/             # শিক্ষার্থী তথ্য, ভর্তি ও সেকশন ম্যাপিং
│   ├── marks/                # CQ/MCQ/Prac মার্কস এন্ট্রি, GPA ও ৪র্থ বিষয় ক্যালকুলেশন
│   ├── prisma/               # Prisma Database Service & Connection
│   ├── common/               # Custom Decorators (@Roles) & Guards
│   ├── app.module.ts         # রুট অ্যাপ্লিকেশন মডিউল
│   └── main.ts               # Swagger & Express Entry Point (Port 5000)
├── .env.example              # ডেটাবেজ ও সিক্রেট ভেরিয়েবল
└── package.json
```

---

## 🚀 লোকাল সেটআপ ও রান করার নিয়ম

### ১. ডিপেন্ডেন্সি ইনস্টল করুন
```bash
cd backend-nestjs
npm install
```

### ২. এনভায়রনমেন্ট ফাইল তৈরি করুন
`.env.example` থেকে কপি করে `.env` ফাইল বানান এবং আপনার Supabase Connection URI দিন:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:[YOUR-SUPABASE-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRATION="7d"
CORS_ORIGIN="http://localhost:3000,http://localhost:5173,https://your-domain.pages.dev"
```

### ৩. Supabase-এ স্কিমা পুশ ও Prisma Client তৈরি করুন
```bash
# স্কিমা ডেটাবেজে সিঙ্ক করুন
npx prisma db push

# ক্লায়েন্ট জেনারেট করুন
npx prisma generate
```

### ৪. ডেভেলপমেন্ট সার্ভার চালু করুন
```bash
npm run start:dev
```
- সার্ভার চালু হবে: `http://localhost:5000`
- লাইভ Swagger API ডকুমেন্টেশন: `http://localhost:5000/api/docs`

---

## 🌐 কোথায় হোস্ট করবেন?
1. **Railway.app / Render.com / Koyeb:**
   - গিটহাবে পুশ করে সরাসরি এই `backend-nestjs` ফোল্ডারটিকে রুট ডিরেক্টরি দিয়ে হোস্ট করতে পারেন।
   - Environment Variables-এ শুধু Supabase `DATABASE_URL` ও `JWT_SECRET` দিলেই ব্যাকএন্ড লাইভ হয়ে যাবে।
