import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
} from '@workspace/ui';
import { NOTIFICATION_PLACEHOLDER_GROUPS } from '@workspace/constants';

export function NotificationPlaceholderPanel() {
  async function handleCopyPlaceholder(placeholder: string) {
    try {
      await navigator.clipboard.writeText(placeholder);
      toast.success('Placeholder copied.');
    } catch {
      toast.error('Failed to copy placeholder.');
    }
  }

  return (
    <SectionCard>
      <SectionCardHeader>
        <span className="text-sm font-semibold">Placeholders</span>
      </SectionCardHeader>
      <SectionCardContent>
        <div className="flex flex-col gap-4">
          {NOTIFICATION_PLACEHOLDER_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h3>
              <div className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <Button
                      key={item.key}
                      type="button"
                      variant="outline"
                      className="h-auto items-start justify-between gap-3 px-3 py-2 text-left"
                      onClick={() => void handleCopyPlaceholder(item.key)}
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="break-all font-mono text-[11px]">{item.key}</span>
                      <span className="break-words text-xs text-muted-foreground">{item.description}</span>
                    </div>
                    <CopyIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCardContent>
    </SectionCard>
  );
}
