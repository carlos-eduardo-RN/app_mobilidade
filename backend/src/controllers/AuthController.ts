import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';
import { Logger } from '../utils/Logger';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { createJwtService } from '../config/jwt';
import { UserRole } from '../models/Security';

const PASSWORD_REGEX = /^[0-9]{6,}$/;
const ALLOWED_ROLES = new Set(['DRIVER', 'PASSENGER']);
const ROLE_MAP: Record<string, PrismaUserRole> = {
  DRIVER: PrismaUserRole.DRIVER,
  PASSENGER: PrismaUserRole.PASSENGER,
};
const INVALID_CREDENTIALS_RESPONSE = {
  success: false,
  error: 'UNAUTHORIZED',
  message: 'Credenciais invalidas.',
};

type ResolvedRoleContext = {
  role: UserRole;
  hasDriver: boolean;
  hasPassenger: boolean;
};

export class AuthController {
  private jwtService = createJwtService();

  /**
   * POST /auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, password, role } = req.body || {};

      if (!phone || !password) {
        res.status(400).json({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Telefone e senha sao obrigatorios.',
        });
        return;
      }

      if (!PASSWORD_REGEX.test(String(password))) {
        res.status(400).json({
          success: false,
          error: 'WEAK_PASSWORD',
          message: 'A senha deve conter pelo menos 6 numeros.',
        });
        return;
      }

      const normalizedPhone = String(phone).trim();
      const existingUser = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'PHONE_ALREADY_EXISTS',
          message: 'Telefone ja cadastrado.',
        });
        return;
      }

      const desiredRole = String(role ?? '').toUpperCase();
      const selectedRole = ALLOWED_ROLES.has(desiredRole)
        ? ROLE_MAP[desiredRole]
        : PrismaUserRole.PASSENGER;

      const passwordHash = await bcrypt.hash(String(password), 10);

      const user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            phone: normalizedPhone,
            passwordHash,
            role: selectedRole,
          } as any,
        });

        if (selectedRole === 'DRIVER') {
          await tx.driver.create({
            data: {
              id: createdUser.id,
              userId: createdUser.id,
            },
          });
        }

        if (selectedRole === 'PASSENGER') {
          await tx.passenger.create({
            data: {
              id: createdUser.id,
              userId: createdUser.id,
            },
          });
        }

        return createdUser;
      });

      const roleContext = await this.resolveRoleContext(user.id);
      const tokens = await this.jwtService.generateTokens({
        userId: user.id,
        email: user.email ?? user.phone,
        role: roleContext.role,
      });

      res.status(201).json({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer',
        user: {
          id: user.id,
          phone: user.phone,
          role: roleContext.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.loginInternal(req, res, next);
  }

  /**
   * POST /auth/driver/login
   */
  async driverLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.loginInternal(req, res, next, { requireDriver: true });
  }

  private async loginInternal(
    req: Request,
    res: Response,
    next: NextFunction,
    options: { requireDriver?: boolean } = {}
  ): Promise<void> {
    try {
      const { phone, password } = req.body || {};

      if (!phone || !password) {
        res.status(400).json({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Telefone e senha sao obrigatorios.',
        });
        return;
      }

      const normalizedPhone = String(phone).trim();

      const user = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (!user) {
        res.status(401).json(INVALID_CREDENTIALS_RESPONSE);
        return;
      }

      const passwordMatches = await bcrypt.compare(
        String(password),
        (user as any).passwordHash
      );
      if (!passwordMatches) {
        res.status(401).json(INVALID_CREDENTIALS_RESPONSE);
        return;
      }

      const roleContext = await this.resolveRoleContext(user.id);
      if (options.requireDriver && roleContext.role !== UserRole.DRIVER) {
        Logger.warn('AuthController', 'Driver login denied for non-driver user', {
          userId: user.id,
          phone: normalizedPhone,
          role: roleContext.role,
          hasDriver: roleContext.hasDriver,
          hasPassenger: roleContext.hasPassenger,
        });

        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Usuario nao e motorista.',
        });
        return;
      }

      const tokens = await this.jwtService.generateTokens({
        userId: user.id,
        email: user.email ?? user.phone,
        role: roleContext.role,
      });

      Logger.debug(
        'AuthController',
        options.requireDriver ? 'POST /auth/driver/login' : 'POST /auth/login',
        {
          phone: normalizedPhone,
          role: roleContext.role,
        }
      );

      res.status(200).json({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer',
        user: {
          id: user.id,
          phone: user.phone,
          role: roleContext.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  private async resolveRoleContext(userId: string): Promise<ResolvedRoleContext> {
    const [driver, passenger] = await Promise.all([
      prisma.driver.findUnique({
        where: { userId },
        select: { id: true },
      }),
      prisma.passenger.findUnique({
        where: { userId },
        select: { id: true },
      }),
    ]);

    let role = UserRole.PASSENGER;
    if (driver) {
      role = UserRole.DRIVER;
    } else if (passenger) {
      role = UserRole.PASSENGER;
    }

    Logger.info('AuthController', 'User role resolved', {
      userId,
      role,
      hasDriver: !!driver,
      hasPassenger: !!passenger,
    });

    return {
      role,
      hasDriver: !!driver,
      hasPassenger: !!passenger,
    };
  }
}
