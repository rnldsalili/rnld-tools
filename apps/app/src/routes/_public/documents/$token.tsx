import { createFileRoute } from '@tanstack/react-router';
import { renderLoanDocumentHtml } from '@workspace/document-renderer';
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
import { useEffect, useId, useState } from 'react';
import type { PublicDocument } from '@/app/hooks/use-public-document';
import { SignatureCanvas } from '@/app/components/loans/signature-canvas';
import {
  PublicDocumentRequestError,
  usePublicDocument,
  useSignPublicDocument,
} from '@/app/hooks/use-public-document';

export const Route = createFileRoute('/_public/documents/$token')({
  head: () => ({ meta: [{ title: 'Document' }] }),
  staticData: { title: 'Document' },
  component: PublicDocumentPage,
});

const DISPLAY_LOCALE = 'en-US';
const DISPLAY_TIME_ZONE = 'Asia/Manila';
const DISPLAY_TIME_ZONE_LABEL = 'PHT';

const dateTimeFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: DISPLAY_TIME_ZONE,
});

function formatDisplayDateTime(value: string | Date) {
  return `${dateTimeFormatter.format(new Date(value))} ${DISPLAY_TIME_ZONE_LABEL}`;
}

function getPublicDocumentPageTitle(documentName?: string, clientName?: string) {
  if (!documentName || !clientName) {
    return 'Document';
  }

  return `${documentName} - ${clientName}`;
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

  useEffect(() => {
    document.title = getPublicDocumentPageTitle(documentTemplate?.name, publicDocument?.loan.client.name);
  }, [documentTemplate?.name, publicDocument?.loan.client.name]);

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

  const renderedDocumentHtml = publicDocument.signing.contentSnapshotHtml ?? renderLoanDocumentHtml({
    content: publicDocument.document.content,
    loan: {
      amount: publicDocument.loan.amount,
      address: publicDocument.loan.client.address ?? null,
      borrower: publicDocument.loan.client.name,
      currency: publicDocument.loan.currency,
      description: publicDocument.loan.description ?? null,
      email: publicDocument.loan.client.email ?? null,
      installmentInterval: publicDocument.loan.installmentInterval,
      installments: publicDocument.loan.installments.map((installment: PublicDocument['loan']['installments'][number]) => ({
        amount: installment.amount,
        dueDate: installment.dueDate,
      })),
      interestRate: publicDocument.loan.interestRate ?? null,
      loanDate: publicDocument.loan.loanDate,
      phone: publicDocument.loan.client.phone ?? null,
    },
    signatureDataUrl: publicDocument.signing.signatureUrl ?? null,
    signedAt: publicDocument.signing.signedAt ?? null,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PublicDocumentContentCard renderedDocumentHtml={renderedDocumentHtml} />

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

function PublicDocumentContentCard({ renderedDocumentHtml }: { renderedDocumentHtml: string }) {
  return (
    <Card className="mb-6">
      <CardContent>
        <div
            className={cn(
            'document-rich-text max-w-none',
            '[&_.installments-table]:w-full [&_.installments-table]:border-collapse',
            '[&_.installments-table_th]:border [&_.installments-table_th]:border-border [&_.installments-table_th]:bg-muted [&_.installments-table_th]:px-3 [&_.installments-table_th]:py-2 [&_.installments-table_th]:text-left',
            '[&_.installments-table_td]:border [&_.installments-table_td]:border-border [&_.installments-table_td]:px-3 [&_.installments-table_td]:py-2',
            '[&_.signature-label]:mb-1 [&_.signature-label]:text-xs [&_.signature-label]:text-muted-foreground',
            '[&_.signature-line]:mb-1 [&_.signature-line]:h-12 [&_.signature-line]:w-50 [&_.signature-line]:border-b [&_.signature-line]:border-foreground',
            '[&_.signature-image]:mb-1 [&_.signature-image]:h-20 [&_.signature-image]:w-50 [&_.signature-image]:object-contain',
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
          This document has been signed by {publicDocument.loan.client.name}.
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
