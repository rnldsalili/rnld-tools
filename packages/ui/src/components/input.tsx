import * as React from 'react';

import { cn } from '@workspace/ui/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
        type={type}
        data-slot="input"
        className={cn(
        'h-10 w-full min-w-0 rounded-md border border-input bg-input/20 px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 sm:h-7 sm:px-2 sm:py-0.5 sm:text-xs/relaxed sm:file:h-6 sm:file:text-xs/relaxed dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
        {...props}
    />
  );
}

export { Input };
