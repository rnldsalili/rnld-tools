import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function Pagination({ page, totalPages, onPageChange, isLoading = false }: PaginationProps) {
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex items-center justify-end gap-3">
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages || 1}
      </span>
      <div className="flex items-center gap-1">
        <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev || isLoading}
            aria-label="Previous page"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext || isLoading}
            aria-label="Next page"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
