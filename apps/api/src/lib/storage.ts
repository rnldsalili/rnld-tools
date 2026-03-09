/**
 * Storage utility functions for managing assets in Cloudflare R2
 */
import { normalizeImageStorageKey } from '@/api/lib/r2-presigner';

export type ProcessImageOptions = {
    /**
     * The R2 bucket storage instance
     */
    storage: R2Bucket;

    /**
     * The image key from the payload (could be temp or permanent)
     */
    imageKey: string | undefined;

    /**
     * The destination directory in R2 (e.g., 'families', 'members')
     */
    destinationDir: string;

    /**
     * The existing image key to delete if replacing (optional)
     */
    existingImageKey?: string | null;

    /**
     * Bucket name used to normalize presigned URLs back into object keys
     */
    bucketName?: string;
};

export type ProcessImageResult = {
    /**
     * The final image key (permanent location, or null if removing)
     */
    imageKey: string | null | undefined;

    /**
     * Error object if processing failed
     */
    error?: {
        code: number;
        message: string;
    };
};

/**
 * Processes an image upload for create or update operations.
 * Handles temp file movement, existing image cleanup, and image removal.
 * 
 * @param options - Configuration options for image processing
 * @returns Result object with the final image key or error
 * 
 * @example
 * ```typescript
 * const result = await processImageUpload({
 *   storage: c.env.STORAGE,
 *   imageKey: payload.image,
 *   destinationDir: 'families',
 *   existingImageKey: existingFamily.image,
 * });
 * 
 * if (result.error) {
 *   return c.json({ meta: { code: result.error.code, message: result.error.message } }, result.error.code);
 * }
 * 
 * // Use result.imageKey in your database update
 * ```
 */
export async function processImageUpload(
    options: ProcessImageOptions,
): Promise<ProcessImageResult> {
    const { storage, imageKey, destinationDir, existingImageKey, bucketName } = options;
    const normalizedImageKey = normalizeImageStorageKey(imageKey, { bucketName });

    // Omitted field means keep current image unchanged
    if (normalizedImageKey === undefined) {
        return { imageKey: undefined };
    }

    // No image provided = remove existing image
    if (!normalizedImageKey) {
        // Delete old image from storage if it exists
        if (existingImageKey) {
            try {
                await storage.delete(existingImageKey);
            } catch (error) {
                // Log error but don't fail the request if storage deletion fails
                console.error('Failed to delete old image:', error);
            }
        }
        return { imageKey: null };
    }

    // Image provided = process upload
    // Only process if it's a temp file, otherwise use as-is
    if (normalizedImageKey.startsWith('temp/')) {
        try {
            // Extract filename from temp key (e.g., "temp/uuid-filename.jpg" -> "uuid-filename.jpg")
            const filename = normalizedImageKey.replace('temp/', '');

            // Generate new key for permanent storage
            const newImageKey = `${destinationDir}/${crypto.randomUUID()}-${filename}`;

            // Get the file from temp location
            const tempFile = await storage.get(normalizedImageKey);

            if (!tempFile) {
                return {
                    imageKey: undefined,
                    error: {
                        code: 404,
                        message: 'Temporary image file not found',
                    },
                };
            }

            // Copy to permanent location
            await storage.put(newImageKey, tempFile.body);

            // Delete old image if it exists and is different from the new one
            if (existingImageKey && existingImageKey !== newImageKey) {
                await storage.delete(existingImageKey);
            }

            return { imageKey: newImageKey };
        } catch (error) {
            return {
                imageKey: undefined,
                error: {
                    code: 500,
                    message: 'Failed to process image file',
                },
            };
        }
    }

    // Image is already in permanent storage, use as-is
    return { imageKey: normalizedImageKey };
}

/**
 * Deletes an image from R2 storage.
 * Logs errors but doesn't throw to prevent failing the main operation.
 * 
 * @param storage - The R2 bucket storage instance
 * @param imageKey - The key of the image to delete
 * 
 * @example
 * ```typescript
 * await deleteImage(c.env.STORAGE, 'families/old-image.jpg');
 * ```
 */
export async function deleteImage(
    storage: R2Bucket,
    imageKey: string | null | undefined,
): Promise<void> {
    if (!imageKey) return;

    try {
        await storage.delete(imageKey);
    } catch (error) {
        console.error(`Failed to delete image ${imageKey}:`, error);
    }
}
