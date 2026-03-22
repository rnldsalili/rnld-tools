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
}

export function HorizontalTabs({
  items,
  defaultValue,
  value,
  onValueChange,
  className,
}: HorizontalTabsProps) {
  const rootProps = value !== undefined
    ? { value, onValueChange }
    : { defaultValue: defaultValue ?? items[0]?.value };

  return (
    <Tabs {...rootProps} className={cn('w-full', className)}>
      <TabsList className="w-full justify-start overflow-x-auto sm:w-fit sm:justify-center">
        {items.map((item) => (
          <TabsTrigger
              key={item.value}
              value={item.value}
              className="text-sm px-3"
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
