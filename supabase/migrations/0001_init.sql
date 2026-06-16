-- Memory Museum schema + RLS.
-- Timestamps are stored as epoch milliseconds (int8) to match the client.
-- Every row is owned (directly or transitively) by a user; RLS scopes access
-- to auth.uid(). The client signs in anonymously so each device/user only ever
-- sees their own data.

create extension if not exists pgcrypto;

-- museums -------------------------------------------------------------------
create table if not exists public.museums (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null default 'Untitled Museum',
  theme       text not null default 'scholar',
  created_at  bigint not null,
  updated_at  bigint not null,
  deleted     int not null default 0
);

-- rooms ---------------------------------------------------------------------
create table if not exists public.rooms (
  id          text primary key,
  museum_id   text not null references public.museums (id) on delete cascade,
  name        text not null default 'Room',
  type        text not null default 'custom',
  style       text not null default 'cozy-apartment',
  grid_w      int not null default 6,
  grid_h      int not null default 6,
  map_x       double precision not null default 0,
  map_y       double precision not null default 0,
  order_index int not null default 0,
  updated_at  bigint not null,
  deleted     int not null default 0
);

-- connections ---------------------------------------------------------------
create table if not exists public.connections (
  id           text primary key,
  museum_id    text not null references public.museums (id) on delete cascade,
  from_room_id text not null,
  to_room_id   text not null,
  updated_at   bigint not null,
  deleted      int not null default 0
);

-- objects -------------------------------------------------------------------
create table if not exists public.objects (
  id          text primary key,
  room_id     text not null references public.rooms (id) on delete cascade,
  kind        text not null,
  label       text not null default '',
  grid_x      int not null default 0,
  grid_y      int not null default 0,
  rotation    int not null default 0,
  color       text not null default '#cccccc',
  icon        text not null default '',
  order_index int not null default 0,
  updated_at  bigint not null,
  deleted     int not null default 0
);

-- memories ------------------------------------------------------------------
create table if not exists public.memories (
  id            text primary key,
  object_id     text not null references public.objects (id) on delete cascade,
  title         text not null default '',
  body          text not null default '',
  prompt        text not null default '',
  answer        text not null default '',
  tags          text[] not null default '{}',
  category      text not null default '',
  image_url     text not null default '',
  links         text[] not null default '{}',
  review_status text not null default 'new',
  difficulty    double precision not null default 0,
  ease          double precision not null default 2.5,
  last_reviewed bigint,
  next_review   bigint,
  updated_at    bigint not null,
  deleted       int not null default 0
);

create index if not exists rooms_museum_idx on public.rooms (museum_id);
create index if not exists connections_museum_idx on public.connections (museum_id);
create index if not exists objects_room_idx on public.objects (room_id);
create index if not exists memories_object_idx on public.memories (object_id);

-- Row Level Security --------------------------------------------------------
alter table public.museums enable row level security;
alter table public.rooms enable row level security;
alter table public.connections enable row level security;
alter table public.objects enable row level security;
alter table public.memories enable row level security;

-- museums: owned directly by the user.
drop policy if exists museums_owner on public.museums;
create policy museums_owner on public.museums
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- rooms: owned through their museum.
drop policy if exists rooms_owner on public.rooms;
create policy rooms_owner on public.rooms
  for all using (
    exists (select 1 from public.museums p where p.id = museum_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.museums p where p.id = museum_id and p.user_id = auth.uid())
  );

drop policy if exists connections_owner on public.connections;
create policy connections_owner on public.connections
  for all using (
    exists (select 1 from public.museums p where p.id = museum_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.museums p where p.id = museum_id and p.user_id = auth.uid())
  );

drop policy if exists objects_owner on public.objects;
create policy objects_owner on public.objects
  for all using (
    exists (
      select 1 from public.rooms r
      join public.museums p on p.id = r.museum_id
      where r.id = room_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.rooms r
      join public.museums p on p.id = r.museum_id
      where r.id = room_id and p.user_id = auth.uid()
    )
  );

drop policy if exists memories_owner on public.memories;
create policy memories_owner on public.memories
  for all using (
    exists (
      select 1 from public.objects o
      join public.rooms r on r.id = o.room_id
      join public.museums p on p.id = r.museum_id
      where o.id = object_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.objects o
      join public.rooms r on r.id = o.room_id
      join public.museums p on p.id = r.museum_id
      where o.id = object_id and p.user_id = auth.uid()
    )
  );
