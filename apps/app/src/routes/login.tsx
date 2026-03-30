import { useState } from 'react';
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { z } from 'zod';
import { toast } from 'sonner';
import { authClient, signIn } from '@workspace/auth-client';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  PasswordInput,
} from '@workspace/ui';
import { resolveDefaultAuthenticatedDestination } from '@/app/lib/default-authenticated-route';
import { BasicLayout } from '@/app/layouts/basic-layout';

export const Route = createFileRoute('/login')({
  ssr: false,
  head: () => ({ meta: [{ title: 'RTools - Login' }] }),
  validateSearch: z.object({
    next: z.string().optional(),
  }),
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session?.user) {
      const destination = await resolveLoginDestination();
      throw redirect({ to: destination });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const { next } = Route.useSearch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const { error: signInError } = await signIn.email({ email, password });

    setIsPending(false);

    if (signInError) {
      const message = signInError.message ?? 'Login failed. Please try again.';
      setError(message);
      toast.error(message);
      return;
    }

    const destination = await resolveLoginDestination(next);
    router.history.push(destination);
  }

  return (
    <BasicLayout>
      <div className="relative min-h-screen overflow-hidden bg-background">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-4 -bottom-12 h-56 w-56 rounded-full bg-muted/80 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.45)_48%,transparent_100%)] dark:bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.03)_48%,transparent_100%)]" />
        </div>

        <div className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
          <div className="relative w-full max-w-md">
            <div
                aria-hidden="true"
                className="absolute inset-x-8 -top-8 h-24 rounded-full bg-primary/12 blur-3xl"
            />

            <Card className="relative w-full overflow-hidden border border-border/70 bg-background/85 py-0 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)] backdrop-blur-xl dark:shadow-[0_32px_100px_-46px_rgba(0,0,0,0.65)]">
              <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/55 to-transparent"
              />
              <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-primary/9 via-primary/3 to-transparent"
              />

              <CardHeader className="relative gap-2 border-b border-border/60 px-6 pt-7 pb-5 sm:px-7">
                <CardTitle className="text-xl font-semibold tracking-tight">Sign in</CardTitle>
                <CardDescription className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Enter your email and password to continue.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative px-6 pt-6 pb-7 sm:px-7">
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <FieldGroup className="gap-4">
                    <Field
                        className="gap-2.5"
                        data-invalid={!!error && !email ? true : undefined}
                    >
                      <FieldLabel
                          htmlFor="email"
                          className="text-[0.78rem] font-medium tracking-[0.01em]"
                      >
                        Email <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isPending}
                          className="h-10 rounded-lg border-border/70 bg-background/75 px-3 text-sm shadow-sm shadow-black/3 transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/80 hover:border-border focus-visible:border-primary/40 focus-visible:ring-primary/15 dark:bg-background/45 dark:shadow-black/10"
                      />
                    </Field>
                    <Field
                        className="gap-2.5"
                        data-invalid={!!error && !password ? true : undefined}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <FieldLabel
                            htmlFor="password"
                            className="text-[0.78rem] font-medium tracking-[0.01em]"
                        >
                          Password <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Link
                            to="/forgot-password"
                            className="text-[0.78rem] font-medium text-primary transition-colors hover:text-primary/80"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <PasswordInput
                          id="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isPending}
                          className="h-10 rounded-lg border-border/70 bg-background/75 px-3 text-sm shadow-sm shadow-black/3 transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/80 hover:border-border focus-visible:border-primary/40 focus-visible:ring-primary/15 dark:bg-background/45 dark:shadow-black/10"
                      />
                    </Field>
                  </FieldGroup>

                  {error && (
                    <FieldError className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm leading-relaxed">
                      {error}
                    </FieldError>
                  )}

                  <Button
                      type="submit"
                      className="h-10 w-full rounded-lg text-sm font-medium shadow-[0_16px_36px_-20px_rgba(66,118,74,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(66,118,74,0.62)]"
                      disabled={isPending}
                  >
                    {isPending ? 'Signing in…' : 'Sign in'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </BasicLayout>
  );
}

async function resolveLoginDestination(next?: string) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return resolveDefaultAuthenticatedDestination();
  }

  try {
    const parsed = new URL(next, 'https://rtools.local');
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return resolveDefaultAuthenticatedDestination();
  }
}
