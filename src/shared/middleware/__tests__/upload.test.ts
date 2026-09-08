import type { Request, Response } from 'express';
import { uploadMiddleware } from '../upload';

describe('Upload Middleware', () => {
  it('exports valid multer instance with array middleware helper', (done) => {
    const handler = uploadMiddleware.array('images', 10);
    expect(typeof handler).toBe('function');

    const mockReq = {
      headers: {
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
      },
    } as unknown as Request;

    const mockRes = {} as Response;

    handler(mockReq, mockRes, (err?: unknown) => {
      expect(err).toBeUndefined();
      done();
    });
  });
});
