import { type ReactNode } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { PageTransition } from './PageTransition';
import { useLocation } from 'react-router-dom';
import './AppShell.css';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();

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
