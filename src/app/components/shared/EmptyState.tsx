import React from 'react';
import { FileX, SearchX, InboxIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: 'file' | 'search' | 'inbox' | React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  action,
  className,
}) => {
  const getIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    
    const iconMap = {
      file: FileX,
      search: SearchX,
      inbox: InboxIcon,
    };
    
    const Icon = iconMap[icon as keyof typeof iconMap] || InboxIcon;
    return <Icon className="h-16 w-16 text-muted-foreground" />;
  };

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      {getIcon()}
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
