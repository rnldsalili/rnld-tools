import { useState } from 'react';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
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
      throw redirect({ to: '/dashboard' });
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

    router.history.push(resolveLoginDestination(next));
  }

  return (
    <BasicLayout>
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>Enter your email and password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FieldGroup>
                <Field data-invalid={!!error && !email ? true : undefined}>
                  <FieldLabel htmlFor="email">Email <span className="text-destructive">*</span></FieldLabel>
                  <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isPending}
                  />
                </Field>
                <Field data-invalid={!!error && !password ? true : undefined}>
                  <FieldLabel htmlFor="password">Password <span className="text-destructive">*</span></FieldLabel>
                  <PasswordInput
                      id="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isPending}
                  />
                </Field>
              </FieldGroup>

              {error && <FieldError>{error}</FieldError>}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </BasicLayout>
  );
}

function resolveLoginDestination(next: string | undefined) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard';
  }

  try {
    const parsed = new URL(next, 'https://rtools.local');
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/dashboard';
  }
}
