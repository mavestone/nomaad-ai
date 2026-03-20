# NOMAAD — Waitlist Landing Page

The business tool built for people who hate business tools.

## Stack

- React + Vite
- Supabase (lead capture + storage)
- Deployed via Vercel

---

## 1. Supabase Setup

### Create the waitlist table

Go to your Supabase project → SQL Editor → run this:

```sql
create table waitlist (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  pain_point text,
  current_stack text,
  location text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Enable Row Level Security
alter table waitlist enable row level security;

-- Allow inserts from anyone (public waitlist)
create policy "Allow public inserts"
  on waitlist for insert
  with check (true);

-- Allow updates (for saving quiz answers)
create policy "Allow updates by email"
  on waitlist for update
  using (true);

-- Allow count reads (for the counter)
create policy "Allow count"
  on waitlist for select
  using (true);
```

### Get your credentials

Supabase dashboard → Settings → API:
- **Project URL** → copy to `VITE_SUPABASE_URL`
- **anon public key** → copy to `VITE_SUPABASE_ANON_KEY`

---

## 2. Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/nomaad-ai.git
cd nomaad-ai

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run dev server
npm run dev
```

---

## 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts, then add env vars in Vercel dashboard:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

Or connect your GitHub repo directly in vercel.com → New Project → Import from GitHub.

Then add the environment variables in:
Vercel → Project → Settings → Environment Variables

---

## 4. Connect nomaad.ai domain

Vercel → Project → Settings → Domains → Add `nomaad.ai`

Then in your domain registrar (Spaceship):
- Add CNAME record: `www` → `cname.vercel-dns.com`
- Add A record: `@` → `76.76.19.61`

---

## Data captured per lead

| Field | Description |
|-------|-------------|
| email | Their email address |
| pain_point | invoices / clients / comms / admin |
| current_stack | sheets / apps / one_tool / head |
| location | base / cities / moving / aspiring |
| created_at | Timestamp |

View all leads: Supabase → Table Editor → waitlist
