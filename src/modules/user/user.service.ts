import { hash, compare } from 'bcrypt';
import { notificationService, EventType } from '@modules/notification';
import { NotFoundError, ConflictError, ValidationError, UnauthorizedError } from '@shared/errors';
import type { UserModel } from './user.model';
import { UserRepository } from './user.repository';
import type { CreateUserInput, UpdateUserInput } from './user.validator';

/**
 * User business logic.
 * This is the ONLY class exported from the module's public API.
 * Other modules must go through this service — never the repository directly.
 */
export class UserService {
  private readonly repo = new UserRepository();

  async listUsers(): Promise<UserModel[]> {
    return this.repo.findAll();
  }

  async getUserById(id: string): Promise<UserModel> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async getUserByEmail(email: string): Promise<UserModel | null> {
    return this.repo.findByEmail(email);
  }

  async verifyCredentials(email: string, password: string): Promise<UserModel> {
    const user = await this.repo.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return user;
  }

  async createUser(input: CreateUserInput): Promise<UserModel> {
    // Check uniqueness
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`User with email "${input.email}" already exists`);
    }

    let passwordHash: string | null = null;
    if (input.password) {
      passwordHash = await hash(input.password, 10);
    }

    const user = await this.repo.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });

    // Publish event for other modules to react to
    notificationService.publish(EventType.USER_CREATED, {
      userId: user.id,
      email: user.email,
    });

    return user;
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<UserModel> {
    if (Object.keys(input).length === 0) {
      throw new ValidationError('At least one field must be provided');
    }

    // Check uniqueness if email is being changed
    if (input.email) {
      const existing = await this.repo.findByEmail(input.email);
      if (existing && existing.id !== id) {
        throw new ConflictError(`User with email "${input.email}" already exists`);
      }
    }

    let passwordHash: string | undefined = undefined;
    if (input.password) {
      passwordHash = await hash(input.password, 10);
    }

    const user = await this.repo.update(id, {
      email: input.email,
      name: input.name,
      passwordHash,
    });
    if (!user) throw new NotFoundError('User');

    notificationService.publish(EventType.USER_UPDATED, {
      userId: user.id,
      changes: input as Record<string, unknown>,
    });

    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError('User');

    notificationService.publish(EventType.USER_DELETED, { userId: id });
  }
}
