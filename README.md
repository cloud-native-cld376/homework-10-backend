# Todo app (Express + Handlebars)

Server-rendered todo list with **register / login**, **per-user todos**, and either **MongoDB Atlas** or **Supabase (PostgreSQL)**. The active database is chosen at startup via `DB_TYPE` using a factory pattern (`lib/database/createDatabaseProvider.js`).

## Prerequisites

- **Node.js 18+**
- Either a **MongoDB** connection string (e.g. Atlas) **or** a **Supabase** project with `users` and `todos` tables (see below)

## Quick start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Set `DB_TYPE` to `mongodb` or `supabase`, set `SESSION_SECRET` to a long random string, then fill in the variables for your database.

3. **Run the server**

   ```bash
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000) — you will be redirected to **Log in**. Register a new account, then manage todos (only your own are shown).

### Development (auto-restart on file changes)

```bash
npm run dev
```

---

## Environment variables

| Variable         | Description |
|------------------|-------------|
| `PORT`           | HTTP port (default `3000` if omitted) |
| `SESSION_SECRET` | Secret used to sign the session cookie (required in production; dev has a weak default) |
| `DB_TYPE`        | `mongodb` or `mongo` for MongoDB; `supabase` for Supabase |
| `MONGO_URI`      | Required when `DB_TYPE` is MongoDB |
| `SUPABASE_URL`   | Required when `DB_TYPE` is Supabase |
| `SUPABASE_KEY`   | Supabase key that can read/write `public.users` and `public.todos` (often the **anon** key with RLS policies) |

**Do not commit `.env`.** It is listed in `.gitignore`.

---

## Authentication

- Passwords are hashed with **bcrypt**; only hashes are stored.
- Sessions use **express-session** (in-memory store). Logged-in users get `userId` in the session; all todo queries filter by that id.
- **Log out** clears the session.

---

## MongoDB (Atlas)

1. Create a cluster in [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user and allow your IP (or `0.0.0.0/0` for development only).
3. Set `MONGO_URI` and `DB_TYPE=mongodb` in `.env`.

Mongoose creates **`users`** and **`todos`** collections automatically. Each todo document has a `user` reference to the owning user.

---

## Supabase

The app stores **app users** in `public.users` (email + password hash) and links todos with **`user_id`**.

### New project (recommended)

Run in **SQL** → **New query**:

```sql
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index todos_user_id_idx on public.todos (user_id);
```

### Already have a `todos` table without `user_id`

Add users (if missing), then link todos. You may need to **delete old rows** that have no owner:

```sql
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.todos add column if not exists user_id uuid references public.users(id) on delete cascade;
-- delete from public.todos where user_id is null;
-- alter table public.todos alter column user_id set not null;
```

### Row Level Security

If the **anon** key cannot access the tables, enable RLS and add policies (dev-friendly; tighten for production):

```sql
alter table public.users enable row level security;
alter table public.todos enable row level security;

create policy "users_all_anon" on public.users for all using (true) with check (true);
create policy "todos_all_anon" on public.todos for all using (true) with check (true);
```

Because this app talks to Supabase **only from your Node server**, row security is optional if the anon key is never exposed to browsers. If you expose the key client-side, use stricter policies or Supabase Auth instead of this custom user table.

### API keys

Under **Project Settings → API**, set `SUPABASE_URL` and `SUPABASE_KEY` in `.env`, then `DB_TYPE=supabase`.

---

## Switching databases

Change `DB_TYPE` and credentials in `.env`, then restart. User accounts and todos live **in that database only**; they are not migrated automatically.

---

## Project structure

```
lib/
├── database/
│   ├── DatabaseProvider.js
│   ├── MongoDBProvider.js
│   ├── SupabaseProvider.js
│   ├── models/
│   │   ├── mongoModels.js
│   │   └── supabaseModels.js
│   └── createDatabaseProvider.js
└── middleware/
    └── auth.js
```

`app.js` registers routes and sessions. Views live under `views/`; static files under `public/`.

---

## Troubleshooting

- **Port in use:** Change `PORT` in `.env`.
- **Supabase “table not in schema cache”:** Run the SQL above, wait a few seconds, restart the app.
- **MongoDB connection refused:** Check `MONGO_URI` and Atlas network access.
- **`bcrypt` install errors:** Ensure build tools are installed, or switch the dependency to `bcryptjs` and adjust the import in `app.js`.
