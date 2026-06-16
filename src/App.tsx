import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import MuseumWorkspace from './components/MuseumWorkspace';
import SearchModal from './components/SearchModal';
import { useStore } from './state/useStore';
import { useUI } from './state/useUI';
import { useTheme } from './state/useTheme';

export default function App() {
  const init = useStore((s) => s.init);
  const loaded = useStore((s) => s.loaded);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const themeId = useTheme((s) => s.themeId);
  const location = useLocation();
  const museumFocus =
    themeId === 'project-manager' && location.pathname.startsWith('/museum/');

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearchOpen]);

  return (
    <div className={`app-shell${museumFocus ? ' museum-focus' : ''}`}>
      <TopBar />
      {!loaded ? (
        <div className="empty">Loading your museums…</div>
      ) : (
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/museum/:museumId" element={<MuseumWorkspace />} />
        </Routes>
      )}
      <SearchModal />
    </div>
  );
}
