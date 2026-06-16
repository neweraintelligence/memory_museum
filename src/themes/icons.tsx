// Unified, realistic icon set for the whole app.
//
// We use react-icons: the "Game Icons" (gi) set for the thematic, detailed
// object/room art (far more realistic + consistent than platform emoji) and a
// few Lucide (lu) line icons for UI chrome (search, cloud, nav).
//
// The same set is reused inside the Konva canvas via `useIconImage`, which
// rasterises an icon to an <img> (data-URL SVG) that Konva can draw, so the
// in-scene badges match the side panels exactly.

import { createElement, useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { IconType } from 'react-icons';
import {
  GiDesk,
  GiOfficeChair,
  GiLockedChest,
  GiBed,
  GiDeskLamp,
  GiMirrorMirror,
  GiChest,
  GiBookCover,
  GiBookPile,
  GiScrollUnfurled,
  GiPapers,
  GiTreasureMap,
  GiPocketWatch,
  GiStoneBust,
  GiTrophy,
  GiKey,
  GiCrown,
  GiDramaMasks,
  GiCutDiamond,
  GiRoundBottomFlask,
  GiMicroscope,
  GiAnatomy,
  GiGears,
  GiDna1,
  GiCorkedTube,
  GiFlowerPot,
  GiTreeGrowth,
  GiFlowers,
  GiCrystalGrowth,
  GiDoorway,
  GiWindow,
  GiAncientColumns,
  GiFountain,
  GiPaintBrush,
  GiCandleFlame,
  GiBroadsword,
  GiSkullCrossedBones,
  GiHourglass,
  GiStarSwirl,
  GiCardboardBoxClosed,
  GiBookshelf,
  GiStethoscope,
  GiGreekTemple,
  GiByzantinTemple,
  GiPlantRoots,
  GiWatchtower,
  GiCellarBarrels,
  GiCastle,
  GiSecretDoor,
  GiBangingGavel,
} from 'react-icons/gi';
import {
  LuSearch,
  LuCloud,
  LuCloudOff,
  LuMap,
  LuMapPin,
  LuLink2,
  LuPlus,
  LuHammer,
  LuBox,
  LuFootprints,
  LuBrain,
  LuPuzzle,
  LuEye,
  LuEyeOff,
  LuImage,
} from 'react-icons/lu';
import { shade } from '../lib/color';

import { TwoPaintings } from './TwoPaintings';

// ---- Mappings --------------------------------------------------------------

/** Object kind -> realistic icon. Keyed by `kind` so saved objects keep working. */
export const OBJECT_ICONS: Record<string, IconType> = {
  // Furniture
  desk: GiDesk,
  'coffee-table': GiDesk,
  'dining-table': GiDesk,
  'computer-desk': GiDesk,
  chair: GiOfficeChair,
  'dining-chair': GiOfficeChair,
  cabinet: GiLockedChest,
  bed: GiBed,
  lamp: GiDeskLamp,
  mirror: GiMirrorMirror,
  chest: GiChest,
  // Knowledge
  book: GiBookCover,
  books: GiBookPile,
  scroll: GiScrollUnfurled,
  document: GiPapers,
  map: GiTreasureMap,
  clock: GiPocketWatch,
  // Symbols
  statue: GiStoneBust,
  'gold-statue': GiTrophy,
  key: GiKey,
  crown: GiCrown,
  mask: GiDramaMasks,
  gem: GiCutDiamond,
  // Science
  flask: GiRoundBottomFlask,
  microscope: GiMicroscope,
  anatomy: GiAnatomy,
  machine: GiGears,
  dna: GiDna1,
  jar: GiCorkedTube,
  // Nature
  plant: GiFlowerPot,
  tree: GiTreeGrowth,
  flower: GiFlowers,
  crystal: GiCrystalGrowth,
  // Architecture
  door: GiDoorway,
  window: GiWindow,
  pillar: GiAncientColumns,
  fountain: GiFountain,
  // Curios
  painting: GiPaintBrush,
  candle: GiCandleFlame,
  weapon: GiBroadsword,
  skull: GiSkullCrossedBones,
  hourglass: GiHourglass,
  star: GiStarSwirl,
};

/** Room type -> realistic icon. */
export const ROOM_ICONS: Record<string, IconType> = {
  library: GiBookshelf,
  bedroom: GiBed,
  clinic: GiStethoscope,
  courtroom: GiBangingGavel,
  museum: GiGreekTemple,
  temple: GiByzantinTemple,
  laboratory: GiMicroscope,
  garden: GiPlantRoots,
  office: GiDesk,
  tower: GiWatchtower,
  basement: GiCellarBarrels,
  corridor: TwoPaintings,
  custom: GiSecretDoor,
};

export function objectIcon(kind: string): IconType {
  return OBJECT_ICONS[kind] ?? GiCardboardBoxClosed;
}

export function roomIcon(type: string): IconType {
  return ROOM_ICONS[type] ?? GiSecretDoor;
}

// UI chrome icons (exported for convenience).
export const UI_ICONS = {
  search: LuSearch,
  cloudOn: LuCloud,
  cloudOff: LuCloudOff,
  map: LuMap,
  location: LuMapPin,
  puzzle: LuPuzzle,
  connect: LuLink2,
  add: LuPlus,
  build: LuHammer,
  walk: LuFootprints,
  review: LuBrain,
  museum: GiGreekTemple,
  box: LuBox,
  template: GiCardboardBoxClosed,
  castle: GiCastle,
  eye: LuEye,
  eyeOff: LuEyeOff,
  wallpaper: LuImage,
} as const;

// NOTE: the DOM `<Icon>` component lives in ./Icon so that this module exports
// only data + hooks (keeps react-fast-refresh happy). Import it from there.

// ---- Konva raster bridge ---------------------------------------------------
// Konva can't render React/SVG nodes directly, so we rasterise the icon to an
// <img> backed by a data-URL SVG and hand that to a Konva <Image>. Results are
// cached by (icon, color, size) so we only pay the cost once.

const idMap = new WeakMap<object, number>();
let idCounter = 0;
function iconId(icon: IconType): number {
  let id = idMap.get(icon as unknown as object);
  if (id == null) {
    id = ++idCounter;
    idMap.set(icon as unknown as object, id);
  }
  return id;
}

const imageCache = new Map<string, HTMLImageElement>();

function buildIconImage(icon: IconType, color: string, size: number): HTMLImageElement {
  const svg = renderToStaticMarkup(createElement(icon, { color, size }));
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = new window.Image(size, size);
  image.src = url;
  return image;
}

/**
 * Hook that returns a loaded HTMLImageElement for a react-icon, or null until
 * it has decoded. Safe to use inside react-konva components.
 */
export function useIconImage(icon: IconType, color: string, size = 24): HTMLImageElement | null {
  const key = `${iconId(icon)}|${color}|${size}`;
  const [img, setImg] = useState<HTMLImageElement | null>(() => {
    const cached = imageCache.get(key);
    return cached && cached.complete ? cached : null;
  });

  useEffect(() => {
    let image = imageCache.get(key);
    if (!image) {
      image = buildIconImage(icon, color, size);
      imageCache.set(key, image);
    }
    const target = image;
    let alive = true;
    const done = () => {
      if (alive) setImg(target);
    };
    // Defer (microtask / load event) so we never setState synchronously here.
    if (target.complete) queueMicrotask(done);
    else target.addEventListener('load', done, { once: true });
    return () => {
      alive = false;
      target.removeEventListener('load', done);
    };
  }, [key, icon, color, size]);

  return img;
}

/** A readable, slightly-brightened tint of a base color for icons on dark UI. */
export function iconTint(color: string): string {
  return shade(color, 0.34);
}
