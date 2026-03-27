import { cn } from '@workspace/ui';
import type { LucideIcon } from 'lucide-react';

import { PUBLIC_TOOL_ICON_CLASS_NAME } from '@/app/constants/public-tools';

interface ToolIconBadgeProps {
  icon: LucideIcon;
  size?: 'card' | 'hero';
  className?: string;
}

const TOOL_ICON_BADGE_SIZE_CLASS_NAMES = {
  card: {
    container: 'size-10 rounded-xl',
    icon: 'size-4.5',
  },
  hero: {
    container: 'size-12 rounded-2xl',
    icon: 'size-5',
  },
};

export function ToolIconBadge({
  icon: Icon,
  size = 'card',
  className,
}: ToolIconBadgeProps) {
  const appearance = TOOL_ICON_BADGE_SIZE_CLASS_NAMES[size];

  return (
    <span
        className={cn(
          'flex shrink-0 items-center justify-center border',
          PUBLIC_TOOL_ICON_CLASS_NAME,
          appearance.container,
          className,
        )}
    >
      <Icon className={appearance.icon} />
    </span>
  );
}
