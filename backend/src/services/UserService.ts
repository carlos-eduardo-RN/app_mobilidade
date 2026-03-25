/**
 * User Service
 * Gerenciamento de usuários
 */

import { IUserRepository } from '../repositories/IRepository';
import { User, UserRole, CreateUserDTO } from '../models/User';
import { UserValidator } from '../validators/Validators';
import { NotFoundError, ValidationError } from '../models/Errors';
import { ErrorCode } from '../models/Errors';
import { Logger } from '../utils/Logger';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export class UserService {
  constructor(private userRepository: IUserRepository) {}

  async createUser(dto: CreateUserDTO): Promise<User> {
    Logger.debug('UserService', 'Creating user', { email: dto.email, role: dto.role });

    // Validações
    UserValidator.validateName(dto.name);
    UserValidator.validateEmail(dto.email);
    UserValidator.validatePhone(dto.phone);

    // Verificar se email já existe
    const existingByEmail = await this.userRepository.findByEmail(dto.email);
    if (existingByEmail) {
      throw new ValidationError('Email already registered', { email: dto.email });
    }

    // Verificar se phone já existe
    const existingByPhone = await this.userRepository.findByPhone(dto.phone);
    if (existingByPhone) {
      throw new ValidationError('Phone already registered', { phone: dto.phone });
    }

    const passwordHash = dto.passwordHash ??
      await bcrypt.hash(dto.password ?? uuidv4(), 10);

    const user: User = {
      id: uuidv4(),
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.userRepository.save(user);
    Logger.info('UserService', 'User created successfully', { userId: saved.id, role: saved.role });

    return saved;
  }

  async getUserById(userId: string): Promise<User> {
    Logger.debug('UserService', 'Getting user', { userId });

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(ErrorCode.USER_NOT_FOUND, `User ${userId} not found`);
    }

    return user;
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError(ErrorCode.USER_NOT_FOUND, `User with email ${email} not found`);
    }
    return user;
  }

  async listUsers(role?: UserRole): Promise<User[]> {
    Logger.debug('UserService', 'Listing users', { role });

    if (role) {
      return await this.userRepository.findByRole(role);
    }

    return await this.userRepository.findAll();
  }

  async deleteUser(userId: string): Promise<void> {
    Logger.debug('UserService', 'Deleting user', { userId });

    const user = await this.getUserById(userId); // Verifica se existe
    await this.userRepository.delete(userId);

    Logger.info('UserService', 'User deleted successfully', { userId });
  }
}
