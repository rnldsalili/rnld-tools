import * as React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

function Toaster({ ...props }: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
        data-slot="toaster"
        {...props}
    />
  );
}

export { Toaster };
