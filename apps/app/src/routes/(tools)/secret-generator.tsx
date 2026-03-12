import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useEffect } from 'react';
import { CopyIcon, RefreshCwIcon, CheckIcon, ShuffleIcon } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Separator,
  Slider,
  cn,
} from '@workspace/ui';

import {
  DEFAULT_SECRET_OPTIONS,
  ENCODING_LABELS,
  SECRET_BYTES_MAX,
  SECRET_BYTES_MIN,
} from '@/app/constants/secret-generator';
import { generateSecret, outputLength } from '@/app/lib/secret-generator';
import type { SecretEncoding, SecretOptions } from '@/app/types/secret-generator';

export const Route = createFileRoute('/(tools)/secret-generator')({
  head: () => ({ meta: [{ title: 'RTools - Secret Generator' }] }),
  component: SecretGeneratorPage,
});

const ENCODINGS: { value: SecretEncoding; label: string }[] = [
  { value: 'base64', label: ENCODING_LABELS.base64 },
  { value: 'base64url', label: ENCODING_LABELS.base64url },
  { value: 'hex', label: ENCODING_LABELS.hex },
];

function SecretGeneratorPage() {
  const [opts, setOpts] = useState<SecretOptions>(DEFAULT_SECRET_OPTIONS);
  const [secret, setSecret] = useState('');
  const [copied, setCopied] = useState(false);

  const regenerate = useCallback(() => {
    setSecret(generateSecret(opts));
  }, [opts]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  function setOpt<K extends keyof SecretOptions>(key: K, value: SecretOptions[K]) {
    setOpts((prev) => ({ ...prev, [key]: value }));
  }

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const outLen = outputLength(opts.bytes, opts.encoding);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      {/* Page heading */}
      <div className="flex items-center justify-center size-12 rounded-full bg-accent mb-6">
        <ShuffleIcon className="size-5 text-accent-foreground" />
      </div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Tools</p>
      <h1 className="text-4xl font-bold text-foreground tracking-tight mb-8">Secret Generator</h1>

      {/* Main card */}
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Generated Secret</CardTitle>
          <CardDescription>
            Cryptographically secure random secret — equivalent to{' '}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              openssl rand -{opts.encoding === 'hex' ? 'hex' : 'base64'} {opts.bytes}
            </code>
            .
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Secret display + action buttons */}
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={secret}
              placeholder="Generating…"
              className={cn(
                'flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono',
                'text-foreground placeholder:text-muted-foreground truncate',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
              )}
            />
            <Button variant="outline" size="icon" onClick={regenerate} title="Regenerate">
              <RefreshCwIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={copySecret}
              disabled={!secret}
              title="Copy to clipboard"
            >
              {copied ? <CheckIcon className="size-4 text-primary" /> : <CopyIcon className="size-4" />}
            </Button>
          </div>

          {/* Output length hint */}
          <p className="text-xs text-muted-foreground -mt-3">
            {opts.bytes} bytes → {outLen} characters
          </p>

          <Separator />

          {/* Byte length control */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="bytes-slider" className="text-sm font-medium">
                Bytes
              </Label>
              <input
                type="number"
                min={SECRET_BYTES_MIN}
                max={SECRET_BYTES_MAX}
                value={opts.bytes}
                onChange={(e) => {
                  const v = Math.min(SECRET_BYTES_MAX, Math.max(SECRET_BYTES_MIN, Number(e.target.value)));
                  if (!isNaN(v)) setOpt('bytes', v);
                }}
                className={cn(
                  'w-14 rounded-md border border-input bg-background px-2 py-1 text-sm text-center',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                )}
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

          {/* Encoding selector */}
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium">Encoding</Label>
            <div className="flex rounded-md border border-input p-0.5 gap-0.5 bg-muted">
              {ENCODINGS.map((enc) => (
                <button
                  key={enc.value}
                  type="button"
                  onClick={() => setOpt('encoding', enc.value)}
                  className={cn(
                    'flex-1 text-xs px-3 py-1.5 rounded-sm font-medium transition-colors duration-150',
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
