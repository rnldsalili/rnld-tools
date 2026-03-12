import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { CopyIcon, CheckIcon, HashIcon, RefreshCwIcon, Trash2Icon, ClipboardListIcon } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Separator,
  cn,
} from '@workspace/ui';

import {
  DEFAULT_UUID_OPTIONS,
  UUID_COUNT_MAX,
  UUID_COUNT_MIN,
} from '@/app/constants/uuid-generator';
import { generateBatch } from '@/app/lib/uuid-generator';
import type { UuidOptions } from '@/app/types/uuid-generator';

export const Route = createFileRoute('/(tools)/uuid-generator')({
  head: () => ({ meta: [{ title: 'RTools - UUID Generator' }] }),
  component: UuidGeneratorPage,
});

function UuidGeneratorPage() {
  const [opts, setOpts] = useState<UuidOptions>(DEFAULT_UUID_OPTIONS);
  const [uuids, setUuids] = useState<string[]>(() => generateBatch(DEFAULT_UUID_OPTIONS.count));
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
      {/* Page heading */}
      <div className="flex items-center justify-center size-12 rounded-full bg-accent mb-6">
        <HashIcon className="size-5 text-accent-foreground" />
      </div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Tools</p>
      <h1 className="text-4xl font-bold text-foreground tracking-tight mb-8">UUID Generator</h1>

      {/* Main card */}
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">UUID v4</CardTitle>
          <CardDescription>Cryptographically random, universally unique identifiers.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Controls */}
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="uuid-count" className="text-sm font-medium">
                Count
              </Label>
              <input
                id="uuid-count"
                type="number"
                min={UUID_COUNT_MIN}
                max={UUID_COUNT_MAX}
                value={opts.count}
                onChange={(e) => handleCountChange(e.target.value)}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                )}
              />
            </div>
            <Button onClick={regenerate} className="flex items-center gap-2">
              <RefreshCwIcon className="size-4" />
              Generate
            </Button>
          </div>

          <Separator />

          {/* UUID list */}
          {uuids.length > 0 ? (
            <div className="flex flex-col gap-2">
              {uuids.map((uuid, i) => (
                <div key={uuid + i} className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-xs font-mono text-foreground truncate">
                    {uuid}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyOne(i)}
                    title="Copy"
                    className="shrink-0"
                  >
                    {copiedIndex === i ? (
                      <CheckIcon className="size-3.5 text-primary" />
                    ) : (
                      <CopyIcon className="size-3.5" />
                    )}
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAll}
                  className="flex items-center gap-2 flex-1"
                >
                  {copiedAll ? (
                    <CheckIcon className="size-3.5 text-primary" />
                  ) : (
                    <ClipboardListIcon className="size-3.5" />
                  )}
                  {copiedAll ? 'Copied!' : 'Copy All'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clear}
                  className="flex items-center gap-2"
                >
                  <Trash2Icon className="size-3.5" />
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
