import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@infrastructure/logging/logger';

export interface UploadResult {
  url: string;
  publicId: string;
}

export class CloudinaryService {
  private isConfigured: boolean | null = null;

  private ensureConfigured(): boolean {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      if (this.isConfigured !== true) {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          secure: true,
        });
        this.isConfigured = true;
      }
      return true;
    }

    if (this.isConfigured === null) {
      logger.warn(
        'Cloudinary environment variables missing. Falling back to local mock upload mode.',
      );
    }
    this.isConfigured = false;
    return false;
  }

  // fallow-ignore-next-line complexity
  async uploadImageBuffer(buffer: Buffer, folder = 'products'): Promise<UploadResult> {
    if (!this.ensureConfigured()) {
      const mockId = `mock_${uuidv4()}`;
      const mockUrl = `https://res.cloudinary.com/demo/image/upload/${mockId}.jpg`;
      logger.info(`Mock Cloudinary upload generated URL for buffer (${buffer.length} bytes)`);
      return { url: mockUrl, publicId: mockId };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        // fallow-ignore-next-line complexity
        (error, result) => {
          if (error ?? !result) {
            const errorMessage =
              (error as { message?: string } | null)?.message ?? 'Cloudinary upload failed';
            logger.error('Cloudinary upload error:', error);
            return reject(new Error(errorMessage));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );
      uploadStream.end(buffer);
    });
  }

  // fallow-ignore-next-line complexity
  async deleteImage(publicId: string): Promise<boolean> {
    if (!publicId) return false;

    if (!this.ensureConfigured()) {
      logger.info(`Mock Cloudinary deleted image with publicId: ${publicId}`);
      return true;
    }

    try {
      const result = (await cloudinary.uploader.destroy(publicId)) as { result?: string };
      logger.info(`Cloudinary deleted asset ${publicId}:`, result);
      return result.result === 'ok' || result.result === 'not found';
    } catch (err) {
      logger.error(`Cloudinary deletion failed for publicId ${publicId}:`, err);
      return false;
    }
  }
}

export const cloudinaryService = new CloudinaryService();
