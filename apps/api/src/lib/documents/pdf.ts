import puppeteer from '@cloudflare/puppeteer';
import { createLoanDocumentPdfHtmlDocument } from '@workspace/document-renderer/server';
import type { PrismaClient } from '@/prisma/client';
import {
  ensureLoanDocumentContentSnapshot,
  renderLoanDocumentContentSnapshot,
} from '@/api/lib/documents/snapshot';
import { hasDocumentContent } from '@/api/lib/documents/content';

export class LoanDocumentPdfRequestError extends Error {
  statusCode: 404 | 422 | 500;

  constructor(message: string, statusCode: 404 | 422 | 500) {
    super(message);
    this.name = 'LoanDocumentPdfRequestError';
    this.statusCode = statusCode;
  }
}

export interface LoanDocumentPdfResult {
  fileName: string;
  pdfBytes: Uint8Array;
}

export async function generateLoanDocumentPdf(
  env: CloudflareBindings,
  prisma: PrismaClient,
  params: {
    loanId: string;
    templateId: string;
  },
): Promise<LoanDocumentPdfResult> {
  const { loanId, templateId } = params;
  const [loanFound, documentTemplate, loanDocumentFound] = await Promise.all([
    prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        client: true,
        installments: { orderBy: { dueDate: 'asc' } },
      },
    }),
    prisma.document.findUnique({
      where: { id: templateId },
      select: { id: true, name: true, content: true },
    }),
    prisma.loanDocument.findUnique({
      where: { loanId_templateId: { loanId, templateId } },
      select: {
        id: true,
        contentSnapshotHtml: true,
        signatureKey: true,
        signedAt: true,
      },
    }),
  ]);

  if (!loanFound || !documentTemplate) {
    throw new LoanDocumentPdfRequestError('Loan document not found', 404);
  }

  if (!hasDocumentContent(documentTemplate.content)) {
    throw new LoanDocumentPdfRequestError(
      'Document template has no content. Please configure it first.',
      422,
    );
  }

  const contentSnapshotHtml = loanDocumentFound?.signedAt
    ? await ensureLoanDocumentContentSnapshot(env, {
      contentSnapshotHtml: loanDocumentFound.contentSnapshotHtml,
      loanDocumentId: loanDocumentFound.id,
      loanId,
      signedAt: loanDocumentFound.signedAt,
      signatureKey: loanDocumentFound.signatureKey,
      templateId,
    })
    : renderLoanDocumentContentSnapshot({
      content: documentTemplate.content,
      loan: loanFound,
    });

  if (!contentSnapshotHtml) {
    throw new LoanDocumentPdfRequestError('Failed to prepare the document PDF', 500);
  }

  const browserBinding = getBrowserBinding(env);
  if (!browserBinding) {
    throw new LoanDocumentPdfRequestError('Browser binding is not configured', 500);
  }

  const browser = await puppeteer.launch(browserBinding);

  try {
    const page = await browser.newPage();
    await page.setContent(createLoanDocumentPdfHtmlDocument(contentSnapshotHtml), {
      waitUntil: 'load',
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '16mm',
        right: '14mm',
        bottom: '16mm',
        left: '14mm',
      },
      printBackground: true,
    });

    return {
      fileName: buildLoanDocumentPdfFileName(documentTemplate.name, loanFound.client.name),
      pdfBytes: new Uint8Array(pdfBuffer),
    };
  } finally {
    await browser.close();
  }
}

export function buildLoanDocumentPdfFileName(templateName: string, clientName: string) {
  const normalizedTemplateName = normalizeFileNameSegment(templateName);
  const normalizedClientName = normalizeFileNameSegment(clientName);

  return `${normalizedTemplateName}-${normalizedClientName}.pdf`;
}

function normalizeFileNameSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'document';
}

function getBrowserBinding(env: CloudflareBindings): Fetcher | null {
  const browserBinding = Reflect.get(env, 'BROWSER');
  return isFetcher(browserBinding) ? browserBinding : null;
}

function isFetcher(value: unknown): value is Fetcher {
  return value !== null
    && typeof value === 'object'
    && 'fetch' in value
    && typeof value.fetch === 'function';
}
