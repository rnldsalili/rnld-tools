import { CheckIcon, LoaderCircleIcon } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';

export type ProgressStepperItemState = 'complete' | 'current' | 'pending';

export interface ProgressStepperItem {
  id: string;
  label: string;
  state: ProgressStepperItemState;
  stepLabel?: string;
  ariaLabel?: string;
  isLoading?: boolean;
}

interface ProgressStepperProps {
  items: Array<ProgressStepperItem>;
  className?: string;
}

export function ProgressStepper({ items, className }: ProgressStepperProps) {
  const currentItemIndex = items.findIndex((item) => item.state === 'current');
  const progressPercentage = items.length > 1 && currentItemIndex >= 0
    ? (currentItemIndex / (items.length - 1)) * 100
    : 0;

  return (
    <div className={cn('w-full py-2 sm:py-3', className)}>
      <div className="relative px-1 sm:px-2">
        <div
          className="absolute top-4 h-0.5 rounded-full bg-border/60"
          style={{ left: '16px', right: '16px' }}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <ol className="relative grid grid-cols-3 gap-x-3 gap-y-4 sm:gap-x-6">
          {items.map((item, index) => (
            <li
              key={item.id}
              aria-current={item.state === 'current' ? 'step' : undefined}
              aria-label={item.ariaLabel ?? item.label}
              className={cn(
                'min-w-0',
                index === 0 && 'justify-self-start',
                index > 0 && index < items.length - 1 && 'justify-self-center',
                index === items.length - 1 && 'justify-self-end',
              )}
            >
              <div
                className={cn(
                  'min-w-0',
                  index === 0 && 'text-left',
                  index > 0 && index < items.length - 1 && 'text-center',
                  index === items.length - 1 && 'text-right',
                )}
              >
                <div
                  className={cn(
                    'flex',
                    index === 0 && 'justify-start',
                    index > 0 && index < items.length - 1 && 'justify-center',
                    index === items.length - 1 && 'justify-end',
                  )}
                >
                  <span
                    className={cn(
                      'relative flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors sm:size-9 sm:text-sm',
                      item.state === 'complete' && 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20',
                      item.state === 'current' && 'border-primary bg-background text-primary shadow-sm shadow-primary/15',
                      item.state === 'pending' && 'border-border bg-background text-muted-foreground',
                    )}
                  >
                    {item.state === 'current' ? (
                      <span className="absolute inset-[-4px] rounded-full border-2 border-primary/20" aria-hidden="true" />
                    ) : null}

                    {item.isLoading && item.state === 'current' ? (
                      <LoaderCircleIcon className="size-4 animate-spin" />
                    ) : item.state === 'complete' ? (
                      <CheckIcon className="size-4" />
                    ) : (
                      index + 1
                    )}
                  </span>
                </div>

                <div className="mt-3 min-w-0 space-y-0.5">
                  <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px]">
                    {item.stepLabel ?? `Step ${index + 1}`}
                  </p>
                  <p
                    className={cn(
                      'truncate tracking-tight',
                      item.state === 'current' && 'text-sm font-semibold text-foreground sm:text-base',
                      item.state === 'complete' && 'text-xs font-medium text-foreground sm:text-sm sm:font-semibold',
                      item.state === 'pending' && 'text-xs font-medium text-muted-foreground sm:text-sm sm:font-semibold',
                    )}
                  >
                    {item.label}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
