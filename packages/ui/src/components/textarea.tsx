import * as React from 'react';

import { cn } from '@workspace/ui/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
        data-slot="textarea"
        className={cn(
        'flex field-sizing-content min-h-24 w-full resize-none rounded-md border border-input bg-input/20 px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 sm:min-h-16 sm:px-2 sm:py-2 sm:text-xs/relaxed dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
        {...props}
    />
  );
}

export { Textarea };
