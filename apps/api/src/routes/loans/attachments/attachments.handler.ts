import {
  LOAN_ATTACHMENT_ALLOWED_EXTENSIONS,
  LOAN_ATTACHMENT_ALLOWED_MIME_TYPES,
  LOAN_ATTACHMENT_MAX_SIZE_BYTES,
  LoanLogEventType,
} from '@workspace/constants';
import {
  loanAttachmentLoanIdParamSchema,
  loanAttachmentParamSchema,
  loanAttachmentUploadFormSchema,
} from './attachments.schema';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { createLoanLog } from '@/api/lib/loans/logs';
import { deleteStoredObject, uploadFileToStorage } from '@/api/lib/storage/storage';
import { validate } from '@/api/lib/validator';

function getAttachmentFileErrorMessage(file: File): string | null {
  const normalizedFileName = file.name.trim();
  if (!normalizedFileName) {
    return 'Attachment file name is required';
  }

  if (file.size <= 0) {
    return 'Attachment file is empty';
  }

  if (file.size > LOAN_ATTACHMENT_MAX_SIZE_BYTES) {
    return 'Attachment file exceeds the 10 MB limit';
  }

  const normalizedMimeType = file.type.trim().toLowerCase();
  const normalizedFileExtension = getFileExtension(normalizedFileName);
  const isAllowedMimeType = LOAN_ATTACHMENT_ALLOWED_MIME_TYPES.includes(
    normalizedMimeType as (typeof LOAN_ATTACHMENT_ALLOWED_MIME_TYPES)[number],
  );
  const isAllowedExtension = LOAN_ATTACHMENT_ALLOWED_EXTENSIONS.includes(
    normalizedFileExtension as (typeof LOAN_ATTACHMENT_ALLOWED_EXTENSIONS)[number],
  );

  if (!isAllowedMimeType && !isAllowedExtension) {
    return 'Attachment file type is not supported';
  }

  return null;
}

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex < 0) {
    return '';
  }

  return fileName.slice(lastDotIndex).trim().toLowerCase();
}

function getNormalizedContentType(file: File): string {
  const normalizedMimeType = file.type.trim().toLowerCase();
  return normalizedMimeType || 'application/octet-stream';
}

function buildAttachmentContentDisposition(fileName: string): string {
  const escapedFileName = fileName.replace(/["\\]/g, '');
  const encodedFileName = encodeURIComponent(fileName).replace(/['()*]/g, (character) => {
    return `%${character.charCodeAt(0).toString(16).toUpperCase()}`;
  });

  return `attachment; filename="${escapedFileName}"; filename*=UTF-8''${encodedFileName}`;
}

async function getLoanAttachmentOrNull(
  prisma: ReturnType<typeof initializePrisma>,
  loanId: string,
  attachmentId: string,
) {
  return prisma.loanAttachment.findFirst({
    where: { id: attachmentId, loanId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export const getLoanAttachments = createHandlers(
  validate('param', loanAttachmentLoanIdParamSchema),
  async (c) => {
    const { loanId } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const loanAttachments = await prisma.loanAttachment.findMany({
      where: { loanId },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return c.json({
      meta: { code: 200, message: 'Loan attachments retrieved successfully' },
      data: {
        attachments: loanAttachments,
      },
    }, 200);
  },
);

export const createLoanAttachment = createHandlers(
  validate('param', loanAttachmentLoanIdParamSchema),
  validate('form', loanAttachmentUploadFormSchema),
  async (c) => {
    const { loanId } = c.req.valid('param');
    const { file } = c.req.valid('form');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const attachmentFileErrorMessage = getAttachmentFileErrorMessage(file);
    if (attachmentFileErrorMessage) {
      return c.json({ meta: { code: 422, message: attachmentFileErrorMessage } }, 422);
    }

    const normalizedContentType = getNormalizedContentType(file);
    const uploadResult = await uploadFileToStorage({
      storage: c.env.STORAGE,
      file,
      fileName: file.name,
      destinationDir: `loan-attachments/${loanId}`,
      contentType: normalizedContentType,
    });

    if (uploadResult.error || !uploadResult.storageKey) {
      return c.json({
        meta: {
          code: 500,
          message: uploadResult.error?.message ?? 'Failed to upload attachment file',
        },
      }, 500);
    }

    try {
      const createdLoanAttachment = await prisma.loanAttachment.create({
        data: {
          loan: { connect: { id: loanId } },
          fileName: file.name.trim(),
          contentType: normalizedContentType,
          sizeBytes: file.size,
          storageKey: uploadResult.storageKey,
          createdBy: { connect: { id: authenticatedUser.id } },
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      await createLoanLog(prisma, {
        loanId,
        actorUserId: authenticatedUser.id,
        eventType: LoanLogEventType.ATTACHMENT_UPLOADED,
        eventData: {
          attachmentId: createdLoanAttachment.id,
          fileName: createdLoanAttachment.fileName,
          sizeBytes: createdLoanAttachment.sizeBytes,
        },
      });

      return c.json({
        meta: { code: 201, message: 'Loan attachment uploaded successfully' },
        data: {
          attachment: createdLoanAttachment,
        },
      }, 201);
    } catch (dbError) {
      await deleteStoredObject(c.env.STORAGE, uploadResult.storageKey);
      throw dbError;
    }
  },
);

export const downloadLoanAttachment = createHandlers(
  validate('param', loanAttachmentParamSchema),
  async (c) => {
    const { loanId, attachmentId } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const loanAttachmentFound = await getLoanAttachmentOrNull(prisma, loanId, attachmentId);
    if (!loanAttachmentFound) {
      return c.json({ meta: { code: 404, message: 'Loan attachment not found' } }, 404);
    }

    const storedAttachment = await c.env.STORAGE.get(loanAttachmentFound.storageKey);
    if (!storedAttachment?.body) {
      return c.json({ meta: { code: 404, message: 'Attachment file not found in storage' } }, 404);
    }

    return new Response(storedAttachment.body, {
      headers: {
        'Content-Disposition': buildAttachmentContentDisposition(loanAttachmentFound.fileName),
        'Content-Length': String(loanAttachmentFound.sizeBytes),
        'Content-Type': loanAttachmentFound.contentType,
      },
    });
  },
);

export const deleteLoanAttachment = createHandlers(
  validate('param', loanAttachmentParamSchema),
  async (c) => {
    const { loanId, attachmentId } = c.req.valid('param');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    const loanAttachmentFound = await getLoanAttachmentOrNull(prisma, loanId, attachmentId);
    if (!loanAttachmentFound) {
      return c.json({ meta: { code: 404, message: 'Loan attachment not found' } }, 404);
    }

    await deleteStoredObject(c.env.STORAGE, loanAttachmentFound.storageKey);
    await prisma.loanAttachment.delete({ where: { id: loanAttachmentFound.id } });
    await createLoanLog(prisma, {
      loanId,
      actorUserId: authenticatedUser.id,
      eventType: LoanLogEventType.ATTACHMENT_DELETED,
      eventData: {
        attachmentId: loanAttachmentFound.id,
        fileName: loanAttachmentFound.fileName,
        sizeBytes: loanAttachmentFound.sizeBytes,
      },
    });

    return c.json({ meta: { code: 200, message: 'Loan attachment deleted successfully' } }, 200);
  },
);
