import { uploadAssetSchema } from './assets.schema';
import { createHandlers } from '@/api/app';
import { validate } from '@/api/lib/validator';

export const uploadAsset = createHandlers(
    validate('form', uploadAssetSchema),
    async (c) => {
        const { file } = c.req.valid('form');

        const key = `temp/${crypto.randomUUID()}-${file.name}`;

        try {
            await c.env.STORAGE.put(key, file);

            return c.json(
                {
                    meta: {
                        code: 200,
                        message: 'File uploaded successfully',
                    },
                    data: {
                        key,
                    },
                },
                200,
            );
        } catch (error) {
            return c.json(
                {
                    meta: {
                        code: 500,
                        message: 'Failed to upload file',
                    },
                    data: {},
                },
                500,
            );
        }
    },
);
