/**
 * GUIA DE INTEGRAÇÃO: WEBSOCKET E FCM
 * 
 * Documento técnico sobre como integrar WebSocket e FCM na arquitetura preparada
 */

## ========================================
## 1. IMPLEMENTAR WEBSOCKETCHANNEL
## ========================================

```typescript
// src/realtime/WebSocketChannel.ts

import { IRealtimeChannel, SubscriberId, EventHandler } from './IRealtimeChannel';
import { RealtimeEvent } from './RealtimeEvents';

export class WebSocketChannel implements IRealtimeChannel {
  channelId: string;
  private subscribers: Map<SubscriberId, WebSocket> = new Map();
  private handlers: Map<SubscriberId, EventHandler> = new Map();

  constructor(channelId: string) {
    this.channelId = channelId;
  }

  subscribe(subscriberId: SubscriberId, handler: EventHandler): Subscription {
    // O handler seria o socket.emit()
    this.handlers.set(subscriberId, handler);
    return { subscriberId, channelId: this.channelId, handler, createdAt: new Date() };
  }

  async publish(event: RealtimeEvent): Promise<void> {
    // Enviar para cada WebSocket conectado
    const promises = Array.from(this.handlers.values()).map(handler => handler(event));
    await Promise.all(promises);
  }

  // ...rest da implementação
}
```


## ========================================
## 2. SETUP DE WEBSOCKET COM SOCKET.IO
## ========================================

```typescript
// src/realtime/WebSocketGateway.ts

import { Server, Socket } from 'socket.io';
import { RealtimeService } from './RealtimeService';

export class WebSocketGateway {
  private io: Server;
  private realtimeService: RealtimeService;

  constructor(io: Server, realtimeService: RealtimeService) {
    this.io = io;
    this.realtimeService = realtimeService;
    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.handshake.auth.userId;

      // Passageiro se inscreve na corrida
      socket.on('subscribe:ride', (rideId: string) => {
        const channel = this.realtimeService.getRideChannel(rideId);
        channel.subscribe(socket.id, (event) => {
          socket.emit('ride:event', event);
        });
        socket.join(`ride:${rideId}`);
      });

      // Motorista se inscreve na corrida
      socket.on('subscribe:driver-rides', (driverId: string) => {
        const channel = this.realtimeService.getDriverChannel(driverId);
        channel.subscribe(socket.id, (event) => {
          socket.emit('driver:event', event);
        });
        socket.join(`driver:${driverId}`);
      });

      socket.on('disconnect', () => {
        // Limpar subscriptions
      });
    });
  }
}
```


## ========================================
## 3. INTEGRAR NO express + socket.io
## ========================================

```typescript
// src/index.ts

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import routes from './routes';
import { WebSocketGateway } from './realtime/WebSocketGateway';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
});

const appService = new ApplicationService(...);

// Setup WebSocket
new WebSocketGateway(io, appService.realtimeService);

app.use(express.json());
app.use(routes);

httpServer.listen(3000, () => {
  console.log('Server running on port 3000');
});
```


## ========================================
## 4. PUBLICAR EVENTOS (RideService)
## ========================================

```typescript
// src/services/RideService.ts

// Adicionar ao constructor:
constructor(
  ...,
  private realtimeService: RealtimeService
) {}

// Método existente - adicionar notificação:
async startSearchingDriver(rideId: string): Promise<RideActionResult> {
  const affected = await this.rideRepository.updateWhere(
    { id: rideId, status: RideStatus.CREATED },
    { status: RideStatus.SEARCHING_DRIVER, lastStatusUpdate: new Date() }
  );

  if (affected === 0) {
    return { changed: false, ride: await this.getRideById(rideId) };
  }

  // ... resto do código existente ...

  // NOVO: Publicar evento em tempo real
  const rideChannel = this.realtimeService.getRideChannel(rideId);
  await rideChannel.publish({
    type: 'RIDE_STATUS_CHANGED',
    rideId,
    newStatus: RideStatus.SEARCHING_DRIVER,
    previousStatus: RideStatus.CREATED,
    timestamp: new Date(),
    changedBy: 'system',
  });

  return { changed: true, ride: await this.getRideById(rideId) };
}
```


## ========================================
## 5. PUBLICAR LOCALIZAÇÃO (DriverService)
## ========================================

```typescript
// src/services/DriverService.ts

async updateDriverLocation(driverId: string, location: Location): Promise<void> {
  // ... código existente ...

  // NOVO: Se há corrida ativa, publicar evento
  const rides = await this.rideRepository.findByDriverId(driverId);
  const activeRide = rides.find(r => 
    [RideStatus.DRIVER_ASSIGNED, RideStatus.DRIVER_APPROACHING, RideStatus.IN_PROGRESS]
      .includes(r.status)
  );

  if (activeRide) {
    const rideChannel = this.realtimeService.getRideChannel(activeRide.id);
    await rideChannel.publish({
      type: 'DRIVER_LOCATION_UPDATED',
      rideId: activeRide.id,
      driverId,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        accuracy: location.accuracy,
      },
    });
  }
}
```


## ========================================
## 6. INTEGRAR FCM (Firebase Cloud Messaging)
## ========================================

```typescript
// src/realtime/FCMBroadcaster.ts

import { RealtimeEvent } from './RealtimeEvents';
import * as admin from 'firebase-admin';

export class FCMBroadcaster {
  constructor(private db: admin.database.Database) {}

  async broadcastEvent(event: RealtimeEvent): Promise<void> {
    // Determinar quem deve receber notificação
    let userIds: string[] = [];

    switch (event.type) {
      case 'RIDE_STATUS_CHANGED':
        userIds = await this.getUsersForRide(event.rideId);
        break;
      case 'DRIVER_LOCATION_UPDATED':
        userIds = await this.getPassengersForRide(event.rideId);
        break;
    }

    // Enviar para FCM
    for (const userId of userIds) {
      await admin.messaging().sendToDevice(
        await this.getDeviceTokens(userId),
        {
          notification: {
            title: this.getTitleForEvent(event),
            body: this.getBodyForEvent(event),
          },
          data: {
            eventType: event.type,
            ...event,
          },
        }
      );
    }
  }

  private getTitleForEvent(event: RealtimeEvent): string {
    switch (event.type) {
      case 'RIDE_STATUS_CHANGED':
        return 'Status da corrida atualizado';
      case 'DRIVER_LOCATION_UPDATED':
        return 'Motorista em movimento';
      default:
        return 'Atualização da corrida';
    }
  }

  // ... resto da implementação
}
```

**Integrar com RealtimeService.publish():**

```typescript
// src/realtime/RealtimeService.ts

async publish(event: RealtimeEvent): Promise<void> {
  // Publicar via canal
  const channelId = this.getChannelIdFromEvent(event);
  if (this.channels.has(channelId)) {
    await this.channels.get(channelId)!.publish(event);
  }

  // NOVO: Publicar via FCM também
  if (this.fcmBroadcaster) {
    await this.fcmBroadcaster.broadcastEvent(event);
  }
}
```


## ========================================
## 7. CLIENTE (React Native / Web)
## ========================================

### WebSocket (quando implementado)
```typescript
// Passageiro
const socket = io('http://backend:3000');
socket.on('connect', () => {
  socket.emit('subscribe:ride', rideId);
});
socket.on('ride:event', (event) => {
  // Atualizar mapa em tempo real
  if (event.type === 'DRIVER_LOCATION_UPDATED') {
    updateMarker(event.location);
  }
});
```

### Polling (agora)
```typescript
// Continua funcionando sem mudanças!
useEffect(() => {
  const interval = setInterval(() => {
    fetch(`/api/passenger/rides/${rideId}/live`)
      .then(r => r.json())
      .then(data => updateMap(data));
  }, 2000);
  return () => clearInterval(interval);
}, [rideId]);
```


## ========================================
## 8. VANTAGENS DA ABORDAGEM
## ========================================

✓ Polling continua funcionando (sem breaking changes)
✓ WebSocket é uma implementação alternativa de IRealtimeChannel
✓ FCM é middleware que se conecta ao publish()
✓ Fácil de testar: mock de IRealtimeChannel
✓ Escalável: Redis pode substituir In-Memory
✓ Sem mudanças nos Controllers ou Models
✓ Eventos são agnósticos a delivery mechanism
