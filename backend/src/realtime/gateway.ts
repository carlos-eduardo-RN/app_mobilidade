import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { createJwtService } from '../config/jwt';
import redis from '../db/redis';
import { Logger } from '../utils/Logger';
import { loadValidAdminSession } from '../utils/AdminSessions';

const jwtService = createJwtService();

export type RealtimeUser = {
  userId: string;
  role?: string;
};

type RideEventPayload = {
  ride_id: string;
  timestamp: string;
  version: number;
  event: string;
  data: Record<string, unknown>;
};

type SubscribeMessage = {
  type: 'subscribe';
  ride_id: string;
  since?: number;
};

type UnsubscribeMessage = {
  type: 'unsubscribe';
  ride_id: string;
};

type SubscribeDriverMessage = {
  type: 'subscribe_driver';
  driverId?: string;
};

type ClientMessage = SubscribeMessage | UnsubscribeMessage | SubscribeDriverMessage;

export class RealtimeGateway {
  private wss: WebSocketServer;
  private rideSubscribers = new Map<string, Set<WebSocket>>();
  private userSubscribers = new Map<string, Set<WebSocket>>();
  private connectionUsers = new Map<WebSocket, RealtimeUser>();
  private ttlSeconds: number;
  private wsPath?: string;

  constructor(server: http.Server) {
    this.ttlSeconds = Number(process.env.REALTIME_REPLAY_TTL_SECONDS || '60');
    this.wsPath = process.env.REALTIME_WS_PATH?.trim() || undefined;
    this.wss = new WebSocketServer(
      this.wsPath
        ? {
            server,
            path: this.wsPath,
          }
        : {
            server,
          }
    );

    Logger.info('RealtimeGateway', 'WebSocket endpoint configured', {
      url: this.wsPath ? `ws://<host>:<port>${this.wsPath}` : 'ws://<host>:<port>',
    });

    this.wss.on('connection', (socket: WebSocket, req: http.IncomingMessage) => {
      this.authenticate(req)
        .then((user) => {
          this.connectionUsers.set(socket, user);
          this.attachUserSubscriber(socket, user.userId);

          Logger.info('RealtimeGateway', 'Client connected', {
            userId: user.userId,
            role: user.role,
          });

          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'connect' }));
          }

          socket.on('message', (message: WebSocket.RawData) => {
            this.handleMessage(socket, message.toString());
          });

          socket.on('close', () => {
            this.cleanupConnection(socket);
          });
        })
        .catch((error) => {
          Logger.warn('RealtimeGateway', 'Auth failed', { error: String(error) });
          socket.close();
        });
    });
  }

  async publishRideEvent(rideId: string, payload: RideEventPayload): Promise<void> {
    const eventWithSeq = await this.storeEvent(rideId, payload);
    const subscribers = this.rideSubscribers.get(rideId);
    if (!subscribers) {
      return;
    }

    for (const socket of subscribers) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event: payload.event, payload: eventWithSeq }));
      }
    }
  }

  async publishUserEvent(
    userId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const subscribers = this.userSubscribers.get(userId);
    if (!subscribers) {
      Logger.debug('RealtimeGateway', 'No user subscribers for event delivery', {
        userId,
        type: payload.type,
      });
      return;
    }

    for (const socket of subscribers) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    }
  }

  private async storeEvent(rideId: string, payload: RideEventPayload) {
    const seqKey = `realtime:ride:${rideId}:seq`;
    const eventsKey = `realtime:ride:${rideId}:events`;

    const sequence = await redis.incr(seqKey);
    const enriched = { ...payload, sequence };

    await redis.zadd(eventsKey, String(sequence), JSON.stringify(enriched));
    await redis.expire(eventsKey, this.ttlSeconds);
    await redis.expire(seqKey, this.ttlSeconds);

    return enriched;
  }

  private async replayEvents(rideId: string, since: number, socket: WebSocket) {
    const eventsKey = `realtime:ride:${rideId}:events`;
    const records = await redis.zrangebyscore(eventsKey, since + 1, '+inf');

    for (const raw of records) {
      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }
      const payload = JSON.parse(raw);
      socket.send(JSON.stringify({ event: payload.event, payload }));
    }
  }

  private handleMessage(socket: WebSocket, raw: string) {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }

    if (message.type === 'subscribe') {
      const set = this.rideSubscribers.get(message.ride_id) ?? new Set();
      set.add(socket);
      this.rideSubscribers.set(message.ride_id, set);

      if (message.since) {
        this.replayEvents(message.ride_id, message.since, socket).catch(() => null);
      }
      return;
    }

    if (message.type === 'unsubscribe') {
      const set = this.rideSubscribers.get(message.ride_id);
      if (set) {
        set.delete(socket);
      }
      return;
    }

    if (message.type === 'subscribe_driver') {
      const user = this.connectionUsers.get(socket);
      if (user) {
        this.attachUserSubscriber(socket, user.userId);
      }
    }
  }

  private attachUserSubscriber(socket: WebSocket, userId: string): void {
    const set = this.userSubscribers.get(userId) ?? new Set<WebSocket>();
    set.add(socket);
    this.userSubscribers.set(userId, set);
  }

  private cleanupConnection(socket: WebSocket) {
    const user = this.connectionUsers.get(socket);
    this.connectionUsers.delete(socket);

    if (user) {
      const set = this.userSubscribers.get(user.userId);
      if (set) {
        set.delete(socket);
        if (set.size === 0) {
          this.userSubscribers.delete(user.userId);
        }
      }
    }

    for (const subscribers of this.rideSubscribers.values()) {
      subscribers.delete(socket);
    }
  }

  private async authenticate(req: http.IncomingMessage): Promise<RealtimeUser> {
    const url = new URL(req.url ?? '', 'http://localhost');
    const queryToken = url.searchParams.get('token');
    if (queryToken) {
      try {
        const payload = await jwtService.verifyToken(queryToken);
        if (payload.type === 'access') {
          return { userId: payload.userId, role: payload.role };
        }
      } catch {
        // Continue with other auth mechanisms
      }
    }

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = await jwtService.verifyToken(token);
        if (payload.type === 'access') {
          return { userId: payload.userId, role: payload.role };
        }
      } catch {
        // Continue with other auth mechanisms
      }
    }

    const cookieHeader = req.headers['cookie'];
    if (cookieHeader) {
      const cookie = this.parseCookie(cookieHeader)['admin_session'];
      if (cookie) {
        const session = await loadValidAdminSession(cookie);
        if (session) {
          return { userId: session.adminId, role: 'ADMIN' };
        }
      }
    }

    throw new Error('Unauthorized');
  }

  private parseCookie(header: string): Record<string, string> {
    return header.split(';').reduce((acc, part) => {
      const [key, ...rest] = part.trim().split('=');
      acc[key] = decodeURIComponent(rest.join('='));
      return acc;
    }, {} as Record<string, string>);
  }
}

export function buildRideEvent(
  rideId: string,
  version: number,
  event: string,
  data: Record<string, unknown>
): RideEventPayload {
  return {
    ride_id: rideId,
    timestamp: new Date().toISOString(),
    version,
    event,
    data,
  };
}
