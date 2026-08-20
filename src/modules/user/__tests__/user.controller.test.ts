import type { Request, Response, NextFunction } from 'express';
import { listUsers, getUserById, createUser, updateUser, deleteUser } from '../user.controller';
import { UserService } from '../user.service';

jest.mock('../user.service');

const mockUserService = UserService.prototype as jest.Mocked<UserService>;

describe('UserController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: {},
      body: {},
    };
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('listUsers', () => {
    it('should return 200 with list of users', async () => {
      const users = [
        { id: '123e4567-e89b-12d3-a456-426614174000', email: 'test@example.com', name: 'Test' },
      ];
      (mockUserService.listUsers as jest.Mock).mockResolvedValue(users);

      await listUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: users });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on error', async () => {
      const error = new Error('Database failure');
      (mockUserService.listUsers as jest.Mock).mockRejectedValue(error);

      await listUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getUserById', () => {
    it('should return 200 with user data for valid UUID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      mockReq.params = { id: validUuid };
      const user = { id: validUuid, email: 'test@example.com', name: 'Test' };
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(user);

      await getUserById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.getUserById).toHaveBeenCalledWith(validUuid);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: user });
    });

    it('should call next with validation error for invalid UUID', async () => {
      mockReq.params = { id: 'invalid-uuid' };

      await getUserById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockUserService.getUserById).not.toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should return 201 with created user for valid body', async () => {
      const body = { email: 'new@example.com', name: 'New User' };
      mockReq.body = body;
      const created = { id: '123e4567-e89b-12d3-a456-426614174000', ...body };
      (mockUserService.createUser as jest.Mock).mockResolvedValue(created);

      await createUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: created });
    });

    it('should call next with error when validation fails', async () => {
      mockReq.body = { email: 'invalid-email' };

      await createUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should return 200 with updated user for valid body and UUID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      mockReq.params = { id: validUuid };
      mockReq.body = { name: 'Updated Name' };
      const updated = { id: validUuid, email: 'user@example.com', name: 'Updated Name' };
      (mockUserService.updateUser as jest.Mock).mockResolvedValue(updated);

      await updateUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.updateUser).toHaveBeenCalledWith(validUuid, { name: 'Updated Name' });
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok', data: updated });
    });

    it('should call next with error when service throws', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      mockReq.params = { id: validUuid };
      mockReq.body = { name: 'Updated Name' };
      const error = new Error('Service error');
      (mockUserService.updateUser as jest.Mock).mockRejectedValue(error);

      await updateUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteUser', () => {
    it('should return 204 on successful delete', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      mockReq.params = { id: validUuid };
      (mockUserService.deleteUser as jest.Mock).mockResolvedValue(undefined);

      await deleteUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.deleteUser).toHaveBeenCalledWith(validUuid);
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should call next with error when delete fails', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      mockReq.params = { id: validUuid };
      const error = new Error('Not found');
      (mockUserService.deleteUser as jest.Mock).mockRejectedValue(error);

      await deleteUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
