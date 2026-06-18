-- Rename architectural styles (slug changes) to match the new display names.
-- Only the room "style" column stores these slugs; museum "theme" is a separate
-- namespace (UI/museum themes) and is intentionally left untouched.
update public.rooms set style = 'timeless-library' where style = 'gothic-library';
update public.rooms set style = 'brutalist-atrium' where style in ('utilitarian', 'brutalist');
update public.rooms set style = 'futuristic-lab'   where style = 'spaceship';
update public.rooms set style = 'beach-house'      where style = 'cozy-apartment';
update public.rooms set style = 'palace-ballroom'  where style = 'victorian-parlor';
update public.rooms set style = 'gothic-belfry'    where style = 'stone-keep';
update public.rooms set style = 'private-study'    where style = 'reading-study';

-- Refresh the default style for newly created rooms.
alter table public.rooms alter column style set default 'beach-house';
