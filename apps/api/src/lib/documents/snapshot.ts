import { renderLoanDocumentHtml } from '@workspace/document-renderer/server';
import type { Context } from 'hono';
import type { AppBindings } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { parseDocumentContent } from '@/api/lib/documents/content';

type LoanDocumentSnapshotContext = Context<AppBindings>;

type LoanWithInstallments = {
  amount: number;
  borrower: string;
  currency: string;
  description: string | null;
  email: string | null;
  installmentInterval: string;
  installments: Array<{
    amount: number;
    dueDate: Date;
  }>;
  interestRate: number | null;
  loanDate: Date;
  phone: string | null;
};

export function renderLoanDocumentContentSnapshot(params: {
  content: string;
  loan: LoanWithInstallments;
  signatureDataUrl?: string | null;
  signedAt: Date;
}) {
  return renderLoanDocumentHtml({
    content: parseDocumentContent(params.content),
    loan: {
      amount: params.loan.amount,
      borrower: params.loan.borrower,
      currency: params.loan.currency,
      description: params.loan.description,
      email: params.loan.email,
      installmentInterval: params.loan.installmentInterval,
      installments: params.loan.installments.map((installment) => ({
        amount: installment.amount,
        dueDate: installment.dueDate,
      })),
      interestRate: params.loan.interestRate,
      loanDate: params.loan.loanDate,
      phone: params.loan.phone,
    },
    signatureDataUrl: params.signatureDataUrl ?? null,
    signedAt: params.signedAt,
  });
}

export async function getSignatureDataUrlFromStorage(
  c: LoanDocumentSnapshotContext,
  signatureKey: string | null | undefined,
) {
  if (!signatureKey) {
    return null;
  }

  const signatureObject = await c.env.STORAGE.get(signatureKey);
  if (!signatureObject) {
    return null;
  }

  const contentType = signatureObject.httpMetadata?.contentType ?? 'image/png';
  const bytes = await signatureObject.arrayBuffer();
  const base64EncodedBytes = Buffer.from(bytes).toString('base64');

  return `data:${contentType};base64,${base64EncodedBytes}`;
}

export async function ensureLoanDocumentContentSnapshot(c: LoanDocumentSnapshotContext, params: {
  contentSnapshotHtml: string | null;
  loanDocumentId: string;
  loanId: string;
  signedAt: Date;
  signatureKey: string | null;
  templateId: string;
}) {
  if (params.contentSnapshotHtml) {
    return params.contentSnapshotHtml;
  }

  const prisma = initializePrisma(c.env);
  const [loanFound, documentFound, signatureDataUrl] = await Promise.all([
    prisma.loan.findUnique({
      where: { id: params.loanId },
      include: { installments: { orderBy: { dueDate: 'asc' } } },
    }),
    prisma.document.findUnique({ where: { id: params.templateId } }),
    getSignatureDataUrlFromStorage(c, params.signatureKey),
  ]);

  if (!loanFound || !documentFound) {
    return null;
  }

  const contentSnapshotHtml = renderLoanDocumentContentSnapshot({
    content: documentFound.content,
    loan: loanFound,
    signatureDataUrl,
    signedAt: params.signedAt,
  });

  await prisma.loanDocument.update({
    where: { id: params.loanDocumentId },
    data: { contentSnapshotHtml },
  });

  return contentSnapshotHtml;
}
