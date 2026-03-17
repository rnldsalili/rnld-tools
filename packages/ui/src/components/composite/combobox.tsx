import * as React from 'react';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@workspace/ui/components/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { cn } from '@workspace/ui/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  keywords?: Array<string>;
}

interface ComboboxProps {
  className?: string;
  disabled?: boolean;
  emptyText?: string;
  id?: string;
  onValueChange: (value: string) => void;
  options: Array<ComboboxOption>;
  placeholder?: string;
  searchPlaceholder?: string;
  value: string;
}

function Combobox({
  className,
  disabled = false,
  emptyText = 'No results found.',
  id,
  onValueChange,
  options,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  value,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn('w-full justify-between px-2 font-normal', className)}
        >
          <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                    key={option.value}
                    value={[option.label, ...(option.keywords ?? [])].join(' ')}
                    onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  <CheckIcon
                      className={cn(
                      'ml-auto',
                      option.value === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox };
