/** Sticker-style PNG icons for the editor object palette (right menu). */
export const OBJECT_MENU_ICONS: Record<string, string> = {
  // Furniture
  desk: '/menu-icons/side-table.png',
  'coffee-table': '/menu-icons/coffee-table.png',
  'dining-table': '/menu-icons/dining-table.png',
  'computer-desk': '/menu-icons/computer-desk.png',
  chair: '/menu-icons/chair.png',
  'dining-chair': '/menu-icons/dining-chair.png',
  cabinet: '/menu-icons/cabinet.png',
  bed: '/menu-icons/bed.png',
  lamp: '/menu-icons/lamp.png',
  mirror: '/menu-icons/mirror.png',
  chest: '/menu-icons/chest.png',
  // Knowledge
  book: '/menu-icons/book.png',
  books: '/menu-icons/books.png',
  scroll: '/menu-icons/scroll.png',
  document: '/menu-icons/document.png',
  map: '/menu-icons/map.png',
  clock: '/menu-icons/clock.png',
  // Symbols
  statue: '/menu-icons/statue.png',
  'gold-statue': '/menu-icons/gold-statue.png',
  key: '/menu-icons/key.png',
  crown: '/menu-icons/crown.png',
  mask: '/menu-icons/mask.png',
  gem: '/menu-icons/gem.png',
  // Science
  flask: '/menu-icons/flask.png',
  microscope: '/menu-icons/microscope.png',
  anatomy: '/menu-icons/anatomy.png',
  machine: '/menu-icons/machine.png',
  dna: '/menu-icons/dna.png',
  jar: '/menu-icons/jar.png',
  // Nature
  plant: '/menu-icons/plant.png',
  tree: '/menu-icons/tree.png',
  flower: '/menu-icons/flower.png',
  crystal: '/menu-icons/crystal.png',
  // Architecture
  door: '/menu-icons/door.png',
  window: '/menu-icons/window.png',
  pillar: '/menu-icons/pillar.png',
  fountain: '/menu-icons/fountain.png',
  // Curios
  painting: '/menu-icons/painting.png',
  candle: '/menu-icons/candle.png',
  weapon: '/menu-icons/weapon.png',
  skull: '/menu-icons/skull.png',
  hourglass: '/menu-icons/hourglass.png',
  star: '/menu-icons/star.png',
};

export function objectMenuIcon(kind: string): string | null {
  return OBJECT_MENU_ICONS[kind] ?? null;
}
