import { Router } from 'express';

import { DriverController } from './controllers/DriverController';
import { PassengerController } from './controllers/PassengerController';
import { AuthController } from './controllers/AuthController';

import { jwtAuth } from './middlewares/jwtAuth';
import { requireRole } from './middlewares/requireRole';

import { IApplicationDriverContext } from './services/IApplicationDriverContext';
import { IApplicationPassengerContext } from './services/IApplicationPassengerContext';

export const buildRoutes = (
  appService: IApplicationDriverContext & IApplicationPassengerContext
): Router => {
  const routes = Router();

  /**
   * ==========================
   * Controllers
   * ==========================
   */
  const driverController = new DriverController(appService);
  const passengerController = new PassengerController(appService);
  const authController = new AuthController();

  /**
   * ==========================
   * Rotas de Autenticação
   * ==========================
   */

  routes.post('/api/auth/register', (req, res, next) =>
    authController.register(req, res, next)
  );

  routes.post('/api/auth/login', (req, res, next) =>
    authController.login(req, res, next)
  );

  routes.post('/api/auth/driver/login', (req, res, next) =>
    authController.driverLogin(req, res, next)
  );

  /**
   * ==========================
   * Middleware de autenticacao
   * ==========================
   */
  routes.use('/api/driver', jwtAuth, requireRole(['DRIVER']));
  routes.use('/api/passenger', jwtAuth, requireRole(['PASSENGER']));

  /**
   * ==========================
   * Rotas do motorista
   * ==========================
   */

  routes.post('/api/driver/status/online', (req, res, next) =>
    driverController.goOnline(req, res, next)
  );

  routes.post('/api/driver/status/offline', (req, res, next) =>
    driverController.goOffline(req, res, next)
  );

  routes.get('/api/driver/status', (req, res, next) =>
    driverController.getStatus(req, res, next)
  );

  routes.post('/api/driver/location', (req, res, next) =>
    driverController.updateLocation(req, res, next)
  );

  routes.get('/api/driver/rides', (req, res, next) =>
    driverController.listRides(req, res, next)
  );

  routes.post('/api/driver/rides/:rideId/accept', (req, res, next) =>
    driverController.acceptRide(req, res, next)
  );

  routes.post('/api/driver/rides/:rideId/start', (req, res, next) =>
    driverController.startRide(req, res, next)
  );

  routes.post('/api/driver/rides/:rideId/finish', (req, res, next) =>
    driverController.finishRide(req, res, next)
  );

  routes.post('/api/driver/rides/:rideId/cancel', (req, res, next) =>
    driverController.cancelRide(req, res, next)
  );

  routes.get('/api/driver/rides/:rideId/live', (req, res, next) =>
    driverController.getLiveRide(req, res, next)
  );

  /**
   * ==========================
   * Rotas do passageiro
   * ==========================
   */

  routes.post('/api/passenger/rides', (req, res, next) =>
    passengerController.createRide(req, res, next)
  );

  routes.get('/api/passenger/rides', (req, res, next) =>
    passengerController.listRides(req, res, next)
  );

  routes.get('/api/passenger/rides/:rideId', (req, res, next) =>
    passengerController.getRide(req, res, next)
  );

  routes.post('/api/passenger/rides/:rideId/cancel', (req, res, next) =>
    passengerController.cancelRide(req, res, next)
  );

  routes.post('/api/passenger/rides/:rideId/start-matching', (req, res, next) =>
    passengerController.startMatching(req, res, next)
  );

  routes.get('/api/passenger/rides/:rideId/live', (req, res, next) =>
    passengerController.getLiveRide(req, res, next)
  );

  return routes;
};

export default buildRoutes;
