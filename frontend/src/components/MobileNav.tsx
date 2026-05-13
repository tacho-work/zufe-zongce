import { NavLink } from 'react-router-dom';
import {
  ShieldCheck, BookOpen, Dumbbell,
  Palette, Wrench, FileDown, Settings,
} from 'lucide-react';
import { NAV_PAGES } from '../types/zongce';
import './MobileNav.css';

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  BookOpen,
  Dumbbell,
  Palette,
  Wrench,
  FileDown,
  Settings,
};

export function MobileNav() {
  return (
    <nav className="mobilenav" aria-label="移动端导航">
      {NAV_PAGES.map((page) => {
        const Icon = ICON_MAP[page.iconName] ?? Settings;
        return (
          <NavLink
            key={page.id}
            to={page.path}
            end
            className={({ isActive }) =>
              `mobilenav-link${isActive ? ' mobilenav-link--active' : ''}`
            }
          >
            <Icon size={20} strokeWidth={1.75} className="mobilenav-icon" />
            <span className="mobilenav-label">{page.shortTitle}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
