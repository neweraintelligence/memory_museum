-- Custom floor plans: store the explicit set of floor tiles per room.
-- Each entry is a "gx,gy" key. An empty array means "derive a full
-- gridW x gridH rectangle" (handled client-side for backward compatibility).

alter table public.rooms
  add column if not exists tiles text[] not null default '{}';
