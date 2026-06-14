-- Wall-mounted objects (mirror, window, door, painting) attach to an exposed wall face.
alter table public.objects
  add column if not exists wall_side text check (wall_side is null or wall_side in ('left', 'right'));
