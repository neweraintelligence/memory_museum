import { useEffect, useState } from 'react';

const cache = new Map<string, HTMLImageElement>();

export function publicAssetUrl(path: string): string {
  return `/${path.replace(/^\//, '')}`;
}

/** Load a PNG from /public. Results are cached by URL. */
export function usePublicImage(path: string | undefined): HTMLImageElement | null {
  const url = path ? publicAssetUrl(path) : undefined;

  const [img, setImg] = useState<HTMLImageElement | null>(() => {
    if (!url) return null;
    const cached = cache.get(url);
    return cached?.complete ? cached : null;
  });

  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }

    let image = cache.get(url);
    if (!image) {
      image = new window.Image();
      image.src = url;
      cache.set(url, image);
    }

    const target = image;
    let alive = true;
    const done = () => {
      if (alive) setImg(target);
    };

    if (target.complete) queueMicrotask(done);
    else target.addEventListener('load', done, { once: true });

    return () => {
      alive = false;
      target.removeEventListener('load', done);
    };
  }, [url]);

  return img;
}
