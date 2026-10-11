import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void; };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6 border-2 border-dashed border-line dark:border-line rounded-panel bg-canvas/50 dark:bg-surface/50">
    <div className="w-16 h-16 bg-raised dark:bg-surface rounded-full flex items-center justify-center mb-4 text-muted dark:text-secondary">
      <Icon size={32} />
    </div>
    <h3 className="text-lg font-bold text-foreground dark:text-foreground mb-2">{title}</h3>
    <p className="text-sm text-secondary dark:text-muted max-w-sm mb-6">{description}</p>
    {action && (
      <button onClick={action.onClick} className="bg-action text-action-foreground px-6 py-2 rounded-md font-bold hover:bg-action-hover transition-colors">
        {action.label}
      </button>
    )}
  </div>
);
