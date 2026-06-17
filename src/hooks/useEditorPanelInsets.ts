import { useLayoutEffect, type RefObject } from 'react';

const PANEL_GAP = 10;
const PANEL_EXTRA_TOP = 52;
const MOBILE_MQ = '(max-width: 767px)';

/** Keep floating editor panels below the top bar as the window or bar height changes. */
export function useEditorPanelInsets(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  themeId: string,
) {
  useLayoutEffect(() => {
    if (!active) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    let bound = false;

    const clearVars = (el: HTMLElement | null) => {
      el?.style.removeProperty('--canvas-overlay-top');
      el?.style.removeProperty('--editor-panel-top');
      el?.style.removeProperty('--editor-panel-bottom');
      el?.style.removeProperty('--editor-panel-collapsed-size');
      el?.style.removeProperty('--editor-panel-collapsed-bottom');
      el?.style.removeProperty('--editor-panel-collapsed-bottom-session');
    };

    const apply = () => {
      if (cancelled) return false;

      const container = containerRef.current;
      const topbar = document.querySelector<HTMLElement>('.topbar');
      if (!container || !topbar) return false;

      const contentTop = container.getBoundingClientRect().top;
      const topbarBottom = topbar.getBoundingClientRect().bottom;
      const isMobile = window.matchMedia(MOBILE_MQ).matches;
      const overlayTop = Math.max(isMobile ? 10 : 14, topbarBottom - contentTop + PANEL_GAP);
      const panelTop = Math.max(
        isMobile ? 10 : 14,
        topbarBottom - contentTop + PANEL_GAP + PANEL_EXTRA_TOP,
      );

      container.style.setProperty('--canvas-overlay-top', `${overlayTop}px`);
      container.style.setProperty('--editor-panel-top', `${panelTop}px`);
      container.style.setProperty('--editor-panel-bottom', isMobile ? '12px' : '18px');
      container.style.setProperty('--editor-panel-collapsed-size', isMobile ? '36px' : '40px');
      container.style.setProperty('--editor-panel-collapsed-bottom', isMobile ? '68px' : '88px');
      container.style.setProperty(
        '--editor-panel-collapsed-bottom-session',
        isMobile ? '148px' : '88px',
      );
      return true;
    };

    const bind = () => {
      if (cancelled || bound) return;

      const container = containerRef.current;
      const topbar = document.querySelector<HTMLElement>('.topbar');
      if (!container || !topbar) return;

      ro = new ResizeObserver(() => apply());
      ro.observe(topbar);
      ro.observe(container);
      window.addEventListener('resize', apply);

      themeObserver = new MutationObserver(() => {
        requestAnimationFrame(apply);
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-ui-theme'],
      });

      bound = true;
    };

    const ready = () => {
      if (cancelled) return;
      if (apply()) bind();
      else requestAnimationFrame(ready);
    };

    ready();

    return () => {
      cancelled = true;
      ro?.disconnect();
      themeObserver?.disconnect();
      window.removeEventListener('resize', apply);
      clearVars(containerRef.current);
    };
  }, [active, containerRef, themeId]);
}
