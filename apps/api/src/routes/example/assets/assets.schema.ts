import { z } from 'zod';

export const uploadAssetSchema = z.object({
    file: z.instanceof(File, { message: 'File is required and must be a valid file' }),
});
