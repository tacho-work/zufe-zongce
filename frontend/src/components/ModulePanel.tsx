import { type ReactNode } from 'react';
import './ModulePanel.css';

interface ModulePanelProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function ModulePanel({ title, children, className = '' }: ModulePanelProps) {
  return (
    <section className={`module-panel ${className}`}>
      <div className="module-panel-header">
        <h2 className="module-panel-title">{title}</h2>
      </div>
      <div className="module-panel-body">{children}</div>
    </section>
  );
}
