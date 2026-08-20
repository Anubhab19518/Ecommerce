import { UserModelDef } from '../user.model';
import { UserRepository } from '../user.repository';

jest.mock('@infrastructure/metrics/metrics', () => ({
  dbQueryDuration: {
    startTimer: jest.fn().mockReturnValue(jest.fn()),
  },
}));

jest.mock('../user.model', () => ({
  UserModelDef: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new UserRepository();
  });

  describe('findAll', () => {
    it('should return all users ordered by created_at DESC', async () => {
      const mockUsers = [{ id: '1', email: 'a@test.com', name: 'A' }];
      (UserModelDef.findAll as jest.Mock).mockResolvedValue(mockUsers);

      const result = await repository.findAll();

      expect(result).toEqual(mockUsers);
      expect(UserModelDef.findAll).toHaveBeenCalledWith({ order: [['created_at', 'DESC']] });
    });
  });

  describe('findById', () => {
    it('should return user by primary key', async () => {
      const mockUser = { id: '1', email: 'a@test.com', name: 'A' };
      (UserModelDef.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const result = await repository.findById('1');

      expect(result).toEqual(mockUser);
      expect(UserModelDef.findByPk).toHaveBeenCalledWith('1');
    });

    it('should return null if user not found', async () => {
      (UserModelDef.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user matching email', async () => {
      const mockUser = { id: '1', email: 'a@test.com', name: 'A' };
      (UserModelDef.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await repository.findByEmail('a@test.com');

      expect(result).toEqual(mockUser);
      expect(UserModelDef.findOne).toHaveBeenCalledWith({ where: { email: 'a@test.com' } });
    });

    it('should return null if no user matches email', async () => {
      (UserModelDef.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@test.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return a new user with generated UUID', async () => {
      const input = { email: 'new@test.com', name: 'New User' };
      const createdUser = { id: 'generated-uuid', ...input };
      (UserModelDef.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await repository.create(input);

      expect(result).toEqual(createdUser);
      expect(UserModelDef.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@test.com',
          name: 'New User',
          id: expect.any(String),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update and return user if user exists', async () => {
      const mockUserInstance = {
        id: '1',
        email: 'a@test.com',
        name: 'A',
        update: jest.fn().mockImplementation(function (this: any, data: any) {
          Object.assign(this, data);
          return Promise.resolve(this);
        }),
      };
      (UserModelDef.findByPk as jest.Mock).mockResolvedValue(mockUserInstance);

      const result = await repository.update('1', { name: 'Updated Name' });

      expect(mockUserInstance.update).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(result).toBe(mockUserInstance);
    });

    it('should return null if user to update does not exist', async () => {
      (UserModelDef.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.update('999', { name: 'Updated Name' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when a user is deleted', async () => {
      (UserModelDef.destroy as jest.Mock).mockResolvedValue(1);

      const result = await repository.delete('1');

      expect(result).toBe(true);
      expect(UserModelDef.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should return false when no user was destroyed', async () => {
      (UserModelDef.destroy as jest.Mock).mockResolvedValue(0);

      const result = await repository.delete('999');

      expect(result).toBe(false);
    });
  });
});
