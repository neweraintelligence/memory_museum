-- Explicit wall segments per room (e.g. "2,3,left").
-- Empty array = auto-derive from floor-edge detection (client-side).
alter table public.rooms
  add column if not exists walls text[] not null default '{}';
