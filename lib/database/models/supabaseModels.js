/**
 * Run in Supabase: SQL → New query (then restart app or wait for schema reload).
 *
 * create table public.users (
 *   id uuid primary key default gen_random_uuid(),
 *   email text not null unique,
 *   password_hash text not null,
 *   created_at timestamptz not null default now()
 * );
 *
 * create table public.todos (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid not null references public.users(id) on delete cascade,
 *   text text not null,
 *   completed boolean not null default false,
 *   created_at timestamptz not null default now()
 * );
 *
 * create index todos_user_id_idx on public.todos (user_id);
 */

const TABLES = {
  users: 'users',
  todos: 'todos',
};

function mapRowToTodo(row) {
  return {
    id: String(row.id),
    text: row.text,
    completed: Boolean(row.completed),
  };
}

function mapRowToUser(row) {
  return {
    id: String(row.id),
    email: row.email,
    passwordHash: row.password_hash,
  };
}

export { TABLES, mapRowToTodo, mapRowToUser };
