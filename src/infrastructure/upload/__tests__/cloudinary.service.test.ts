import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from '../cloudinary.service';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

describe('CloudinaryService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Unconfigured Fallback Mode', () => {
    let service: CloudinaryService;

    beforeEach(() => {
      delete process.env.CLOUDINARY_CLOUD_NAME;
      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_SECRET;
      service = new CloudinaryService();
    });

    it('uploads image buffer in fallback mode', async () => {
      const dummyBuffer = Buffer.from('fake image content');
      const result = await service.uploadImageBuffer(dummyBuffer, 'products');

      expect(result.url).toContain('https://res.cloudinary.com/demo/image/upload/mock_');
      expect(result.publicId).toContain('mock_');
    });

    it('deletes image in fallback mode', async () => {
      const result = await service.deleteImage('mock_12345');
      expect(result).toBe(true);
    });

    it('returns false when deleting empty publicId', async () => {
      const result = await service.deleteImage('');
      expect(result).toBe(false);
    });
  });

  describe('Configured Cloudinary Mode', () => {
    let service: CloudinaryService;

    beforeEach(() => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
      process.env.CLOUDINARY_API_KEY = 'test_key';
      process.env.CLOUDINARY_API_SECRET = 'test_secret';
      service = new CloudinaryService();
    });

    it('configures cloudinary SDK lazily on method invocation', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });
      await service.deleteImage('asset_test');
      expect(cloudinary.config).toHaveBeenCalledWith({
        cloud_name: 'test_cloud',
        api_key: 'test_key',
        api_secret: 'test_secret',
        secure: true,
      });
    });

    it('uploads image buffer successfully via Cloudinary upload_stream', async () => {
      const dummyBuffer = Buffer.from('real image content');
      const endMock = jest.fn();

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((_opts, callback) => {
        callback(null, {
          secure_url: 'https://res.cloudinary.com/test_cloud/image/upload/sample.jpg',
          public_id: 'sample_id',
        });
        return { end: endMock };
      });

      const result = await service.uploadImageBuffer(dummyBuffer, 'products');

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        { folder: 'products', resource_type: 'image' },
        expect.any(Function),
      );
      expect(endMock).toHaveBeenCalledWith(dummyBuffer);
      expect(result).toEqual({
        url: 'https://res.cloudinary.com/test_cloud/image/upload/sample.jpg',
        publicId: 'sample_id',
      });
    });

    it('rejects upload when Cloudinary upload_stream returns an error', async () => {
      const dummyBuffer = Buffer.from('real image content');

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((_opts, callback) => {
        callback(new Error('Cloudinary stream error'), null);
        return { end: jest.fn() };
      });

      await expect(service.uploadImageBuffer(dummyBuffer, 'products')).rejects.toThrow(
        'Cloudinary stream error',
      );
    });

    it('rejects upload with fallback error message when error object lacks message', async () => {
      const dummyBuffer = Buffer.from('real image content');

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((_opts, callback) => {
        callback({}, null);
        return { end: jest.fn() };
      });

      await expect(service.uploadImageBuffer(dummyBuffer, 'products')).rejects.toThrow(
        'Cloudinary upload failed',
      );
    });

    it('deletes image successfully when destroy returns ok or not found', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });
      const okResult = await service.deleteImage('asset_123');
      expect(okResult).toBe(true);

      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'not found' });
      const notFoundResult = await service.deleteImage('asset_456');
      expect(notFoundResult).toBe(true);
    });

    it('returns false when Cloudinary destroy returns non-ok status', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'error' });
      const result = await service.deleteImage('asset_789');
      expect(result).toBe(false);
    });

    it('returns false when Cloudinary destroy throws an exception', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(new Error('Network error'));
      const result = await service.deleteImage('asset_error');
      expect(result).toBe(false);
    });
  });
});
