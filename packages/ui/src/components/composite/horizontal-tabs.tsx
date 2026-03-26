import * as React from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { cn } from '@workspace/ui/lib/utils';

export interface TabsItem {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface HorizontalTabsProps {
  items: Array<TabsItem>;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  listClassName?: string;
  contentClassName?: string;
}

export function HorizontalTabs({
  items,
  defaultValue,
  value,
  onValueChange,
  className,
  listClassName,
  contentClassName,
}: HorizontalTabsProps) {
  const rootProps = value !== undefined
    ? { value, onValueChange }
    : { defaultValue: defaultValue ?? items[0]?.value };

  return (
    <Tabs {...rootProps} className={cn('w-full', className)}>
      <TabsList
          className={cn(
          'flex w-full max-w-full justify-start gap-1 overflow-x-auto overscroll-x-contain sm:w-fit sm:justify-center',
          listClassName,
        )}
      >
        {items.map((item) => (
          <TabsTrigger
              key={item.value}
              value={item.value}
              className="shrink-0 px-3 py-1.5 text-sm"
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value} className={cn('min-w-0', contentClassName)}>
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
