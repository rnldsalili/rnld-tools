import {
  CURRENCIES,
  INSTALLMENT_STATUSES,
  InstallmentInterval,
  InstallmentStatus,
  InstallmentType,
  dateStringValidator,
  limitValidator,
  pageValidator,
  searchValidator,
} from '@workspace/constants';
import { z } from 'zod';

export const loanIdParamSchema = z.object({
  id: z.string().trim().length(25),
});

export const loanListQuerySchema = z.object({
  search: searchValidator,
  page: pageValidator,
  limit: limitValidator,
});

export const loanGetQuerySchema = z.object({
  page: pageValidator,
  limit: limitValidator,
});

const installmentStatus = z.enum(INSTALLMENT_STATUSES).default(InstallmentStatus.PENDING);

const singleInstallmentSchema = z.object({
  type: z.literal(InstallmentType.SINGLE),
  dueDate: dateStringValidator,
  amount: z.number().positive(),
  status: installmentStatus,
  remarks: z.string().trim().optional(),
});

const bulkInstallmentSchema = z.object({
  type: z.literal(InstallmentType.BULK),
  interval: z.enum(InstallmentInterval),
  count: z.number().int().min(1).max(360),
  startDate: dateStringValidator,
  amount: z.number().positive(),
  status: installmentStatus,
  remarks: z.string().trim().optional(),
});

const installmentCreateSchema = z.discriminatedUnion('type', [
  singleInstallmentSchema,
  bulkInstallmentSchema,
]);

export const loanCreateSchema = z.object({
  borrower: z.string().trim().min(1),
  amount: z.number().positive(),
  currency: z.enum(CURRENCIES),
  interestRate: z.number().min(0).optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().pipe(z.email()).optional(),
  description: z.string().trim().optional(),
  installments: installmentCreateSchema.optional(),
});

export const loanUpdateSchema = z.object({
  borrower: z.string().trim().min(1).optional(),
  amount: z.number().positive().optional(),
  interestRate: z.number().min(0).optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().pipe(z.email()).optional().nullable(),
  description: z.string().trim().optional().nullable(),
});

