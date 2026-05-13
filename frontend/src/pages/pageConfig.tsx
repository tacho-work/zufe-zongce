import { NAV_PAGES } from '../types/zongce';

export { NAV_PAGES };
export type { NavPage } from '../types/zongce';

// Re-export for backward compat — Sidebar / MobileNav use this
export const pageConfig = NAV_PAGES.map((p, i) => ({
  id: i + 1,
  title: p.title,
  shortTitle: p.shortTitle,
  path: p.path,
  icon: p.iconName,
}));
