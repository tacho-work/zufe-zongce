import { Box, type LucideIcon } from 'lucide-react';
import './EmptyState.css';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon = Box, title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon size={32} strokeWidth={1.25} className="empty-state-icon" />
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
    </div>
  );
}
