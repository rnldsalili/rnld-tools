import { renderLoanDocumentHtml } from '@workspace/document-renderer/server';
import type { Context } from 'hono';
import type { AppBindings } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { parseDocumentContent } from '@/api/lib/documents/content';

type LoanDocumentSnapshotContext = Context<AppBindings>;

type LoanWithInstallments = {
  amount: number;
  currency: string;
  description: string | null;
  installmentInterval: string;
  installments: Array<{
    amount: number;
    dueDate: Date;
  }>;
  interestRate: number | null;
  loanDate: Date;
  client: {
    address: string | null;
    email: string | null;
    name: string;
    phone: string | null;
  };
};

export function renderLoanDocumentContentSnapshot(params: {
  content: string;
  loan: LoanWithInstallments;
  signatureDataUrl?: string | null;
  signedAt?: Date | null;
}) {
  return renderLoanDocumentHtml({
    content: parseDocumentContent(params.content),
    loan: {
      amount: params.loan.amount,
      address: params.loan.client.address,
      borrower: params.loan.client.name,
      currency: params.loan.currency,
      description: params.loan.description,
      email: params.loan.client.email,
      installmentInterval: params.loan.installmentInterval,
      installments: params.loan.installments.map((installment) => ({
        amount: installment.amount,
        dueDate: installment.dueDate,
      })),
      interestRate: params.loan.interestRate,
      loanDate: params.loan.loanDate,
      phone: params.loan.client.phone,
    },
    signatureDataUrl: params.signatureDataUrl ?? null,
    signedAt: params.signedAt ?? null,
  });
}

export function base64DataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);

  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return bytes;
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
      include: {
        client: true,
        installments: { orderBy: { dueDate: 'asc' } },
      },
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
