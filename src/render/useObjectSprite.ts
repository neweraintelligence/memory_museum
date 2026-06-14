import { useEffect, useState } from 'react';

const imageCache = new Map<string, HTMLImageElement>();
const metricsCache = new Map<string, SpriteMetrics>();

export interface SpriteMetrics {
  /** 0–1: distance from sprite top to floor contact row. */
  groundY: number;
  /** Horizontal offset from image center as fraction of width (−0.5…0.5). */
  centerX: number;
  /** 0–1: distance from sprite top to first opaque content row. */
  topY: number;
  bottomY: number;
  bboxCenterX: number;
}

const DEFAULT_METRICS: SpriteMetrics = {
  groundY: 1,
  centerX: 0,
  topY: 0,
  bottomY: 1,
  bboxCenterX: 0,
};

/**
 * Find floor contact + horizontal center from weighted mass in the lower band.
 * Ignores faint shadow pixels and off-center canvas padding.
 */
function detectSpriteMetrics(img: HTMLImageElement): SpriteMetrics {
  const key = img.src;
  const cached = metricsCache.get(key);
  if (cached) return cached;

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return DEFAULT_METRICS;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return DEFAULT_METRICS;

  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);

  let topRow = 0;
  let bottomRow = h - 1;
  let leftCol = w - 1;
  let rightCol = 0;
  let found = false;
  outer: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 48) {
        topRow = y;
        found = true;
        break outer;
      }
    }
  }
  if (!found) return DEFAULT_METRICS;

  for (let y = topRow; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 48) {
        bottomRow = y;
        leftCol = Math.min(leftCol, x);
        rightCol = Math.max(rightCol, x);
      }
    }
  }
  const topY = topRow / h;
  const bottomY = (bottomRow + 1) / h;
  const bboxCenterX = ((leftCol + rightCol + 1) / 2) / w - 0.5;

  const bandStart = Math.floor(h * 0.72);
  let sumY = 0;
  let sumX = 0;
  let sumA = 0;

  for (let y = bandStart; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 48) {
        sumY += y * a;
        sumX += x * a;
        sumA += a;
      }
    }
  }

  if (sumA > 0) {
    const metrics: SpriteMetrics = {
      groundY: (sumY / sumA + 1) / h,
      centerX: sumX / sumA / w - 0.5,
      topY,
      bottomY,
      bboxCenterX,
    };
    metricsCache.set(key, metrics);
    return metrics;
  }

  const fallback: SpriteMetrics = { groundY: bottomY, centerX: bboxCenterX, topY, bottomY, bboxCenterX };
  metricsCache.set(key, fallback);
  return fallback;
}

export interface ObjectSpriteLoad extends SpriteMetrics {
  image: HTMLImageElement | null;
}

/** Load a PNG sprite from /public for Konva rendering. Results are cached. */
export function useObjectSprite(url: string | undefined): ObjectSpriteLoad {
  const [image, setImage] = useState<HTMLImageElement | null>(() => {
    if (!url) return null;
    const cached = imageCache.get(url);
    return cached?.complete ? cached : null;
  });
  const [metrics, setMetrics] = useState<SpriteMetrics>(() => {
    if (!url) return DEFAULT_METRICS;
    return metricsCache.get(url) ?? DEFAULT_METRICS;
  });

  useEffect(() => {
    if (!url) {
      let alive = true;
      queueMicrotask(() => {
        if (!alive) return;
        setImage(null);
        setMetrics(DEFAULT_METRICS);
      });
      return () => {
        alive = false;
      };
    }

    let img = imageCache.get(url);
    if (!img) {
      img = new window.Image();
      img.src = url;
      imageCache.set(url, img);
    }

    const target = img;
    let alive = true;
    const done = () => {
      if (!alive) return;
      setImage(target);
      setMetrics(detectSpriteMetrics(target));
    };

    if (target.complete) queueMicrotask(done);
    else target.addEventListener('load', done, { once: true });

    return () => {
      alive = false;
      target.removeEventListener('load', done);
    };
  }, [url]);

  return { image, ...metrics };
}

/** Clear cached layout metrics (e.g. after replacing sprite files). */
export function clearObjectSpriteCache(): void {
  metricsCache.clear();
}
