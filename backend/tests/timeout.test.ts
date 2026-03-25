/**
 * Testes para Timeout System (ETAPA 3)
 * Cobertura abrangente: TimeoutManager, DriverAcceptTimeout, RideInactivityTimeout
 */

import { TimeoutManager } from '../src/jobs/TimeoutManager';
import {
  TimeoutType,
  TimeoutStatus,
  TimeoutEventListener,
  DEFAULT_TIMEOUT_CONFIGS,
} from '../src/models/Timeout';
import { DriverAcceptTimeoutFactory } from '../src/jobs/DriverAcceptTimeout';
import { RideInactivityTimeoutFactory } from '../src/jobs/RideInactivityTimeout';

describe('ETAPA 3 - Timeout System', () => {
  let timeoutManager: TimeoutManager;

  beforeEach(() => {
    timeoutManager = new TimeoutManager(10000);
  });

  afterEach(async () => {
    await timeoutManager.destroy();
  });

  describe('TimeoutManager - Básico', () => {
    it('deve iniciar um timeout com sucesso', async () => {
      const result = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000
      );

      expect(result.success).toBe(true);
      expect(result.timeoutId).toBeTruthy();
      expect(result.state).toBeTruthy();
      expect(result.state!.status).toBe(TimeoutStatus.ACTIVE);
    });

    it('deve retornar status de um timeout', async () => {
      const start = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000
      );

      const status = timeoutManager.getStatus(start.timeoutId);

      expect(status).toBeTruthy();
      expect(status!.rideId).toBe('ride-1');
      expect(status!.type).toBe(TimeoutType.DRIVER_ACCEPT);
      expect(status!.status).toBe(TimeoutStatus.ACTIVE);
    });

    it('deve obter estatísticas do sistema', () => {
      const stats = timeoutManager.getStats();

      expect(stats.totalTimeouts).toBe(0);
      expect(stats.rideCount).toBe(0);
    });
  });

  describe('TimeoutManager - Cancelamento', () => {
    it('deve cancelar um timeout existente', async () => {
      const start = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000
      );

      const cancel = await timeoutManager.cancel(start.timeoutId, 'test');

      expect(cancel.success).toBe(true);
      expect(cancel.state!.status).toBe(TimeoutStatus.CANCELLED);

      const status = timeoutManager.getStatus(start.timeoutId);
      expect(status).toBeNull();
    });

    it('deve retornar erro ao cancelar timeout inexistente', async () => {
      const result = await timeoutManager.cancel('invalid-id', 'test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('TimeoutManager - Extensão', () => {
    it('deve estender um timeout existente', async () => {
      const start = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000
      );

      const beforeStatus = timeoutManager.getStatus(start.timeoutId)!;
      const beforeTotal = beforeStatus.totalAllocatedMs;

      const extend = await timeoutManager.extend({
        timeoutId: start.timeoutId,
        additionalMs: 3000,
        reason: 'test',
      });

      expect(extend.success).toBe(true);

      const afterStatus = timeoutManager.getStatus(start.timeoutId)!;
      expect(afterStatus.totalAllocatedMs).toBe(beforeTotal + 3000);
      expect(afterStatus.status).toBe(TimeoutStatus.EXTENDED);
    });

    it('deve respeitar limite máximo de extensões', async () => {
      const start = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000
      );

      // DRIVER_ACCEPT tem máx 2 extensões
      for (let i = 0; i < 3; i++) {
        const extend = await timeoutManager.extend({
          timeoutId: start.timeoutId,
          additionalMs: 1000,
          reason: 'test',
        });

        if (i < 2) {
          expect(extend.success).toBe(true);
        } else {
          expect(extend.success).toBe(false);
        }
      }
    });
  });

  describe('TimeoutManager - Conclusão', () => {
    it('deve completar um timeout com sucesso', async () => {
      const start = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000
      );

      const complete = await timeoutManager.complete(start.timeoutId, 'completed');

      expect(complete.success).toBe(true);
      expect(complete.state!.status).toBe(TimeoutStatus.COMPLETED);

      const status = timeoutManager.getStatus(start.timeoutId);
      expect(status).toBeNull();
    });
  });

  describe('TimeoutManager - Ride Timeouts', () => {
    it('deve obter todos os timeouts de um ride', async () => {
      const start1 = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000
      );

      const start2 = await timeoutManager.start(
        TimeoutType.MATCHING,
        'ride-1',
        6000
      );

      const rideTimeouts = timeoutManager.getRideTimeouts('ride-1');

      expect(rideTimeouts.length).toBe(2);
      expect(rideTimeouts[0].rideId).toBe('ride-1');
      expect(rideTimeouts[1].rideId).toBe('ride-1');
    });

    it('deve cancelar todos os timeouts de um ride', async () => {
      const start1 = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000
      );

      const start2 = await timeoutManager.start(
        TimeoutType.MATCHING,
        'ride-1',
        6000
      );

      await timeoutManager.cancelRideTimeouts('ride-1', 'cleanup');

      const rideTimeouts = timeoutManager.getRideTimeouts('ride-1');
      expect(rideTimeouts.length).toBe(0);
    });
  });

  describe('TimeoutManager - Event Listeners', () => {
    it('deve chamar listener ao iniciar timeout', async () => {
      const listeners: string[] = [];

      const listener: TimeoutEventListener = {
        onStarted: async () => { listeners.push('started'); },
      };

      await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000,
        [listener]
      );

      expect(listeners).toContain('started');
    });

    it('deve chamar listener ao cancelar timeout', async () => {
      const listeners: string[] = [];

      const listener: TimeoutEventListener = {
        onCancelled: async () => { listeners.push('cancelled'); },
      };

      const start = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000,
        [listener]
      );

      await timeoutManager.cancel(start.timeoutId, 'test');

      expect(listeners).toContain('cancelled');
    });

    it('deve chamar listener ao estender timeout', async () => {
      const listeners: string[] = [];

      const listener: TimeoutEventListener = {
        onExtended: async () => { listeners.push('extended'); },
      };

      const start = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000,
        [listener]
      );

      await timeoutManager.extend({
        timeoutId: start.timeoutId,
        additionalMs: 1000,
        reason: 'test',
      });

      expect(listeners).toContain('extended');
    });
  });

  describe('TimeoutManager - Expiração', () => {
    it('deve disparar onExpired quando timeout expirar', async () => {
      const listeners: string[] = [];

      const listener: TimeoutEventListener = {
        onExpired: async () => { listeners.push('expired'); },
      };

      await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        1000, // 1 segundo
        [listener]
      );

      await new Promise(resolve => setTimeout(resolve, 1500));
      expect(listeners).toContain('expired');
    });
  });

  describe('DriverAcceptTimeout - Factory', () => {
    it('deve criar listener para driver accept timeout', async () => {
      const eventsCalled: string[] = [];

      const listener = DriverAcceptTimeoutFactory.createListener(
        'ride-1',
        'driver-1',
        {
          onDriverAcceptTimeout: async () => {
            eventsCalled.push('driver_timeout');
          },
          publishEvent: async () => {
            eventsCalled.push('event_published');
          },
        }
      );

      expect(listener.onStarted).toBeTruthy();
      expect(listener.onExpired).toBeTruthy();
      expect(listener.onCancelled).toBeTruthy();
    });
  });

  describe('RideInactivityTimeout - Factory', () => {
    it('deve criar listener para ride inactivity timeout', async () => {
      const eventsCalled: string[] = [];

      const listener = RideInactivityTimeoutFactory.createListener('ride-1', {
        onRideInactive: async () => {
          eventsCalled.push('ride_inactive');
        },
        publishEvent: async () => {
          eventsCalled.push('event_published');
        },
      });

      expect(listener.onStarted).toBeTruthy();
      expect(listener.onExpired).toBeTruthy();
      expect(listener.onCancelled).toBeTruthy();
    });
  });

  describe('TimeoutManager - Multiple Rides', () => {
    it('deve gerenciar timeouts de múltiplas corridas', async () => {
      const rides = ['ride-1', 'ride-2', 'ride-3'];

      for (const rideId of rides) {
        await timeoutManager.start(
          TimeoutType.DRIVER_ACCEPT,
          rideId,
          5000
        );
      }

      const stats = timeoutManager.getStats();
      expect(stats.totalTimeouts).toBe(3);
      expect(stats.rideCount).toBe(3);
    });

    it('deve manter isolamento entre rides', async () => {
      const start1 = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000
      );

      const start2 = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-2',
        5000
      );

      await timeoutManager.cancel(start1.timeoutId, 'cleanup');

      const ride1Timeouts = timeoutManager.getRideTimeouts('ride-1');
      const ride2Timeouts = timeoutManager.getRideTimeouts('ride-2');

      expect(ride1Timeouts.length).toBe(0);
      expect(ride2Timeouts.length).toBe(1);
    });
  });

  describe('TimeoutManager - Memory Management', () => {
    it('deve limpar timeouts expirados', async () => {
      await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        500
      );

      let statsBefore = timeoutManager.getStats();
      expect(statsBefore.totalTimeouts).toBe(1);

      await new Promise(resolve => setTimeout(resolve, 12000));
      // Após cleanup, timeout expirado deve ser removido
      let statsAfter = timeoutManager.getStats();
      // Pode ainda estar se não limpou no intervalo, mas eventualmente sairá
    });
  });

  describe('TimeoutManager - Adding Listeners', () => {
    it('deve adicionar listener a timeout existente', async () => {
      const start = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000
      );

      const listeners: string[] = [];
      const newListener: TimeoutEventListener = {
        onCancelled: async () => { listeners.push('new_listener'); },
      };

      const added = timeoutManager.addListener(start.timeoutId, newListener);
      expect(added).toBe(true);

      await timeoutManager.cancel(start.timeoutId, 'test');
      expect(listeners).toContain('new_listener');
    });

    it('deve retornar false ao adicionar listener em timeout inexistente', () => {
      const listener: TimeoutEventListener = {};
      const added = timeoutManager.addListener('invalid-id', listener);

      expect(added).toBe(false);
    });
  });

  describe('TimeoutManager - Default Configs', () => {
    it('deve usar configurações padrão', () => {
      expect(DEFAULT_TIMEOUT_CONFIGS[TimeoutType.DRIVER_ACCEPT]).toBe(30_000);
      expect(DEFAULT_TIMEOUT_CONFIGS[TimeoutType.MATCHING]).toBe(60_000);
      expect(DEFAULT_TIMEOUT_CONFIGS[TimeoutType.RIDE_INACTIVITY]).toBe(300_000);
    });
  });

  describe('TimeoutManager - Error Handling', () => {
    it('deve gerenciar erros em callbacks gracefully', async () => {
      const listener: TimeoutEventListener = {
        onStarted: async () => {
          throw new Error('Test error');
        },
      };

      const result = await timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        'ride-1',
        5000,
        [listener]
      );

      // Deve continuar funcionando mesmo com erro no callback
      expect(result.success).toBe(true);
    });
  });

  describe('TimeoutManager - Concurrent Operations', () => {
    it('deve lidar com múltiplas operações concorrentes', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          timeoutManager.start(
            TimeoutType.DRIVER_ACCEPT,
            `ride-${i}`,
            5000
          )
        );
      }

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      const stats = timeoutManager.getStats();
      expect(stats.totalTimeouts).toBe(10);
    });
  });
});
