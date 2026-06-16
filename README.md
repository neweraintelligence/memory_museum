# Memory Museum

An interactive, isometric memory-museum builder. Create rooms, drag memory
objects onto an editable diorama, attach memories to them, walk through the
museum spatially, and review with the method of loci.

Built with **React + Vite + TypeScript**, **React Konva** (isometric canvas),
**Zustand** (state), **Dexie** (offline-first IndexedDB), and **Supabase**
(optional cloud sync + auth).

## Quick start

```bash
npm install
npm run dev
```

The app runs fully offline against IndexedDB out of the box. To enable cloud
sync, copy `.env.example` to `.env.local` and fill in your Supabase project URL
and anon key, then apply the schema in `supabase/migrations/0001_init.sql`.

```bash
cp .env.example .env.local
```

## Core loop

1. Create a museum (or start from a template) on the dashboard.
2. In **Build** mode, pick an object from the library and click a floor tile to
   place it. Drag objects to rearrange. Click an object to attach a memory
   (title, prompt, answer, notes, tags, image, links).
3. Customize each room's style, type, and size from the right panel.
4. Connect rooms and reposition them on the **Overview Map**.
5. In **Walk** mode, step room-by-room and object-by-object (`←`/`→`).
6. In **Review** mode, recall each anchor, reveal the answer (`Space`), and
   grade yourself; a lightweight SRS schedules the next review.

Press `/` anywhere to search across all museums, rooms, objects, and memories.

## Architecture

- `src/lib/` — isometric math, Dexie database, Supabase client, sync engine, SRS.
- `src/state/` — Zustand stores (`useStore` for data, `useUI` for view state).
- `src/themes/` — room style presets, object catalog, museum templates.
- `src/render/` — Konva isometric room canvas and object renderer.
- `src/components/` — dashboard, workspace, map, panels, editors, modes, search.
- `supabase/migrations/` — Postgres schema with row-level security.

Data is written through to Dexie immediately and debounce-upserted to Supabase
when cloud is enabled (last-write-wins via `updatedAt`). On load the app pulls
from Supabase and merges into Dexie.
