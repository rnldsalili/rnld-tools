import { loanDocumentPdfParamSchema } from './documents.schema';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import {
  LoanDocumentPdfRequestError,
  generateLoanDocumentPdf,
} from '@/api/lib/documents/pdf';
import { validate } from '@/api/lib/validator';

export const downloadLoanDocumentPdf = createHandlers(
  validate('param', loanDocumentPdfParamSchema),
  async (c) => {
    const { loanId, templateId } = c.req.valid('param');
    const prisma = initializePrisma(c.env);
    try {
      const generatedLoanDocumentPdf = await generateLoanDocumentPdf(c.env, prisma, {
        loanId,
        templateId,
      });
      const pdfBody = Uint8Array.from(generatedLoanDocumentPdf.pdfBytes).buffer;

      return new Response(new Blob([pdfBody], {
        type: 'application/pdf',
      }), {
        headers: {
          'Content-Disposition': `attachment; filename="${generatedLoanDocumentPdf.fileName}"`,
          'Content-Type': 'application/pdf',
        },
      });
    } catch (error) {
      if (error instanceof LoanDocumentPdfRequestError) {
        return c.json({
          meta: {
            code: error.statusCode,
            message: error.message,
          },
        }, error.statusCode);
      }

      throw error;
    }
  },
);
