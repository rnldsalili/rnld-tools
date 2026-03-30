import { useEffect, useMemo, useState } from 'react';
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { authClient } from '@workspace/auth-client';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  PasswordInput,
} from '@workspace/ui';
import { resolveDefaultAuthenticatedDestination } from '@/app/lib/default-authenticated-route';
import { BasicLayout } from '@/app/layouts/basic-layout';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const GENERIC_EMAIL_SENT_MESSAGE = 'If the email exists in our system, we sent a verification code.';

type ForgotPasswordStep = 'email' | 'otp' | 'password';

export const Route = createFileRoute('/forgot-password')({
  ssr: false,
  head: () => ({ meta: [{ title: 'RTools - Forgot Password' }] }),
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();

    if (session?.user) {
      const destination = await resolveDefaultAuthenticatedDestination();
      throw redirect({ to: destination });
    }
  },
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<ForgotPasswordStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);

  useEffect(() => {
    if (!resendAvailableAt || resendAvailableAt <= Date.now()) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextCurrentTime = Date.now();
      setCurrentTime(nextCurrentTime);

      if (nextCurrentTime >= resendAvailableAt) {
        window.clearInterval(intervalId);
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [resendAvailableAt]);

  const resendCountdownSeconds = resendAvailableAt
    ? Math.max(0, Math.ceil((resendAvailableAt - currentTime) / 1000))
    : 0;

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const { error: requestError } = await authClient.emailOtp.requestPasswordReset({
      email: normalizedEmail,
    });

    setIsPending(false);

    if (requestError) {
      const message = getRequestResetErrorMessage(requestError);
      setError(message);
      toast.error(message);
      return;
    }

    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('otp');
    startResendCooldown();
    toast.success(GENERIC_EMAIL_SENT_MESSAGE);
  }

  async function handleOtpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const { error: verificationError } = await authClient.emailOtp.checkVerificationOtp({
      email: normalizedEmail,
      otp: otp.trim(),
      type: 'forget-password',
    });

    setIsPending(false);

    if (verificationError) {
      const message = getOtpVerificationErrorMessage(verificationError);
      setError(message);
      toast.error(message);
      return;
    }

    setStep('password');
    toast.success('Code verified. Set your new password.');
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      const mismatchMessage = 'Passwords do not match.';
      setError(mismatchMessage);
      toast.error(mismatchMessage);
      return;
    }

    setIsPending(true);

    const { error: resetError } = await authClient.emailOtp.resetPassword({
      email: normalizedEmail,
      otp: otp.trim(),
      password: newPassword,
    });

    setIsPending(false);

    if (resetError) {
      const message = getResetPasswordErrorMessage(resetError);
      setError(message);
      toast.error(message);
      return;
    }

    toast.success('Password updated. Please sign in.');
    await router.navigate({ to: '/login', replace: true });
  }

  async function handleResendCode() {
    if (isPending || resendCountdownSeconds > 0) {
      return;
    }

    setError(null);
    setIsPending(true);

    const { error: resendError } = await authClient.emailOtp.requestPasswordReset({
      email: normalizedEmail,
    });

    setIsPending(false);

    if (resendError) {
      const message = getRequestResetErrorMessage(resendError);
      setError(message);
      toast.error(message);
      return;
    }

    startResendCooldown();
    toast.success(GENERIC_EMAIL_SENT_MESSAGE);
  }

  function startResendCooldown() {
    const nextAvailableAt = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    setCurrentTime(Date.now());
    setResendAvailableAt(nextAvailableAt);
  }

  function handleUseDifferentEmail() {
    setStep('email');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setResendAvailableAt(null);
  }

  return (
    <BasicLayout>
      <div className="relative min-h-screen overflow-hidden bg-background">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -left-8 bottom-0 h-56 w-56 rounded-full bg-muted/80 blur-3xl" />
          <div className="absolute right-0 top-24 h-48 w-48 rounded-full bg-primary/8 blur-3xl" />
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
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {getStepLabel(step)}
                </p>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  {getStepTitle(step)}
                </CardTitle>
                <CardDescription className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {getStepDescription(step, normalizedEmail)}
                </CardDescription>
              </CardHeader>

              <CardContent className="relative px-6 pt-6 pb-7 sm:px-7">
                {step === 'email' ? (
                  <form onSubmit={(event) => void handleEmailSubmit(event)} className="flex flex-col gap-5">
                    <FieldGroup className="gap-4">
                      <Field data-invalid={!!error && normalizedEmail.length === 0 ? true : undefined}>
                        <FieldLabel htmlFor="forgot-password-email">
                          Email <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                            id="forgot-password-email"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(event) => {
                              setEmail(event.target.value);
                              if (error) {
                                setError(null);
                              }
                            }}
                            disabled={isPending}
                            className="h-10 rounded-lg border-border/70 bg-background/75 px-3 text-sm shadow-sm shadow-black/3 transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/80 hover:border-border focus-visible:border-primary/40 focus-visible:ring-primary/15 dark:bg-background/45 dark:shadow-black/10"
                        />
                        <FieldDescription>
                          We’ll send a one-time password if the email is recognized.
                        </FieldDescription>
                      </Field>
                    </FieldGroup>

                    {error ? (
                      <FieldError className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm leading-relaxed">
                        {error}
                      </FieldError>
                    ) : null}

                    <Button
                        type="submit"
                        className="h-10 w-full rounded-lg text-sm font-medium shadow-[0_16px_36px_-20px_rgba(66,118,74,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(66,118,74,0.62)]"
                        disabled={isPending || normalizedEmail.length === 0}
                    >
                      {isPending ? 'Sending code…' : 'Send verification code'}
                    </Button>
                  </form>
                ) : null}

                {step === 'otp' ? (
                  <form onSubmit={(event) => void handleOtpSubmit(event)} className="flex flex-col gap-5">
                    <FieldGroup className="gap-4">
                      <Field data-invalid={!!error && otp.trim().length === 0 ? true : undefined}>
                        <FieldLabel htmlFor="forgot-password-otp">
                          Verification code <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                            id="forgot-password-otp"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="123456"
                            maxLength={OTP_LENGTH}
                            required
                            value={otp}
                            onChange={(event) => {
                              setOtp(event.target.value.replaceAll(/\D/g, '').slice(0, OTP_LENGTH));
                              if (error) {
                                setError(null);
                              }
                            }}
                            disabled={isPending}
                            className="h-10 rounded-lg border-border/70 bg-background/75 px-3 text-sm tracking-[0.24em] shadow-sm shadow-black/3 transition-[border-color,box-shadow,background-color] placeholder:tracking-normal placeholder:text-muted-foreground/80 hover:border-border focus-visible:border-primary/40 focus-visible:ring-primary/15 dark:bg-background/45 dark:shadow-black/10"
                        />
                        <FieldDescription>
                          Enter the {OTP_LENGTH}-digit code sent to <span className="font-medium text-foreground">{normalizedEmail}</span>.
                        </FieldDescription>
                      </Field>
                    </FieldGroup>

                    {error ? (
                      <FieldError className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm leading-relaxed">
                        {error}
                      </FieldError>
                    ) : null}

                    <Button
                        type="submit"
                        className="h-10 w-full rounded-lg text-sm font-medium shadow-[0_16px_36px_-20px_rgba(66,118,74,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(66,118,74,0.62)]"
                        disabled={isPending || otp.trim().length !== OTP_LENGTH}
                    >
                      {isPending ? 'Verifying code…' : 'Verify code'}
                    </Button>

                    <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <Button
                          type="button"
                          variant="ghost"
                          className="justify-start px-0 text-muted-foreground hover:bg-transparent"
                          onClick={handleUseDifferentEmail}
                          disabled={isPending}
                      >
                        Use a different email
                      </Button>
                      <Button
                          type="button"
                          variant="ghost"
                          className="justify-start px-0"
                          onClick={() => void handleResendCode()}
                          disabled={isPending || resendCountdownSeconds > 0}
                      >
                        {resendCountdownSeconds > 0
                          ? `Resend code in ${resendCountdownSeconds}s`
                          : 'Resend code'}
                      </Button>
                    </div>
                  </form>
                ) : null}

                {step === 'password' ? (
                  <form onSubmit={(event) => void handlePasswordSubmit(event)} className="flex flex-col gap-5">
                    <FieldGroup className="gap-4">
                      <Field data-invalid={!!error && newPassword.trim().length === 0 ? true : undefined}>
                        <FieldLabel htmlFor="forgot-password-new-password">
                          New password <span className="text-destructive">*</span>
                        </FieldLabel>
                        <PasswordInput
                            id="forgot-password-new-password"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            required
                            value={newPassword}
                            onChange={(event) => {
                              setNewPassword(event.target.value);
                              if (error) {
                                setError(null);
                              }
                            }}
                            disabled={isPending}
                            className="h-10 rounded-lg border-border/70 bg-background/75 px-3 text-sm shadow-sm shadow-black/3 transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/80 hover:border-border focus-visible:border-primary/40 focus-visible:ring-primary/15 dark:bg-background/45 dark:shadow-black/10"
                        />
                      </Field>

                      <Field data-invalid={!!error && confirmPassword.trim().length === 0 ? true : undefined}>
                        <FieldLabel htmlFor="forgot-password-confirm-password">
                          Confirm new password <span className="text-destructive">*</span>
                        </FieldLabel>
                        <PasswordInput
                            id="forgot-password-confirm-password"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            required
                            value={confirmPassword}
                            onChange={(event) => {
                              setConfirmPassword(event.target.value);
                              if (error) {
                                setError(null);
                              }
                            }}
                            disabled={isPending}
                            className="h-10 rounded-lg border-border/70 bg-background/75 px-3 text-sm shadow-sm shadow-black/3 transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/80 hover:border-border focus-visible:border-primary/40 focus-visible:ring-primary/15 dark:bg-background/45 dark:shadow-black/10"
                        />
                      </Field>
                    </FieldGroup>

                    {error ? (
                      <FieldError className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm leading-relaxed">
                        {error}
                      </FieldError>
                    ) : null}

                    <Button
                        type="submit"
                        className="h-10 w-full rounded-lg text-sm font-medium shadow-[0_16px_36px_-20px_rgba(66,118,74,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(66,118,74,0.62)]"
                        disabled={isPending || newPassword.trim().length === 0 || confirmPassword.trim().length === 0}
                    >
                      {isPending ? 'Updating password…' : 'Update password'}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        className="justify-start px-0 text-muted-foreground hover:bg-transparent"
                        onClick={() => setStep('otp')}
                        disabled={isPending}
                    >
                      Back to code verification
                    </Button>
                  </form>
                ) : null}

                <div className="mt-6 border-t border-border/60 pt-5 text-sm text-muted-foreground">
                  Remembered your password?{' '}
                  <Link to="/login" className="font-medium text-primary transition-colors hover:text-primary/80">
                    Return to login
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </BasicLayout>
  );
}

function getStepLabel(step: ForgotPasswordStep) {
  if (step === 'email') {
    return 'Step 1 of 3';
  }

  if (step === 'otp') {
    return 'Step 2 of 3';
  }

  return 'Step 3 of 3';
}

function getStepTitle(step: ForgotPasswordStep) {
  if (step === 'email') {
    return 'Forgot your password?';
  }

  if (step === 'otp') {
    return 'Verify your email';
  }

  return 'Set a new password';
}

function getStepDescription(step: ForgotPasswordStep, email: string) {
  if (step === 'email') {
    return 'Enter your email address and we’ll send a one-time password to continue.';
  }

  if (step === 'otp') {
    return email
      ? `Enter the verification code sent to ${email}.`
      : 'Enter the verification code from your email.';
  }

  return 'Create a new password for your account, then return to the login screen.';
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getRequestResetErrorMessage(error: unknown) {
  const errorCode = getErrorCode(error);

  if (errorCode === 'INVALID_EMAIL') {
    return 'Enter a valid email address.';
  }

  return 'Unable to send a verification code right now. Please try again.';
}

function getOtpVerificationErrorMessage(error: unknown) {
  const errorCode = getErrorCode(error);

  if (errorCode === 'OTP_EXPIRED') {
    return 'That code has expired. Request a new code and try again.';
  }

  if (errorCode === 'TOO_MANY_ATTEMPTS') {
    return 'Too many incorrect attempts. Request a new code and try again.';
  }

  if (errorCode === 'INVALID_OTP' || errorCode === 'USER_NOT_FOUND') {
    return 'Enter the 6-digit code from your email and try again.';
  }

  return 'Unable to verify that code right now. Please try again.';
}

function getResetPasswordErrorMessage(error: unknown) {
  const errorCode = getErrorCode(error);
  const errorMessage = getErrorMessage(error);

  if (errorCode === 'INVALID_OTP' || errorCode === 'OTP_EXPIRED') {
    return 'Your verification code is no longer valid. Request a new code and try again.';
  }

  if (errorCode === 'TOO_MANY_ATTEMPTS') {
    return 'Too many incorrect attempts. Request a new code and try again.';
  }

  if (errorCode === 'PASSWORD_TOO_SHORT' || errorCode === 'PASSWORD_TOO_LONG') {
    return errorMessage ?? 'Choose a password that meets the password requirements.';
  }

  return errorMessage ?? 'Unable to update your password right now. Please try again.';
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return null;
  }

  return typeof error.code === 'string' ? error.code : null;
}

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return null;
  }

  return typeof error.message === 'string' ? error.message : null;
}
