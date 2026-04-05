# Todo app (Express + Handlebars)

Server-rendered todo list with **MongoDB Atlas** or **Supabase (PostgreSQL)**. The active database is chosen at startup via `DB_TYPE` using a factory pattern (`lib/database/createDatabaseProvider.js`).

## Prerequisites

- **Node.js 18+**
- Either a **MongoDB** connection string (e.g. Atlas) **or** a **Supabase** project with the `todos` table created (see below)

## Quick start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy the example env file and edit it:

   ```bash
   cp .env.example .env
   ```

   Set `DB_TYPE` to `mongodb` or `supabase`, then fill in only the variables for the database you use.

3. **Run the server**

   ```bash
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000) (or whatever you set for `PORT`).

### Development (auto-restart on file changes)

```bash
npm run dev
```

---

## Environment variables

| Variable       | Description |
|----------------|-------------|
| `PORT`         | HTTP port (default `3000` if omitted) |
| `DB_TYPE`      | `mongodb` or `mongo` for MongoDB; `supabase` for Supabase |
| `MONGO_URI`    | Required when `DB_TYPE` is MongoDB |
| `SUPABASE_URL` | Required when `DB_TYPE` is Supabase |
| `SUPABASE_KEY` | Supabase **anon** key (or another key that can access `public.todos`) |

**Do not commit `.env`.** It is listed in `.gitignore`.

### Example `.env` (MongoDB)

```env
PORT=3000
DB_TYPE=mongodb
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
```

### Example `.env` (Supabase)

```env
PORT=3000
DB_TYPE=supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=your_anon_key
```

---

## MongoDB (Atlas)

1. Create a cluster in [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user and allow your IP (or `0.0.0.0/0` for development only).
3. Get the **connection string** and set `MONGO_URI` in `.env`.
4. Set `DB_TYPE=mongodb` and run `npm start`.

The app uses Mongoose; collections are created automatically when you add todos.

---

## Supabase

### 1. Create the `todos` table

In the Supabase dashboard: **SQL** → **New query**, run:

```sql
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
```

### 2. Row Level Security (if the anon key cannot read/write)

If you get permission errors with the **anon** key, enable RLS and add policies (suitable for a simple class project):

```sql
alter table public.todos enable row level security;

create policy "todos_select_anon"
  on public.todos for select
  using (true);

create policy "todos_insert_anon"
  on public.todos for insert
  with check (true);

create policy "todos_update_anon"
  on public.todos for update
  using (true)
  with check (true);

create policy "todos_delete_anon"
  on public.todos for delete
  using (true);
```

### 3. Keys and URL

Under **Project Settings → API**, copy **Project URL** → `SUPABASE_URL`, and **anon public** key → `SUPABASE_KEY`.

Set `DB_TYPE=supabase` and run `npm start`.

---

## Switching databases

Change `DB_TYPE` and the corresponding credentials in `.env`, then restart the server. No code changes are required.

---

## Project structure (database layer)

```
lib/database/
├── DatabaseProvider.js        # Base class for CRUD contract
├── MongoDBProvider.js         # Mongoose implementation
├── SupabaseProvider.js        # Supabase client implementation
├── models/
│   ├── mongoModels.js
│   └── supabaseModels.js
└── createDatabaseProvider.js  # Factory (reads DB_TYPE)
```

The Express app lives in `app.js`. Handlebars views are under `views/`; static assets under `public/`.

---

## Troubleshooting

- **Port in use:** Set a different `PORT` in `.env`.
- **Supabase “table not in schema cache”:** Run the `create table` SQL above, then wait a few seconds or restart the app.
- **MongoDB connection refused:** Check `MONGO_URI`, network access in Atlas, and that MongoDB is reachable from your machine.
