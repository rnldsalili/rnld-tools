import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { CheckIcon, CopyIcon, RefreshCwIcon, ShieldCheckIcon } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Separator,
  Slider,
  cn,
} from '@workspace/ui';

import type { PasswordOptions } from '@/app/types/password-generator';
import {
  DEFAULT_PASSWORD_OPTIONS,
  PASSWORD_LENGTH_MAX,
  PASSWORD_LENGTH_MIN,
  STRENGTH_COLORS,
  STRENGTH_TEXT,
} from '@/app/constants/password-generator';
import { calcStrength, generatePassword } from '@/app/lib/password-generator';

export const Route = createFileRoute('/(tools)/password-generator')({
  head: () => ({ meta: [{ title: 'RTools - Password Generator' }] }),
  staticData: { title: 'Password Generator' },
  component: PasswordGeneratorPage,
});

function PasswordGeneratorPage() {
  const [opts, setOpts] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_PASSWORD_OPTIONS));
  const [copied, setCopied] = useState(false);

  function regenerate() {
    setPassword(generatePassword(opts));
  }

  const strength = calcStrength(opts);
  const hasAtLeastOne = opts.uppercase || opts.lowercase || opts.numbers || opts.symbols;

  function setOpt<TKey extends keyof PasswordOptions>(key: TKey, value: PasswordOptions[TKey]) {
    const newOpts = { ...opts, [key]: value };
    setOpts(newOpts);
    setPassword(generatePassword(newOpts));
  }

  async function copyPassword() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      {/* Page heading */}
      <div className="flex items-center justify-center size-12 rounded-full bg-accent mb-6">
        <ShieldCheckIcon className="size-5 text-accent-foreground" />
      </div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Tools</p>
      <h1 className="text-4xl font-bold text-foreground tracking-tight mb-8">Password Generator</h1>

      {/* Main card */}
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Generated Password</CardTitle>
          <CardDescription>Click the refresh icon to generate a new one.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Password display + action buttons */}
          <div className="flex items-center gap-2">
            <input
                readOnly
                value={password}
                placeholder={hasAtLeastOne ? 'Generating…' : 'Select at least one character type'}
                className={cn(
                'flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono',
                'text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                !hasAtLeastOne && 'opacity-50',
              )}
            />
            <Button
                variant="outline"
                size="icon"
                onClick={regenerate}
                disabled={!hasAtLeastOne}
                title="Regenerate"
            >
              <RefreshCwIcon className="size-4" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                onClick={copyPassword}
                disabled={!password}
                title="Copy to clipboard"
            >
              {copied ? <CheckIcon className="size-4 text-primary" /> : <CopyIcon className="size-4" />}
            </Button>
          </div>

          {/* Strength bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Strength</span>
              <span className={cn('font-medium', STRENGTH_TEXT[strength.label])}>{strength.label}</span>
            </div>
            <div className="flex gap-1 h-1.5">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                    key={i}
                    className={cn(
                    'flex-1 rounded-full transition-colors duration-300',
                    i < strength.score ? STRENGTH_COLORS[strength.label] : 'bg-muted',
                  )}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Length control */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="length-slider" className="text-sm font-medium">
                Length
              </Label>
              <input
                  type="number"
                  min={PASSWORD_LENGTH_MIN}
                  max={PASSWORD_LENGTH_MAX}
                  value={opts.length}
                  onChange={(e) => {
                  const v = Math.min(PASSWORD_LENGTH_MAX, Math.max(PASSWORD_LENGTH_MIN, Number(e.target.value)));
                  if (!isNaN(v)) setOpt('length', v);
                }}
                  className={cn(
                  'w-14 rounded-md border border-input bg-background px-2 py-1 text-sm text-center',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                )}
              />
            </div>
            <Slider
                id="length-slider"
                min={PASSWORD_LENGTH_MIN}
                max={PASSWORD_LENGTH_MAX}
                value={[opts.length]}
                onValueChange={([v]) => setOpt('length', v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{PASSWORD_LENGTH_MIN}</span>
              <span>{PASSWORD_LENGTH_MAX}</span>
            </div>
          </div>

          <Separator />

          {/* Character type options */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Character Types</p>
            <div className="grid grid-cols-2 gap-3">
              <CheckboxOption
                  id="uppercase"
                  label="Uppercase (A–Z)"
                  checked={opts.uppercase}
                  onCheckedChange={(v) => setOpt('uppercase', v)}
              />
              <CheckboxOption
                  id="lowercase"
                  label="Lowercase (a–z)"
                  checked={opts.lowercase}
                  onCheckedChange={(v) => setOpt('lowercase', v)}
              />
              <CheckboxOption
                  id="numbers"
                  label="Numbers (0–9)"
                  checked={opts.numbers}
                  onCheckedChange={(v) => setOpt('numbers', v)}
              />
              <CheckboxOption
                  id="symbols"
                  label="Symbols (!@#…)"
                  checked={opts.symbols}
                  onCheckedChange={(v) => setOpt('symbols', v)}
              />
            </div>
            {!hasAtLeastOne && (
              <p className="text-xs text-destructive">Select at least one character type.</p>
            )}
          </div>

          <Separator />

          {/* Advanced options */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Advanced</p>
            <CheckboxOption
                id="exclude-ambiguous"
                label="Exclude ambiguous characters (0, O, l, 1, I)"
                checked={opts.excludeAmbiguous}
                onCheckedChange={(v) => setOpt('excludeAmbiguous', v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface CheckboxOptionProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function CheckboxOption({ id, label, checked, onCheckedChange }: CheckboxOptionProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(!!v)} />
      <Label htmlFor={id} className="text-sm font-normal cursor-pointer leading-none">
        {label}
      </Label>
    </div>
  );
}
