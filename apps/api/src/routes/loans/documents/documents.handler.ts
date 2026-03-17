import puppeteer from '@cloudflare/puppeteer';
import { createLoanDocumentPdfHtmlDocument } from '@workspace/document-renderer/server';
import { loanDocumentPdfParamSchema } from './documents.schema';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { ensureLoanDocumentContentSnapshot } from '@/api/lib/documents/snapshot';
import { validate } from '@/api/lib/validator';

export const downloadLoanDocumentPdf = createHandlers(
  validate('param', loanDocumentPdfParamSchema),
  async (c) => {
    const { loanId, templateId } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const [loanFound, documentTemplate, loanDocumentFound] = await Promise.all([
      prisma.loan.findUnique({
        where: { id: loanId },
        select: {
          client: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.document.findUnique({
        where: { id: templateId },
        select: { id: true, name: true },
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
      return c.json({ meta: { code: 404, message: 'Loan document not found' } }, 404);
    }

    if (!loanDocumentFound?.signedAt) {
      return c.json({
        meta: { code: 409, message: 'Document must be signed or confirmed before downloading PDF' },
      }, 409);
    }

    const contentSnapshotHtml = await ensureLoanDocumentContentSnapshot(c, {
      contentSnapshotHtml: loanDocumentFound.contentSnapshotHtml,
      loanDocumentId: loanDocumentFound.id,
      loanId,
      signedAt: loanDocumentFound.signedAt,
      signatureKey: loanDocumentFound.signatureKey,
      templateId,
    });

    if (!contentSnapshotHtml) {
      return c.json({
        meta: { code: 500, message: 'Failed to prepare the document PDF' },
      }, 500);
    }

    const browser = await puppeteer.launch((c.env as typeof c.env & { BROWSER: Fetcher }).BROWSER);

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
      const pdfBytes = new Uint8Array(pdfBuffer);

      return new Response(pdfBytes, {
        headers: {
          'Content-Disposition': `attachment; filename="${buildLoanDocumentPdfFileName(
            documentTemplate.name,
            loanFound.client.name,
          )}"`,
          'Content-Type': 'application/pdf',
        },
      });
    } finally {
      await browser.close();
    }
  },
);

function buildLoanDocumentPdfFileName(templateName: string, clientName: string) {
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
