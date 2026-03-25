import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/db/prisma';
import { UserRole } from '@prisma/client';
import { Logger } from '../src/utils/Logger';

/**
 * Script de seed para criar usuários de teste
 * Execução: npm run ts-node scripts/seed-users.ts
 */

async function seedTestUsers() {
  try {
    Logger.info('Seed Users', 'Iniciando criação de usuários de teste...');

    // Usuário de teste: Passageiro
    const passageiroPhone = '11987654321';
    const passageiroPassword = '12345678';

    const existingPassageiro = await prisma.user.findUnique({
      where: { phone: passageiroPhone },
    });

    if (!existingPassageiro) {
      const passwordHash = await bcrypt.hash(passageiroPassword, 10);
      const passageiro = await prisma.user.create({
        data: {
          phone: passageiroPhone,
          passwordHash,
          role: UserRole.PASSENGER,
        },
      });

      await prisma.passenger.create({
        data: {
          id: passageiro.id,
          userId: passageiro.id,
        },
      });

      Logger.info('Seed Users', 'Passageiro criado com sucesso', {
        phone: passageiroPhone,
        role: 'PASSENGER',
      });
    } else {
      Logger.info('Seed Users', 'Passageiro já existe', {
        phone: passageiroPhone,
      });
    }

    // Usuário de teste: Motorista
    const motoristaPhone = '11912345678';
    const motoristaPassword = '12345678';

    const existingMotorista = await prisma.user.findUnique({
      where: { phone: motoristaPhone },
    });

    if (!existingMotorista) {
      const passwordHash = await bcrypt.hash(motoristaPassword, 10);
      const motorista = await prisma.user.create({
        data: {
          phone: motoristaPhone,
          passwordHash,
          role: UserRole.DRIVER,
        },
      });

      await prisma.driver.create({
        data: {
          id: motorista.id,
          userId: motorista.id,
        },
      });

      Logger.info('Seed Users', 'Motorista criado com sucesso', {
        phone: motoristaPhone,
        role: 'DRIVER',
      });
    } else {
      Logger.info('Seed Users', 'Motorista já existe', {
        phone: motoristaPhone,
      });
    }

    Logger.info('Seed Users', 'Usuários de teste prontos para login', {
      passageiro: {
        phone: passageiroPhone,
        password: passageiroPassword,
      },
      motorista: {
        phone: motoristaPhone,
        password: motoristaPassword,
      },
    });

    process.exit(0);
  } catch (error) {
    Logger.error('Seed Users', 'Erro ao criar usuários de teste', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

seedTestUsers();
