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

export const loanInstallmentAttentionQuerySchema = z.object({
  search: searchValidator,
  page: pageValidator,
  limit: limitValidator,
});

export const loanLatestPaymentsQuerySchema = z.object({
  search: searchValidator,
  page: pageValidator,
  limit: limitValidator,
});

export const loanAnalyticsQuerySchema = z.object({
  startDate: dateStringValidator.optional(),
  endDate: dateStringValidator.optional(),
}).refine(
  ({ startDate, endDate }) => !startDate || !endDate || new Date(startDate).getTime() <= new Date(endDate).getTime(),
  {
    message: 'startDate must be before or equal to endDate',
    path: ['endDate'],
  },
);

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
});

const bulkInstallmentSchema = z.object({
  type: z.literal(InstallmentType.BULK),
  interval: z.enum(InstallmentInterval),
  count: z.number().int().min(1).max(360),
  startDate: dateStringValidator,
  amount: z.number().positive(),
  status: installmentStatus,
});

const installmentCreateSchema = z.discriminatedUnion('type', [
  singleInstallmentSchema,
  bulkInstallmentSchema,
]);

export const loanCreateSchema = z.object({
  clientId: z.string().trim().length(25),
  amount: z.number().positive(),
  currency: z.enum(CURRENCIES),
  notificationsEnabled: z.boolean().optional(),
  installmentInterval: z.enum(InstallmentInterval),
  loanDate: dateStringValidator,
  interestRate: z.number().min(0).optional(),
  description: z.string().trim().optional(),
  installments: installmentCreateSchema.optional(),
});

export const loanUpdateSchema = z.object({
  clientId: z.string().trim().length(25).optional(),
  amount: z.number().positive().optional(),
  notificationsEnabled: z.boolean().optional(),
  installmentInterval: z.enum(InstallmentInterval).optional(),
  loanDate: dateStringValidator,
  interestRate: z.number().min(0).optional().nullable(),
  description: z.string().trim().optional().nullable(),
});
