import { z } from 'zod';

import { INVALID_DATE_FORMAT } from '../common';

export const dateStringValidator = z.string().trim().min(1).refine((v) => !isNaN(Date.parse(v)), {
  error: INVALID_DATE_FORMAT,
});

export const searchValidator = z.string().trim().optional();

export const pageValidator = z.coerce.number().int().min(1).default(1);

export const limitValidator = z.coerce.number().int().min(1).max(100).default(10);
