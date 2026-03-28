import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { CheckIcon, ClipboardListIcon, CopyIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
} from '@workspace/ui';

import type { UuidOptions } from '@/app/types/uuid-generator';
import { ToolPageHeader } from '@/app/components/tools/tool-page-header';
import {
  DEFAULT_UUID_OPTIONS,
  UUID_COUNT_MAX,
  UUID_COUNT_MIN,
} from '@/app/constants/uuid-generator';
import { generateBatch } from '@/app/lib/uuid-generator';

export const Route = createFileRoute('/(tools)/uuid-generator')({
  head: () => ({ meta: [{ title: 'RTools - UUID Generator' }] }),
  staticData: { title: 'UUID Generator' },
  component: UuidGeneratorPage,
});

function UuidGeneratorPage() {
  const [opts, setOpts] = useState<UuidOptions>(DEFAULT_UUID_OPTIONS);
  const [uuids, setUuids] = useState<Array<string>>(() => generateBatch(DEFAULT_UUID_OPTIONS.count));
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const regenerate = useCallback(() => {
    setUuids(generateBatch(opts.count));
    setCopiedIndex(null);
    setCopiedAll(false);
  }, [opts.count]);

  function handleCountChange(raw: string) {
    const v = Math.min(UUID_COUNT_MAX, Math.max(UUID_COUNT_MIN, Number(raw)));
    if (!isNaN(v)) setOpts((prev) => ({ ...prev, count: v }));
  }

  async function copyOne(index: number) {
    await navigator.clipboard.writeText(uuids[index]);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(uuids.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  function clear() {
    setUuids([]);
    setCopiedIndex(null);
    setCopiedAll(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <ToolPageHeader href="/uuid-generator" />

      {/* Main card */}
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">UUID v4</CardTitle>
          <CardDescription>Cryptographically random, universally unique identifiers.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="uuid-count" className="text-sm font-medium">
                Count
              </Label>
              <Input
                  id="uuid-count"
                  type="number"
                  min={UUID_COUNT_MIN}
                  max={UUID_COUNT_MAX}
                  value={opts.count}
                  onChange={(e) => handleCountChange(e.target.value)}
                  className="w-full tabular-nums"
              />
            </div>
            <Button onClick={regenerate} className="w-full sm:w-auto">
              <RefreshCwIcon data-icon="inline-start" />
              Generate
            </Button>
          </div>

          <Separator />

          {/* UUID list */}
          {uuids.length > 0 ? (
            <div className="flex flex-col gap-2">
              {uuids.map((uuid, i) => (
                <div key={uuid + i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 rounded-md border border-input bg-muted px-3 py-3 text-sm font-mono text-foreground break-all sm:px-3 sm:py-2 sm:text-xs sm:truncate">
                    {uuid}
                  </code>
                  <Button
                      variant="outline"
                      onClick={() => copyOne(i)}
                      title="Copy"
                      className="w-full sm:size-8 sm:w-8 sm:px-0"
                  >
                    {copiedIndex === i ? (
                      <CheckIcon data-icon="inline-start" className="text-primary" />
                    ) : (
                      <CopyIcon data-icon="inline-start" />
                    )}
                    <span className="sm:sr-only">Copy</span>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No UUIDs generated yet. Click Generate to create some.
            </p>
          )}

          {/* Bulk actions */}
          {uuids.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                    variant="outline"
                    onClick={copyAll}
                    className="flex-1"
                >
                  {copiedAll ? (
                    <CheckIcon data-icon="inline-start" className="text-primary" />
                  ) : (
                    <ClipboardListIcon data-icon="inline-start" />
                  )}
                  {copiedAll ? 'Copied!' : 'Copy All'}
                </Button>
                <Button
                    variant="outline"
                    onClick={clear}
                    className="flex-1 sm:flex-none"
                >
                  <Trash2Icon data-icon="inline-start" />
                  Clear
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
