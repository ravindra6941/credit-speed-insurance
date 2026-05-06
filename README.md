# Credit Speed Insurance — Admin Portal

Internal admin portal for the Credit Speed insurance vertical. Built for the
team to manage retailers, customers, and warranty plans, and to issue
warranty PDF documents that get attached to loan files.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** — PostgreSQL + Auth (free tier)
- **Tailwind CSS** + **framer-motion** — cinematic dark UI matching the Credit Speed brand
- **jsPDF** — client-side warranty PDF generation
- **Vercel** — hosting

## First-time setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Pick the **free tier**, region: **Mumbai (ap-south-1)**
3. Save the **DB password** somewhere safe

### 2. Run the schema

1. In Supabase: **SQL Editor → New query**
2. Paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql)
3. Run

This creates the `profiles`, `plans`, `retailers`, `customers` tables, sets
up Row Level Security, seeds the 4 default plans, and adds helper functions
for auto-generating customer / retailer codes.

### 3. Create the first admin user

1. Supabase: **Authentication → Users → Add user → Create new user**
2. Email: your team email, Password: choose a strong one
3. **Auto Confirm User: ON**
4. After creation, run this in the SQL Editor to make them admin:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'YOUR_EMAIL');
   ```

### 4. Wire up env vars

1. Copy `.env.local.example` to `.env.local`
2. From Supabase: **Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` → you'll be redirected to `/login`.

## Pages

| Route | Purpose |
|---|---|
| `/login` | Email + password (Supabase Auth) |
| `/dashboard` | Stat cards — customers + retailers across Today/Week/Month/All |
| `/customers` | CRUD + **P** button generates warranty PDF (jsPDF) |
| `/retailers` | CRUD for partner mobile shops |
| `/plans` | CRUD for warranty plan types (admin masters) |

## Deploy

Push to GitHub, import into Vercel, set the same two env vars in Vercel
project settings → done.
