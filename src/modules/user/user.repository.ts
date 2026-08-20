import { v4 as uuidv4 } from 'uuid';
import { dbQueryDuration } from '@infrastructure/metrics/metrics';
import {
  UserModelDef,
  type UserModel,
  type UserCreationAttributes,
  type UserAttributes,
} from './user.model';
import type { CreateUserInput, UpdateUserInput } from './user.validator';

/**
 * Data access layer for User.
 * NEVER exported from the module's public API (index.ts).
 * Other modules MUST NOT import this directly.
 */
export class UserRepository {
  private readonly model = UserModelDef;

  async findAll(): Promise<UserModel[]> {
    const end = dbQueryDuration.startTimer({ operation: 'findAll', model: 'User' });
    const users = await this.model.findAll({ order: [['created_at', 'DESC']] });
    end();
    return users;
  }

  async findById(id: string): Promise<UserModel | null> {
    const end = dbQueryDuration.startTimer({ operation: 'findById', model: 'User' });
    const user = await this.model.findByPk(id);
    end();
    return user;
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    const end = dbQueryDuration.startTimer({ operation: 'findByEmail', model: 'User' });
    const user = await this.model.findOne({ where: { email } });
    end();
    return user;
  }

  async create(input: CreateUserInput & { passwordHash?: string | null }): Promise<UserModel> {
    const end = dbQueryDuration.startTimer({ operation: 'create', model: 'User' });
    const user = await this.model.create({
      id: uuidv4(),
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash ?? null,
    } as UserCreationAttributes);
    end();
    return user;
  }

  async update(
    id: string,
    input: UpdateUserInput & { passwordHash?: string | null },
  ): Promise<UserModel | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const end = dbQueryDuration.startTimer({ operation: 'update', model: 'User' });
    const payload: Partial<UserAttributes> = {};
    if (input.email !== undefined) payload.email = input.email;
    if (input.name !== undefined) payload.name = input.name;
    if (input.passwordHash !== undefined) payload.passwordHash = input.passwordHash;
    await user.update(payload);
    end();
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const end = dbQueryDuration.startTimer({ operation: 'delete', model: 'User' });
    const count = await this.model.destroy({ where: { id } });
    end();
    return count > 0;
  }
}
