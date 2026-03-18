import { Loader2Icon, SearchIcon } from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@workspace/ui';
import type { NotificationTemplateListItem } from '@/app/hooks/use-notifications';
import { getNotificationChannelLabel } from '@/app/components/settings/notifications/utils';

interface NotificationTemplateLibraryProps {
  templates: Array<NotificationTemplateListItem>;
  isLoading?: boolean;
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
}

export function NotificationTemplateLibrary({
  templates,
  isLoading = false,
  selectedTemplateId,
  onSelectTemplate,
}: NotificationTemplateLibraryProps) {
  const [searchInput, setSearchInput] = useState('');
  const normalizedSearch = searchInput.trim().toLowerCase();
  const filteredTemplates = normalizedSearch
    ? templates.filter((template) => {
        const searchableText = [
          template.name,
          template.description ?? '',
          template.channel,
        ].join(' ').toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
    : templates;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Template Library</CardTitle>
        <CardDescription>
          Manage rich Email templates and plain-text SMS templates.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search templates"
              className="pl-9"
          />
        </div>

        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => {
              const isSelected = template.id === selectedTemplateId;

              return (
                <button
                    key={template.id}
                    type="button"
                    onClick={() => onSelectTemplate(template.id)}
                    className={`flex flex-col gap-2 rounded-lg border px-3 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{template.name}</span>
                    <Badge variant="secondary">{getNotificationChannelLabel(template.channel)}</Badge>
                  </div>
                  {template.description ? (
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No notification templates found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
