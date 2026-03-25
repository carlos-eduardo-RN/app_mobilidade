import 'dotenv/config';
import http from 'http';
import express from 'express';
import { Logger } from './utils/Logger';
import { buildRoutes } from './routes';
import { ApplicationService } from './services/ApplicationService';
import { EventPublisher } from './events/EventPublisher';
import { RealtimeGateway } from './realtime/gateway';
import { RealtimeBridge } from './realtime/bridge';

import {
  PrismaDriverRepository,
  PrismaRideRepository,
  PrismaUserRepository,
  PrismaLocationRepository,
  PrismaDriverStatusRepository,
} from './repositories/PrismaRepositories';

const app = express();

/**
 * ==========================
 * CORS
 * ==========================
 */

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isDevelopment = process.env.NODE_ENV !== 'production';

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (isDevelopment) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'false');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

/**
 * ==========================
 * Middlewares
 * ==========================
 */

app.use(express.json());

/**
 * ==========================
 * Health check
 * ==========================
 */

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'voudemoto-backend',
    time: new Date().toISOString(),
  });
});

/**
 * ==========================
 * Root endpoint
 * ==========================
 */

app.get('/', (_req, res) => {
  res.json({
    message: 'VouDeMoto backend running',
    health: '/health',
  });
});

/**
 * ==========================
 * Services / DI
 * ==========================
 */

const eventPublisher = new EventPublisher();

const appService = new ApplicationService(
  new PrismaUserRepository(),
  new PrismaDriverRepository(),
  new PrismaRideRepository(),
  new PrismaLocationRepository(),
  new PrismaDriverStatusRepository(),
  eventPublisher
);

/**
 * ==========================
 * Routes
 * ==========================
 */

app.use(buildRoutes(appService));

/**
 * ==========================
 * Server
 * ==========================
 */

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

const server = http.createServer(app);

/**
 * ==========================
 * Realtime
 * ==========================
 */

const realtimeGateway = new RealtimeGateway(server);

const realtimeBridge = new RealtimeBridge(
  eventPublisher,
  appService.rideService,
  realtimeGateway
);

realtimeBridge.attach();

/**
 * ==========================
 * Start server
 * ==========================
 */

server.listen(PORT, HOST, () => {
  Logger.info('Bootstrap', `Backend running on http://${HOST}:${PORT}`);
  Logger.info(
    'Bootstrap',
    `Health check available at http://${HOST}:${PORT}/health`
  );
});