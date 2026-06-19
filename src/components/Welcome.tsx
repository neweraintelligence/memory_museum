import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../state/useTheme';
import ThemedSelect, { BlueprintSelect } from './ThemedSelect';
import { applyUiTheme, preloadWelcomeFont } from '../themes/ui/applyTheme';
import { isWelcomeFontReady } from '../themes/ui/welcomeFonts';
import type { UiThemeId } from '../themes/ui/types';
import './welcome.css';

const WELCOME_THEMES = [
  {
    id: 'bookworm',
    label: 'Bookworm',
    bg: '#2a2018',
    text: '#e8dfd0',
    accent: '#4b0d18',
    buttonText: '#f0e8da',
  },
  {
    id: 'utilitarian',
    label: 'Utilitarian',
    bg: '#9d9c97',
    text: '#1a1a18',
    accent: '#b4421f',
    buttonText: '#f7f1ea',
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    bg: '#0a1628',
    text: '#d4e4ff',
    accent: '#4dabf7',
    buttonText: '#0a1628',
  },
  {
    id: 'clairvoyant',
    label: 'Clairvoyant',
    bg: '#163230',
    text: '#ffffff',
    accent: '#ffffff',
    buttonText: '#2f332c',
  },
] as const;

const WELCOME_BACKGROUND_THEMES = {
  bookworm: {
    day: '/bookworm-welcome-day.webp',
    night: '/bookworm-welcome-night.webp',
    panel: '/bookworm-welcome-panel.webp',
  },
  utilitarian: {
    day: '/utilitarian-welcome-day.webp',
    night: '/utilitarian-welcome-night.webp',
  },
  blueprint: {
    day: '/blueprint-welcome-day.webp',
    night: '/blueprint-welcome-night.webp',
  },
  clairvoyant: {
    day: '/clairvoyant-welcome-day.webp',
    night: '/clairvoyant-welcome-night.webp',
  },
} as const;

type WelcomeBackgroundThemeId = keyof typeof WELCOME_BACKGROUND_THEMES;

function hasWelcomeBackground(id: UiThemeId): id is WelcomeBackgroundThemeId {
  return id in WELCOME_BACKGROUND_THEMES;
}

const TIME_TOGGLE_ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function TimeOfDaySunMoonIcon({ timeOfDay }: { timeOfDay: 'day' | 'night' }) {
  return (
    <svg {...TIME_TOGGLE_ICON_PROPS}>
      {timeOfDay === 'day' ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <g>
            <line x1="12" y1="3.5" x2="12" y2="5.5" />
            <line x1="12" y1="18.5" x2="12" y2="20.5" />
            <line x1="3.5" y1="12" x2="5.5" y2="12" />
            <line x1="18.5" y1="12" x2="20.5" y2="12" />
            <line x1="6.3" y1="6.3" x2="7.7" y2="7.7" />
            <line x1="16.3" y1="16.3" x2="17.7" y2="17.7" />
            <line x1="17.7" y1="6.3" x2="16.3" y2="7.7" />
            <line x1="7.7" y1="16.3" x2="6.3" y2="17.7" />
          </g>
        </>
      ) : (
        <path d="M19 14.2A7.2 7.2 0 0 1 9.8 5a0.55 0.55 0 0 0-0.75-0.64A7.7 7.7 0 1 0 19.64 14.95a0.55 0.55 0 0 0-0.64-0.75Z" />
      )}
    </svg>
  );
}

function TimeOfDayClairvoyantIcon({ timeOfDay }: { timeOfDay: 'day' | 'night' }) {
  return (
    <svg {...TIME_TOGGLE_ICON_PROPS}>
      {timeOfDay === 'day' ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <g>
            <line x1="12" y1="3.5" x2="12" y2="5.5" />
            <line x1="12" y1="18.5" x2="12" y2="20.5" />
            <line x1="3.5" y1="12" x2="5.5" y2="12" />
            <line x1="18.5" y1="12" x2="20.5" y2="12" />
            <line x1="6.3" y1="6.3" x2="7.7" y2="7.7" />
            <line x1="16.3" y1="16.3" x2="17.7" y2="17.7" />
            <line x1="17.7" y1="6.3" x2="16.3" y2="7.7" />
            <line x1="7.7" y1="16.3" x2="6.3" y2="17.7" />
          </g>
        </>
      ) : (
        <path d="M12 2.8c-.4 0-.8.2-1 .6C8.8 7.2 6 10.8 6 14a6 6 0 0 0 12 0c0-3.2-2.8-6.8-5-10.6-.2-.4-.6-.6-1-.6Z" />
      )}
    </svg>
  );
}

function TimeOfDayBlueprintIcon({ timeOfDay }: { timeOfDay: 'day' | 'night' }) {
  return (
    <svg {...TIME_TOGGLE_ICON_PROPS}>
      {timeOfDay === 'day' ? (
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </>
      ) : (
        <>
          <path d="m15 12-8.373 8.373a1 1 0 0 1-3.001-3L12 9" />
          <path d="m18 15 4-4" />
          <path d="m21.5 11.5-1.914-1.914A2 2 0 0 0 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
        </>
      )}
    </svg>
  );
}

function TimeOfDayToggle({
  timeOfDay,
  onToggle,
  className,
  style,
  blueprintIcons = false,
  clairvoyantIcons = false,
}: {
  timeOfDay: 'day' | 'night';
  onToggle: () => void;
  className?: string;
  style?: React.CSSProperties;
  blueprintIcons?: boolean;
  clairvoyantIcons?: boolean;
}) {
  const toggleLabel = clairvoyantIcons
    ? timeOfDay === 'day'
      ? 'Switch to rainy'
      : 'Switch to sunny'
    : timeOfDay === 'day'
      ? 'Switch to night'
      : 'Switch to day';

  if (clairvoyantIcons) {
    return (
      <div className={`welcome-glass-wrap ${className ?? ''}`.trim()} style={style}>
        <button
          type="button"
          className="welcome-glass-btn"
          onClick={onToggle}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <span className="welcome-glass-content welcome-glass-content--icon">
            <TimeOfDayClairvoyantIcon timeOfDay={timeOfDay} />
          </span>
        </button>
        <div className="welcome-glass-shadow" aria-hidden="true" />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onToggle}
      aria-label={toggleLabel}
      title={toggleLabel}
      style={style}
    >
      {blueprintIcons ? (
        <TimeOfDayBlueprintIcon timeOfDay={timeOfDay} />
      ) : (
        <TimeOfDaySunMoonIcon timeOfDay={timeOfDay} />
      )}
    </button>
  );
}

export default function Welcome() {
  const navigate = useNavigate();
  const appThemeId = useTheme((s) => s.themeId);
  const setAppTheme = useTheme((s) => s.setTheme);
  const [themeId, setThemeId] = useState<UiThemeId>(appThemeId);
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'night'>('night');
  const [welcomeFontReady, setWelcomeFontReady] = useState(() => isWelcomeFontReady(appThemeId));
  const welcomeTitleRef = useRef<HTMLHeadingElement>(null);
  const welcomeContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setThemeId(appThemeId);
  }, [appThemeId]);

  useEffect(() => {
    if (themeId === 'blueprint') {
      setTimeOfDay('day');
    }
  }, [themeId]);

  useLayoutEffect(() => {
    const contentEl = welcomeContentRef.current;
    const needsBlueprintWidth = themeId === 'blueprint';
    const needsUtilitarianWidth = themeId === 'utilitarian';

    if (!needsBlueprintWidth) {
      contentEl?.style.removeProperty('--blueprint-title-width');
    }
    if (!needsUtilitarianWidth) {
      contentEl?.style.removeProperty('--utilitarian-title-width');
    }
    if (!needsBlueprintWidth && !needsUtilitarianWidth) return;

    const titleEl = welcomeTitleRef.current;
    if (!titleEl || !contentEl) return;

    const measure = () => {
      const width = `${titleEl.offsetWidth}px`;
      if (needsBlueprintWidth) {
        contentEl.style.setProperty('--blueprint-title-width', width);
      }
      if (needsUtilitarianWidth) {
        contentEl.style.setProperty('--utilitarian-title-width', width);
      }
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(titleEl);

    if (document.fonts?.ready) {
      void document.fonts.ready.then(measure);
    }

    return () => observer.disconnect();
  }, [themeId, welcomeFontReady]);

  // Keep the title page visually self-contained and independent of the app's
  // persisted theme. The global theme attribute lives on <html>, and theme CSS
  // relies on generic descendant rules + inherited font/color tokens, so a
  // mismatched app theme would otherwise bleed its styling into the welcome
  // screen. While this screen is mounted we drive that attribute from the
  // locally previewed theme only; the real app theme is committed solely on
  // Enter and restored when leaving.
  useLayoutEffect(() => {
    applyUiTheme(themeId);
    return () => {
      applyUiTheme(useTheme.getState().themeId);
    };
  }, [themeId]);

  useLayoutEffect(() => {
    let active = true;

    if (isWelcomeFontReady(themeId)) {
      setWelcomeFontReady(true);
      return () => {
        active = false;
      };
    }

    setWelcomeFontReady(false);
    void preloadWelcomeFont(themeId).then(() => {
      if (active) setWelcomeFontReady(true);
    });

    return () => {
      active = false;
    };
  }, [themeId]);

  useEffect(() => {
    if (!hasWelcomeBackground(themeId)) return;
    const bg = WELCOME_BACKGROUND_THEMES[themeId];
    const urls = Object.values(bg);
    for (const src of urls) {
      const img = new Image();
      img.src = src;
    }
  }, [themeId]);

  const theme = WELCOME_THEMES.find((t) => t.id === themeId) || WELCOME_THEMES[0];
  const isBookworm = themeId === 'bookworm';
  const isBlueprint = themeId === 'blueprint';
  const isClairvoyant = themeId === 'clairvoyant';
  const hasBg = hasWelcomeBackground(themeId);
  const bgTheme = hasBg ? WELCOME_BACKGROUND_THEMES[themeId] : null;
  const onPhotoBg = themeId === 'utilitarian';
  const onWelcomePhoto = hasBg && !isBookworm;
  const utilitarianDay = onPhotoBg && timeOfDay === 'day';
  const fg = onPhotoBg ? (utilitarianDay ? '#111111' : '#ffffff') : theme.text;
  const textShadow = onPhotoBg
    ? utilitarianDay
      ? '0 1px 3px rgba(0, 0, 0, 0.14), 0 3px 10px rgba(0, 0, 0, 0.1)'
      : '0 2px 14px rgba(0, 0, 0, 0.65)'
    : isClairvoyant && hasBg
      ? '0 2px 10px rgba(0, 0, 0, 0.55), 0 6px 24px rgba(0, 0, 0, 0.35)'
      : 'none';
  const utilitarianSecondaryFg = '#ffffff';
  const utilitarianSecondaryShadow = '0 2px 14px rgba(0, 0, 0, 0.65)';

  const handleEnter = () => {
    localStorage.setItem('hasEntered', 'true');
    setAppTheme(themeId);
    navigate('/dashboard');
  };

  const toggleTimeOfDay = () => setTimeOfDay((t) => (t === 'day' ? 'night' : 'day'));

  return (
    <div
      className="welcome"
      data-ui-theme={themeId}
      data-welcome-font-ready={welcomeFontReady || undefined}
      data-welcome-time={onPhotoBg || isBlueprint ? timeOfDay : undefined}
      style={
        hasBg
          ? undefined
          : {
              backgroundColor: theme.bg,
              color: theme.text,
              fontFamily: 'var(--font-body, system-ui, -apple-system, sans-serif)',
            }
      }
    >
      {hasBg && bgTheme && (
        <div className="welcome-bg" aria-hidden="true">
          <div
            className="welcome-bg-layer"
            style={{
              backgroundImage: `url(${bgTheme.day})`,
              opacity: timeOfDay === 'day' ? 1 : 0,
            }}
          />
          <div
            className="welcome-bg-layer"
            style={{
              backgroundImage: `url(${bgTheme.night})`,
              opacity: timeOfDay === 'night' ? 1 : 0,
            }}
          />
          <div className="welcome-bg-vignette" />
        </div>
      )}

      {hasBg && !isClairvoyant && (
        <TimeOfDayToggle
          timeOfDay={timeOfDay}
          onToggle={toggleTimeOfDay}
          className="welcome-time-toggle"
          blueprintIcons={isBlueprint}
          clairvoyantIcons={isClairvoyant}
        />
      )}

      <div
        ref={welcomeContentRef}
        className="welcome-content"
        style={hasBg && !isBookworm ? { textShadow } : isBookworm ? undefined : { textShadow: 'none' }}
      >
        {isBookworm ? (
          <div className="welcome-panel">
            <div className="welcome-panel-inner">
              <div className="welcome-brand brand">
                <h1 className="welcome-title">Memory Museum</h1>
              </div>

              <p className="welcome-tagline muted">
                Build a place for your knowledge to live
              </p>

              <div className="welcome-logo brand">
                <span className="logo">
                  <span className="brand-icon" aria-hidden="true">
                    <span className="brand-icon-carve" aria-hidden="true" />
                  </span>
                </span>
              </div>

              <div className="welcome-theme-picker field">
                <label className="section-title" htmlFor="welcome-theme">
                  Choose Your Theme
                </label>
                <select
                  id="welcome-theme"
                  className="welcome-theme-select"
                  value={themeId}
                  onChange={(e) => setThemeId(e.target.value as UiThemeId)}
                >
                  {WELCOME_THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <button type="button" className="primary welcome-enter" onClick={handleEnter}>
                Enter
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1
              ref={onPhotoBg || isBlueprint ? welcomeTitleRef : undefined}
              className="welcome-title"
            >
              {onPhotoBg || isBlueprint ? (
                <>
                  <span className="welcome-title-line">Memory</span>
                  <span className="welcome-title-line">Museum</span>
                </>
              ) : (
                'Memory Museum'
              )}
            </h1>
            <p
              className={
                onPhotoBg
                  ? 'welcome-utilitarian-tagline'
                  : isBlueprint
                    ? 'welcome-blueprint-tagline'
                    : 'welcome-tagline'
              }
            >
              Build a place for your knowledge to live
            </p>

            <div
              className={
                isBlueprint
                  ? 'welcome-blueprint-theme'
                  : isClairvoyant
                    ? 'welcome-clairvoyant-theme-picker'
                    : undefined
              }
              style={
                isBlueprint || isClairvoyant
                  ? undefined
                  : {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px',
                      marginBottom: '48px',
                    }
              }
            >
              <label
                className={
                  isBlueprint
                    ? 'welcome-blueprint-label'
                    : isClairvoyant
                      ? 'welcome-clairvoyant-label'
                      : undefined
                }
                style={
                  isBlueprint || isClairvoyant
                    ? undefined
                    : {
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: onPhotoBg ? 0.85 : 0.7,
                  color: onPhotoBg ? utilitarianSecondaryFg : fg,
                  textShadow: onPhotoBg ? utilitarianSecondaryShadow : textShadow,
                }
                }
              >
                Choose Your Theme
              </label>
              {isBlueprint ? (
                <ThemedSelect
                  forceBlueprint
                  value={themeId}
                  onChange={(value) => setThemeId(value as UiThemeId)}
                  options={WELCOME_THEMES.map((t) => ({ value: t.id, label: t.label }))}
                  className="welcome-blueprint-select"
                  aria-label="Choose your theme"
                />
              ) : onPhotoBg ? (
                <BlueprintSelect
                  value={themeId}
                  onChange={(value) => setThemeId(value as UiThemeId)}
                  options={WELCOME_THEMES.map((t) => ({ value: t.id, label: t.label }))}
                  className="welcome-utilitarian-select"
                  aria-label="Choose your theme"
                />
              ) : (
                <select
                  className="welcome-clairvoyant-select"
                  value={themeId}
                  onChange={(e) => setThemeId(e.target.value as UiThemeId)}
                >
                  {WELCOME_THEMES.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      style={{ color: '#000', backgroundColor: '#fff' }}
                    >
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {isClairvoyant ? (
              <div className="welcome-clairvoyant-actions">
                <div className="welcome-glass-wrap">
                  <button type="button" className="welcome-glass-btn" onClick={handleEnter}>
                    <span className="welcome-glass-content welcome-glass-content--enter">Enter</span>
                  </button>
                  <div className="welcome-glass-shadow" aria-hidden="true" />
                </div>
                <TimeOfDayToggle
                  timeOfDay={timeOfDay}
                  onToggle={toggleTimeOfDay}
                  className="welcome-time-toggle"
                  clairvoyantIcons
                />
              </div>
            ) : (
              <button
                type="button"
                className={onWelcomePhoto ? 'primary welcome-enter' : undefined}
                onClick={handleEnter}
                style={
                  onWelcomePhoto
                    ? undefined
                    : {
                        backgroundColor: theme.accent,
                        color: theme.buttonText,
                        border: 'none',
                        padding: '16px 64px',
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        borderRadius: '40px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, opacity 0.2s ease',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                      }
                }
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              >
                Enter
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
