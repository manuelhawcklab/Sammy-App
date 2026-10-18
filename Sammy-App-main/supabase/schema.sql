-- ============================================================
-- Sammy-App · Esquema de base de datos para Supabase (Postgres)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Proyecto: https://pshppwsueqkwzcczfkvu.supabase.co
-- ============================================================

-- 1) TABLAS (mapean el modelo de src/lib/db.ts — DBShape v4)

create table if not exists public.groups (
  id    text primary key,
  name  text not null,
  emoji text not null default '🐝',
  ages  text not null default ''
);

create table if not exists public.users (
  id         text primary key,
  role       text not null check (role in ('parent','educator','admin')),
  name       text not null,
  email      text not null unique,
  pass       text not null,
  "group"    text references public.groups(id) on delete set null,
  color      text not null default '#12A59B',
  createdat  timestamptz not null default now()
);

create table if not exists public.children (
  id         text primary key,
  parentid   text references public.users(id) on delete set null,
  name       text not null,
  birth      date not null,
  "group"    text references public.groups(id) on delete set null,
  emoji      text not null default '🦖',
  color      text not null default '#FFC24B',
  allergies  text[] not null default '{}',
  notes      text not null default '',
  authorized text not null default '',
  createdat  timestamptz not null default now()
);

create table if not exists public.blocks (
  id    text primary key,
  "group" text not null references public.groups(id) on delete cascade,
  day   int  not null check (day between 1 and 5),
  start time not null,
  "end" time not null,
  title text not null,
  kind  text not null check (kind in
        ('bienvenida','clase','taller','juego','comida','siesta','salida'))
);

create table if not exists public.materials (
  id         text primary key,
  authorid   text references public.users(id) on delete set null,
  title      text not null,
  descr      text not null default '',
  category   text not null check (category in
             ('Guías','Fichas','Canciones','Videos','Actividades')),
  scope      text not null default 'all',
  filename   text,
  size       bigint,
  dataurl    text,
  url        text,
  downloads  int not null default 0,
  createdat  timestamptz not null default now()
);

create table if not exists public.entries (
  id       text primary key,
  childid  text not null references public.children(id) on delete cascade,
  authorid text references public.users(id) on delete set null,
  area     text not null check (area in
           ('Lenguaje','Motricidad fina','Motricidad gruesa',
            'Socioemocional','Lógica','Arte')),
  stars    int not null check (stars between 1 and 5),
  note     text not null default '',
  date     timestamptz not null default now()
);

create index if not exists idx_blocks_group_day on public.blocks ("group", day);
create index if not exists idx_children_group   on public.children ("group");
create index if not exists idx_children_parent  on public.children (parentid);
create index if not exists idx_entries_child    on public.entries (childid);
create index if not exists idx_materials_scope  on public.materials (scope);

-- 2) SEGURIDAD: Row Level Security abierta con anon key.
--    La app usa una sesión propia (tabla users.pass); cuando se migre a
--    Supabase Auth, conviene restringir estas policies por rol.

alter table public.groups    enable row level security;
alter table public.users     enable row level security;
alter table public.children  enable row level security;
alter table public.blocks    enable row level security;
alter table public.materials enable row level security;
alter table public.entries   enable row level security;

drop policy if exists "sammy_all_groups"    on public.groups;
drop policy if exists "sammy_all_users"     on public.users;
drop policy if exists "sammy_all_children"  on public.children;
drop policy if exists "sammy_all_blocks"    on public.blocks;
drop policy if exists "sammy_all_materials" on public.materials;
drop policy if exists "sammy_all_entries"   on public.entries;

create policy "sammy_all_groups"    on public.groups
  for all to anon, authenticated using (true) with check (true);
create policy "sammy_all_users"     on public.users
  for all to anon, authenticated using (true) with check (true);
create policy "sammy_all_children"  on public.children
  for all to anon, authenticated using (true) with check (true);
create policy "sammy_all_blocks"    on public.blocks
  for all to anon, authenticated using (true) with check (true);
create policy "sammy_all_materials" on public.materials
  for all to anon, authenticated using (true) with check (true);
create policy "sammy_all_entries"   on public.entries
  for all to anon, authenticated using (true) with check (true);

-- 3) TIEMPO REAL: publicar las tablas para postgres_changes
--    (usado por src/lib/useSupabaseDB.ts). Si la publicación aún no
--    existe, créala primero en Dashboard → Database → Replication.

do $$ begin
  alter publication supabase_realtime add table public.groups;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.users;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.children;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.blocks;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.materials;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.entries;
exception when duplicate_object then null; end $$;

-- 4) DATOS SEMILLA mínimos (cuentas de demostración, pass: sammy123)
--    Opcional: puedes omitir esta sección y subir todos los datos desde
--    la app en Ajustes → "Sincronizar con Supabase ☁️".

insert into public.groups (id, name, emoji, ages) values
  ('abejitas',  'Sala Abejitas',  '🐝', '3–4 años'),
  ('colibries', 'Sala Colibríes', '🐦', '2–3 años'),
  ('buhos',     'Sala Búhos',     '🦉', '4–5 años')
on conflict (id) do nothing;

insert into public.users (id, role, name, email, pass, "group", color) values
  ('u-admin',   'admin',    'Dirección Sammy', 'admin@sammy.app',   'sammy123', null,        '#FF6F61'),
  ('u-val',     'parent',   'Valentina Rojas', 'familia@sammy.app', 'sammy123', null,        '#F2789F'),
  ('u-marcos',  'parent',   'Marcos Herrera',  'marcos@sammy.app',  'sammy123', null,        '#58B8E8'),
  ('u-caro',    'educator', 'Miss Carolina',   'miss@sammy.app',    'sammy123', 'abejitas',  '#12A59B'),
  ('u-andres',  'educator', 'Profe Andrés',    'andres@sammy.app',  'sammy123', 'colibries', '#FFC24B')
on conflict (id) do nothing;
