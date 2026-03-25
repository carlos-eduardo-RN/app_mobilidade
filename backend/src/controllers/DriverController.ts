/**
 * Driver Controller
 * Endpoints do aplicativo do motorista
 */

import { Request, Response, NextFunction } from 'express';
import { IApplicationDriverContext } from '../services/IApplicationDriverContext';
import { Logger } from '../utils/Logger';

export class DriverController {
  constructor(private appService: IApplicationDriverContext) {}

  async goOnline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const driverId = req.user!.id;

      Logger.debug('DriverController', 'goOnline', { traceId, driverId });

      const status = await this.appService.driverService.setDriverOnline(driverId);

      res.status(200).json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  async goOffline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const driverId = req.user!.id;

      Logger.debug('DriverController', 'goOffline', { traceId, driverId });

      const status = await this.appService.driverService.setDriverOffline(driverId);

      res.status(200).json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const driverId = req.user!.id;

      Logger.debug('DriverController', 'getStatus', { traceId, driverId });

      const status = await this.appService.driverService.getDriverStatus(driverId);

      res.status(200).json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const driverId = req.user!.id;
      const { latitude, longitude, accuracy, bearing, speed } = req.body;

      Logger.debug('DriverController', 'updateLocation', { traceId, driverId });

      await this.appService.driverService.updateDriverLocation(driverId, {
        latitude,
        longitude,
        accuracy,
        bearing,
        speed,
        timestamp: new Date(),
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async acceptRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { rideId } = req.params;
      const driverId = req.user!.id;

      Logger.debug('DriverController', 'acceptRide', { traceId, rideId, driverId });

      const result = await this.appService.rideService.acceptRide({
        rideId,
        driverId,
      });

      if (!result.changed) {
        Logger.info('DriverController', 'acceptRide idempotent', {
          traceId,
          rideId,
          driverId,
        });
      }

      res.status(200).json({ success: true, data: result.ride });
    } catch (error) {
      next(error);
    }
  }

  async startRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { rideId } = req.params;
      const driverId = req.user!.id;

      Logger.debug('DriverController', 'startRide', { traceId, rideId, driverId });

      const result = await this.appService.rideService.startRide({
        rideId,
        driverId,
      });

      if (!result.changed) {
        Logger.info('DriverController', 'startRide idempotent', {
          traceId,
          rideId,
          driverId,
        });
      }

      res.status(200).json({ success: true, data: result.ride });
    } catch (error) {
      next(error);
    }
  }

  async finishRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { rideId } = req.params;
      const driverId = req.user!.id;
      const { finalLocation } = req.body;

      Logger.debug('DriverController', 'finishRide', { traceId, rideId, driverId });

      const result = await this.appService.rideService.finishRide({
        rideId,
        driverId,
        finalLocation,
      });

      if (!result.changed) {
        Logger.info('DriverController', 'finishRide idempotent', {
          traceId,
          rideId,
          driverId,
        });
      }

      res.status(200).json({ success: true, data: result.ride });
    } catch (error) {
      next(error);
    }
  }

  async cancelRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { rideId } = req.params;
      const driverId = req.user!.id;
      const { reason } = req.body;

      Logger.debug('DriverController', 'cancelRide', { traceId, rideId, driverId });

      const ride = await this.appService.rideService.getRideById(rideId);
      if (ride.driverId !== driverId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'You are not assigned to this ride',
        });
        return;
      }

      const result = await this.appService.rideService.cancelRide({
        rideId,
        cancelledBy: 'driver',
        reason,
      });

      if (!result.changed) {
        Logger.info('DriverController', 'cancelRide idempotent', {
          traceId,
          rideId,
          driverId,
        });
      }

      res.status(200).json({ success: true, data: result.ride });
    } catch (error) {
      next(error);
    }
  }

  async listRides(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const driverId = req.user!.id;

      Logger.debug('DriverController', 'listRides', { traceId, driverId });

      const rides = await this.appService.rideService.listRidesByDriver(driverId);

      res.status(200).json({ success: true, data: rides });
    } catch (error) {
      next(error);
    }
  }

  async getLiveRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { rideId } = req.params;
      const driverId = req.user!.id;

      Logger.debug('DriverController', 'GET /api/driver/rides/:rideId/live', {
        traceId,
        rideId,
        driverId,
      });

      const ride = await this.appService.rideService.getRideById(rideId);

      if (ride.driverId !== driverId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'You are not assigned to this ride',
        });
        return;
      }

      const liveData = await this.appService.rideService.getLiveRideDataForDriver(rideId);

      res.status(200).json({ success: true, data: liveData });
    } catch (error) {
      next(error);
    }
  }
}
