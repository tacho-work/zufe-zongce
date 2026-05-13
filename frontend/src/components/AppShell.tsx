import { type ReactNode, useEffect, useRef } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { PageTransition } from './PageTransition';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import './AppShell.css';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    api.getParts()
      .then((parts) => {
        if (parts && parts.length > 0) {
          console.log('[api] parts loaded:', parts.length);
        }
      })
      .catch(() => {
        console.warn('[api] backend unavailable, using local page config');
      });
  }, []);

  return (
    <div className="app-shell">
      <TopNav />
      <div className="app-body">
        <Sidebar />
        <main className="app-main" id="main-content">
          <PageTransition path={location.pathname}>
            {children}
          </PageTransition>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
