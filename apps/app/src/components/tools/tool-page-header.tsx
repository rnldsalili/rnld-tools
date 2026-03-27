import { cn } from '@workspace/ui';
import type { PublicToolHref } from '@/app/constants/public-tools';

import { PUBLIC_TOOLS_BY_HREF } from '@/app/constants/public-tools';
import { ToolIconBadge } from '@/app/components/tools/tool-icon-badge';

interface ToolPageHeaderProps {
  href: PublicToolHref;
  description?: string;
}

export function ToolPageHeader({
  href,
  description,
}: ToolPageHeaderProps) {
  const tool = PUBLIC_TOOLS_BY_HREF[href];

  return (
    <div className="mb-8 flex max-w-2xl flex-col items-center text-center">
      <ToolIconBadge icon={tool.icon} size="hero" className="mb-6" />
      <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
        Tools
      </p>
      <h1
          className={cn(
          'text-4xl font-bold tracking-tight text-foreground',
          description ? 'mb-3' : 'mb-0',
        )}
      >
        {tool.title}
      </h1>
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
