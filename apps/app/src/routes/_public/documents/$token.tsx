import { createFileRoute } from '@tanstack/react-router';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { INSTALLMENT_INTERVAL_LABELS } from '@workspace/constants';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  cn,
} from '@workspace/ui';
import { CheckCircleIcon, Loader2Icon, PenLineIcon, XCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useId, useState } from 'react';
import type { PublicDocument } from '@/app/hooks/use-public-document';
import { SignatureCanvas } from '@/app/components/loans/signature-canvas';
import {
  LOAN_DOCUMENT_INSTALLMENTS_PLACEHOLDER,
  LOAN_DOCUMENT_PLACEHOLDER_KEYS,
  LOAN_DOCUMENT_SIGNATURE_PLACEHOLDER,
} from '@/app/lib/document-placeholders';
import {
  PublicDocumentRequestError,
  usePublicDocument,
  useSignPublicDocument,
} from '@/app/hooks/use-public-document';
import {
  collapseFragmentedPlaceholders,
  normalizeTipTapLineBreaks,
} from '@/app/lib/document-content';

export const Route = createFileRoute('/_public/documents/$token')({
  head: () => ({ meta: [{ title: 'Document' }] }),
  staticData: { title: 'Document' },
  component: PublicDocumentPage,
});

const MISSING_PLACEHOLDER_VALUE = '-';
const DISPLAY_LOCALE = 'en-US';
const DISPLAY_TIME_ZONE = 'UTC';

const currencyNumberFormatter = new Intl.NumberFormat(DISPLAY_LOCALE);
const longDateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: DISPLAY_TIME_ZONE,
});
const shortDateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: DISPLAY_TIME_ZONE,
});
const dateTimeFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: DISPLAY_TIME_ZONE,
  timeZoneName: 'short',
});

function formatDisplayNumber(value: number) {
  return currencyNumberFormatter.format(value);
}

function formatDisplayDate(value: string | Date) {
  return longDateFormatter.format(new Date(value));
}

function formatDisplayShortDate(value: string | Date) {
  return shortDateFormatter.format(new Date(value));
}

function formatDisplayDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value));
}

const PUBLIC_DOCUMENT_PLACEHOLDERS: Record<string, (document: PublicDocument) => string> = {
  '{{loan.borrower}}': ({ loan }) => loan.borrower,
  '{{loan.email}}': ({ loan }) => loan.email ?? MISSING_PLACEHOLDER_VALUE,
  '{{loan.phone}}': ({ loan }) => loan.phone ?? MISSING_PLACEHOLDER_VALUE,
  '{{loan.amount}}': ({ loan }) => `${formatDisplayNumber(loan.amount)} ${loan.currency}`,
  '{{loan.currency}}': ({ loan }) => loan.currency,
  '{{loan.interestRate}}': ({ loan }) =>
    loan.interestRate != null ? `${loan.interestRate}%` : MISSING_PLACEHOLDER_VALUE,
  '{{loan.description}}': ({ loan }) => loan.description ?? MISSING_PLACEHOLDER_VALUE,
  '{{loan.createdAt}}': ({ loan }) => formatDisplayDate(loan.createdAt),
  '{{loan.installmentCount}}': ({ loan }) => String(loan.installments.length),
  '{{loan.installmentInterval}}': ({ loan }) =>
    getInstallmentIntervalLabel(loan.installmentInterval as keyof typeof INSTALLMENT_INTERVAL_LABELS),
};

function getInstallmentIntervalLabel(
  installmentInterval: keyof typeof INSTALLMENT_INTERVAL_LABELS,
) {
  return INSTALLMENT_INTERVAL_LABELS[installmentInterval].toLowerCase();
}

function PublicDocumentPage() {
  const { token } = Route.useParams();
  const [isLinkUnavailable, setIsLinkUnavailable] = useState(false);

  const publicDocumentQuery = usePublicDocument(token);
  const signPublicDocumentMutation = useSignPublicDocument();

  const publicDocument = publicDocumentQuery.data?.data;
  const documentTemplate = publicDocument?.document;
  const requiresSignature = documentTemplate?.requiresSignature ?? true;
  const isDocumentSigned = !!publicDocument?.signing.signedAt;
  const isUnavailableError =
    publicDocumentQuery.error instanceof PublicDocumentRequestError &&
    [404, 410].includes(publicDocumentQuery.error.status);

  async function handleConfirm(signatureData?: string) {
    if (!publicDocument) {
      return;
    }

    try {
      await signPublicDocumentMutation.mutateAsync({
        token,
        body: signatureData ? { signatureData } : {},
      });

      await publicDocumentQuery.refetch();
    } catch (error) {
      if (error instanceof PublicDocumentRequestError) {
        if (error.status === 409) {
          await publicDocumentQuery.refetch();
          return;
        }

        if (error.status === 404 || error.status === 410) {
          setIsLinkUnavailable(true);
          return;
        }
      }

      toast.error(error instanceof Error ? error.message : 'Failed to submit document.');
    }
  }

  if (publicDocumentQuery.isLoading) {
    return <PublicDocumentLoadingState />;
  }

  if (isLinkUnavailable || isUnavailableError) {
    return (
      <PublicDocumentUnavailableState description="This document link has expired or is no longer valid." />
    );
  }

  if (publicDocumentQuery.isError || !publicDocument || !documentTemplate) {
    return (
      <PublicDocumentUnavailableState description="An error occurred while loading the document." />
    );
  }

  const renderedDocumentHtml = renderPublicDocumentHTML(publicDocument);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PublicDocumentContentCard title={documentTemplate.name} renderedDocumentHtml={renderedDocumentHtml} />

      {isDocumentSigned ? (
        <PublicDocumentSignedCard publicDocument={publicDocument} />
      ) : (
        <PublicDocumentConfirmationCard
            isPending={signPublicDocumentMutation.isPending}
            requiresSignature={requiresSignature}
            onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

function PublicDocumentLoadingState() {
  return (
    <div className="flex min-h-96 items-center justify-center">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function PublicDocumentUnavailableState({ description }: { description: string }) {
  return (
    <div className="flex min-h-96 items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <XCircleIcon className="mx-auto mb-2 size-10 text-destructive" />
          <CardTitle>Link Unavailable</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function PublicDocumentContentCard({
  title,
  renderedDocumentHtml,
}: {
  title: string;
  renderedDocumentHtml: string;
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
            className={cn(
            'prose prose-sm max-w-none dark:prose-invert',
            '[&_p]:min-h-[1lh] [&_p]:whitespace-pre-wrap',
            '[&_li]:whitespace-pre-wrap',
            '[&_.installments-table]:w-full [&_.installments-table]:border-collapse',
            '[&_.installments-table_th]:border [&_.installments-table_th]:border-border [&_.installments-table_th]:bg-muted [&_.installments-table_th]:px-3 [&_.installments-table_th]:py-2 [&_.installments-table_th]:text-left',
            '[&_.installments-table_td]:border [&_.installments-table_td]:border-border [&_.installments-table_td]:px-3 [&_.installments-table_td]:py-2',
            '[&_.signature-label]:mb-1 [&_.signature-label]:text-xs [&_.signature-label]:text-muted-foreground',
            '[&_.signature-line]:mb-1 [&_.signature-line]:h-12 [&_.signature-line]:w-[200px] [&_.signature-line]:border-b [&_.signature-line]:border-foreground',
            '[&_.signature-image]:mt-2 [&_.signature-image]:h-20 [&_.signature-image]:w-[200px] [&_.signature-image]:object-contain',
          )}
            dangerouslySetInnerHTML={{ __html: renderedDocumentHtml }}
        />
      </CardContent>
    </Card>
  );
}

function PublicDocumentSignedCard({ publicDocument }: { publicDocument: PublicDocument }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircleIcon className="size-5 text-green-600" />
          Document Signed
        </CardTitle>
        <CardDescription>
          This document has been signed by {publicDocument.loan.borrower}.
          {publicDocument.signing.signedAt && (
            <> Signed on {formatDisplayDateTime(publicDocument.signing.signedAt)}.</>
          )}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function PublicDocumentConfirmationCard({
  isPending,
  requiresSignature,
  onConfirm,
}: {
  isPending: boolean;
  requiresSignature: boolean;
  onConfirm: (signatureData?: string) => void;
}) {
  const agreementCheckboxId = useId();
  const [hasConfirmedAgreement, setHasConfirmedAgreement] = useState(false);

  if (requiresSignature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLineIcon className="size-5" />
            Draw Your Signature
          </CardTitle>
          <CardDescription>
            Please draw your signature in the box below to confirm your agreement to the terms
            above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignatureCanvas
              onSave={onConfirm}
              isPending={isPending}
              saveLabel={isPending ? 'Submitting...' : 'Submit Signature'}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircleIcon className="size-5 text-blue-500" />
          Confirm Document
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-3">
          <Checkbox
              id={agreementCheckboxId}
              checked={hasConfirmedAgreement}
              disabled={isPending}
              onCheckedChange={(checked) => setHasConfirmedAgreement(checked === true)}
          />
          <Label
              htmlFor={agreementCheckboxId}
              className="cursor-pointer text-sm leading-normal text-muted-foreground"
          >
            I have read and agree to the document above.
          </Label>
        </div>
        <Button
            onClick={() => {
            if (!hasConfirmedAgreement) {
              return;
            }

            onConfirm();
          }}
            disabled={isPending || !hasConfirmedAgreement}
            className="gap-2"
        >
          {isPending && <Loader2Icon className="size-3.5 animate-spin" />}
          Confirm & Submit
        </Button>
      </CardContent>
    </Card>
  );
}

function buildInstallmentsMarkup(
  installments: PublicDocument['loan']['installments'],
  currency: string,
) {
  if (installments.length === 0) {
    return `<p class="text-muted-foreground">${MISSING_PLACEHOLDER_VALUE}</p>`;
  }

  const installmentRowsMarkup = installments
    .map(
      (installment, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${formatDisplayShortDate(installment.dueDate)}</td>
          <td>${formatDisplayNumber(installment.amount)} ${currency}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <table class="installments-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Due Date</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${installmentRowsMarkup}</tbody>
    </table>
  `;
}

function replaceInstallmentsPlaceholderMarkup(html: string, publicDocument: PublicDocument) {
  const installmentsMarkup = buildInstallmentsMarkup(
    publicDocument.loan.installments,
    publicDocument.loan.currency,
  );

  return html
    .replace(
      /<li>\s*<p(?:\s+[^>]*)?>\s*\{\{loan\.installments\}\}\s*<\/p>\s*<\/li>/g,
      installmentsMarkup,
    )
    .replace(
      new RegExp(`<p(?:\\s+[^>]*)?>\\s*${escapePlaceholderForRegex(LOAN_DOCUMENT_INSTALLMENTS_PLACEHOLDER)}\\s*<\\/p>`, 'g'),
      installmentsMarkup,
    )
    .replaceAll(LOAN_DOCUMENT_INSTALLMENTS_PLACEHOLDER, installmentsMarkup);
}

function buildSignatureMarkup(publicDocument: PublicDocument) {
  const signedAtMarkup = publicDocument.signing.signedAt
    ? `<p class="signature-label">Signed: ${formatDisplayDateTime(publicDocument.signing.signedAt)}</p>`
    : '';
  const signatureBodyMarkup = publicDocument.signing.signatureUrl
    ? `<img src="${publicDocument.signing.signatureUrl}" alt="Borrower signature" class="signature-image" />${signedAtMarkup}`
    : '<div class="signature-line"></div>';

  return `
    <div class="signature-block">
      <p class="signature-label">Borrower&apos;s Signature</p>
      ${signatureBodyMarkup}
      <p class="signature-label">${publicDocument.loan.borrower}</p>
    </div>
  `;
}

function escapePlaceholderForRegex(placeholder: string) {
  return placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceSignaturePlaceholderMarkup(html: string, publicDocument: PublicDocument) {
  const signatureMarkup = buildSignatureMarkup(publicDocument);
  const signaturePlaceholderPattern = escapePlaceholderForRegex(LOAN_DOCUMENT_SIGNATURE_PLACEHOLDER);

  return html
    .replace(
      new RegExp(`<li>\\s*<p(?:\\s+[^>]*)?>\\s*${signaturePlaceholderPattern}\\s*<\\/p>\\s*<\\/li>`, 'g'),
      signatureMarkup,
    )
    .replace(
      new RegExp(`<p(?:\\s+[^>]*)?>\\s*${signaturePlaceholderPattern}\\s*<\\/p>`, 'g'),
      signatureMarkup,
    )
    .replaceAll(LOAN_DOCUMENT_SIGNATURE_PLACEHOLDER, signatureMarkup);
}

function renderPublicDocumentHTML(publicDocument: PublicDocument) {
  if (!publicDocument.document.content) {
    return '';
  }

  const normalizedContent = normalizeTipTapLineBreaks(publicDocument.document.content);

  if (!normalizedContent) {
    return '';
  }

  const placeholderNormalizedContent = collapseFragmentedPlaceholders(
    normalizedContent,
    LOAN_DOCUMENT_PLACEHOLDER_KEYS,
  );

  if (!placeholderNormalizedContent) {
    return '';
  }

  let html = generateHTML(
    placeholderNormalizedContent as Parameters<typeof generateHTML>[0],
    [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] })],
  );

  for (const [placeholder, getValue] of Object.entries(PUBLIC_DOCUMENT_PLACEHOLDERS)) {
    html = html.replaceAll(placeholder, getValue(publicDocument));
  }

  html = replaceInstallmentsPlaceholderMarkup(html, publicDocument);

  return replaceSignaturePlaceholderMarkup(html, publicDocument);
}
