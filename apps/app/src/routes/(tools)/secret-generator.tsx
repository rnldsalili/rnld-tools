import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { CheckIcon, CopyIcon, RefreshCwIcon } from 'lucide-react';
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
  Slider,
  cn,
} from '@workspace/ui';

import type { SecretEncoding, SecretOptions } from '@/app/types/secret-generator';
import { ToolPageHeader } from '@/app/components/tools/tool-page-header';
import {
  DEFAULT_SECRET_OPTIONS,
  ENCODING_LABELS,
  SECRET_BYTES_MAX,
  SECRET_BYTES_MIN,
} from '@/app/constants/secret-generator';
import { generateSecret, outputLength } from '@/app/lib/secret-generator';

export const Route = createFileRoute('/(tools)/secret-generator')({
  head: () => ({ meta: [{ title: 'RTools - Secret Generator' }] }),
  staticData: { title: 'Secret Generator' },
  component: SecretGeneratorPage,
});

const ENCODINGS: Array<{ value: SecretEncoding; label: string }> = [
  { value: 'base64', label: ENCODING_LABELS.base64 },
  { value: 'base64url', label: ENCODING_LABELS.base64url },
  { value: 'hex', label: ENCODING_LABELS.hex },
];

function SecretGeneratorPage() {
  const [opts, setOpts] = useState<SecretOptions>(DEFAULT_SECRET_OPTIONS);
  const [secret, setSecret] = useState(() => generateSecret(DEFAULT_SECRET_OPTIONS));
  const [copied, setCopied] = useState(false);

  function regenerate() {
    setSecret(generateSecret(opts));
  }

  function setOpt<TKey extends keyof SecretOptions>(key: TKey, value: SecretOptions[TKey]) {
    const newOpts = { ...opts, [key]: value };
    setOpts(newOpts);
    setSecret(generateSecret(newOpts));
  }

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const outLen = outputLength(opts.bytes, opts.encoding);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
      <ToolPageHeader href="/secret-generator" />

      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Generated Secret</CardTitle>
          <CardDescription>
            Cryptographically secure random secret — equivalent to{' '}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              openssl rand -{opts.encoding === 'hex' ? 'hex' : 'base64'} {opts.bytes}
            </code>{'.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
                readOnly
                value={secret}
                placeholder="Generating…"
                className={cn(
                'flex-1 bg-muted font-mono',
                'text-foreground placeholder:text-muted-foreground',
                'break-all sm:truncate',
              )}
            />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-none">
              <Button variant="outline" onClick={regenerate} title="Regenerate" className="w-full sm:size-8 sm:px-0">
                <RefreshCwIcon data-icon="inline-start" />
                <span className="sm:sr-only">Regenerate</span>
              </Button>
              <Button
                  variant="outline"
                  onClick={copySecret}
                  disabled={!secret}
                  title="Copy to clipboard"
                  className="w-full sm:size-8 sm:px-0"
              >
                {copied ? <CheckIcon data-icon="inline-start" className="text-primary" /> : <CopyIcon data-icon="inline-start" />}
                <span className="sm:sr-only">Copy</span>
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground -mt-3">
            {opts.bytes} bytes → {outLen} characters
          </p>

          <Separator />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="bytes-slider" className="text-sm font-medium">
                Bytes
              </Label>
              <Input
                  type="number"
                  min={SECRET_BYTES_MIN}
                  max={SECRET_BYTES_MAX}
                  value={opts.bytes}
                  onChange={(e) => {
                  const v = Math.min(SECRET_BYTES_MAX, Math.max(SECRET_BYTES_MIN, Number(e.target.value)));
                  if (!isNaN(v)) setOpt('bytes', v);
                }}
                  className="w-20 text-center tabular-nums sm:w-14"
              />
            </div>
            <Slider
                id="bytes-slider"
                min={SECRET_BYTES_MIN}
                max={SECRET_BYTES_MAX}
                value={[opts.bytes]}
                onValueChange={([v]) => setOpt('bytes', v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{SECRET_BYTES_MIN}</span>
              <span>{SECRET_BYTES_MAX}</span>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium">Encoding</Label>
            <div className="grid grid-cols-1 gap-2 rounded-md border border-input bg-muted p-1 sm:grid-cols-3 sm:gap-0.5 sm:p-0.5">
              {ENCODINGS.map((enc) => (
                <button
                    key={enc.value}
                    type="button"
                    onClick={() => setOpt('encoding', enc.value)}
                    className={cn(
                    'min-h-10 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 sm:min-h-8 sm:px-3 sm:py-1.5 sm:text-xs',
                    opts.encoding === enc.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {enc.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
