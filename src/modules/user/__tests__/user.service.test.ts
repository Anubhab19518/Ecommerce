import { UserService } from '../user.service';

// ---- Mocks ----
const mockRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../user.repository', () => ({
  UserRepository: jest.fn().mockImplementation(() => mockRepo),
}));

jest.mock('@modules/notification', () => ({
  notificationService: { publish: jest.fn() },
  EventType: {
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
  },
}));

jest.mock('@shared/errors', () => ({
  NotFoundError: class extends Error {
    constructor(resource = 'Resource') {
      super(`${resource} not found`);
      this.name = 'NotFoundError';
    }
  },
  ConflictError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ConflictError';
    }
  },
  ValidationError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  },
}));

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('UserService - listUsers & getUserById', () => {
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService();
  });

  it('should return all users', async () => {
    const users = [{ id: '1', email: 'a@test.com', name: 'A' }];
    mockRepo.findAll.mockResolvedValue(users);

    const result = await service.listUsers();

    expect(result).toEqual(users);
    expect(mockRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('should return user when found', async () => {
    const user = { id: '1', email: 'a@test.com', name: 'A' };
    mockRepo.findById.mockResolvedValue(user);

    const result = await service.getUserById('1');

    expect(result).toEqual(user);
  });

  it('should throw NotFoundError when user not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.getUserById('999')).rejects.toThrow('User not found');
  });
});

describe('UserService - createUser', () => {
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService();
  });

  it('should create user when email is unique', async () => {
    const input = { email: 'new@test.com', name: 'New User' };
    const created = { id: '1', ...input };

    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(created);

    const result = await service.createUser(input);

    expect(result).toEqual(created);
    expect(mockRepo.create).toHaveBeenCalledWith(input);
  });

  it('should throw ConflictError when email already exists', async () => {
    mockRepo.findByEmail.mockResolvedValue({ id: '1', email: 'dupe@test.com' });

    await expect(service.createUser({ email: 'dupe@test.com', name: 'Dupe' })).rejects.toThrow(
      'already exists',
    );
  });

  it('should publish USER_CREATED event on success', async () => {
    const created = { id: '1', email: 'a@test.com', name: 'A' };
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(created);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { notificationService } = require('@modules/notification');

    await service.createUser({ email: 'a@test.com', name: 'A' });

    expect(notificationService.publish).toHaveBeenCalledWith('user.created', {
      userId: '1',
      email: 'a@test.com',
    });
  });
});

describe('UserService - updateUser & deleteUser', () => {
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService();
  });

  it('should throw ValidationError when no fields provided', async () => {
    await expect(service.updateUser('1', {})).rejects.toThrow(
      'At least one field must be provided',
    );
  });

  it('should update user when found', async () => {
    const updated = { id: '1', email: 'updated@test.com', name: 'Updated' };
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.update.mockResolvedValue(updated);

    const result = await service.updateUser('1', { name: 'Updated' });

    expect(result).toEqual(updated);
  });

  it('should throw ConflictError when updating to email already used by another user', async () => {
    mockRepo.findByEmail.mockResolvedValue({ id: '2', email: 'other@test.com' });

    await expect(service.updateUser('1', { email: 'other@test.com' })).rejects.toThrow(
      'already exists',
    );
  });

  it('should allow updating email if it belongs to the same user', async () => {
    const updated = { id: '1', email: 'same@test.com', name: 'Same' };
    mockRepo.findByEmail.mockResolvedValue({ id: '1', email: 'same@test.com' });
    mockRepo.update.mockResolvedValue(updated);

    const result = await service.updateUser('1', { email: 'same@test.com' });

    expect(result).toEqual(updated);
  });

  it('should throw NotFoundError when updating non-existent user', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.update.mockResolvedValue(null);

    await expect(service.updateUser('999', { name: 'New Name' })).rejects.toThrow('User not found');
  });

  it('should delete user when found', async () => {
    mockRepo.delete.mockResolvedValue(true);

    await expect(service.deleteUser('1')).resolves.toBeUndefined();
  });

  it('should throw NotFoundError when user not found', async () => {
    mockRepo.delete.mockResolvedValue(false);

    await expect(service.deleteUser('999')).rejects.toThrow('User not found');
  });
});
