import { NavLink } from 'react-router-dom';
import {
  ShieldCheck, BookOpen, Dumbbell,
  Palette, Wrench, FileDown, Settings,
} from 'lucide-react';
import { NAV_PAGES } from '../types/zongce';
import './Sidebar.css';

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  BookOpen,
  Dumbbell,
  Palette,
  Wrench,
  FileDown,
  Settings,
};

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="主导航">
      <ul className="sidebar-list">
        {NAV_PAGES.map((page) => {
          const Icon = ICON_MAP[page.iconName] ?? Settings;
          return (
            <li key={page.id}>
              <NavLink
                to={page.path}
                end
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
                }
              >
                <Icon size={18} strokeWidth={1.75} className="sidebar-icon" />
                <span className="sidebar-label">{page.title}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
