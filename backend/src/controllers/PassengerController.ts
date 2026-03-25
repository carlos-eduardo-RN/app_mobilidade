/**
 * Passenger Controller
 * Endpoints do aplicativo de passageiro
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/Logger';
import { IApplicationPassengerContext } from '../services/IApplicationPassengerContext';

export class PassengerController {
  constructor(private appService: IApplicationPassengerContext) {}

  /**
   * POST /api/passenger/rides
   * Criar nova corrida
   */
  async createRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const passengerId = req.user!.id;

      Logger.debug('PassengerController', 'POST /api/passenger/rides', {
        traceId,
        passengerId,
      });

      const { pickupLocation, dropoffLocation } = req.body;

      const createdRide = await this.appService.rideService.createRide({
        passengerId,
        pickupLocation,
        dropoffLocation,
      });

      const matchingResult = await this.appService.rideService.startSearchingDriver(
        createdRide.id
      );

      Logger.info('PassengerController', 'Ride created and matching started', {
        traceId,
        rideId: createdRide.id,
        passengerId,
        changed: matchingResult.changed,
      });

      res.status(201).json({ success: true, data: matchingResult.ride });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/passenger/rides/:rideId
   * Consultar status da corrida
   */
  async getRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { rideId } = req.params;
      const passengerId = req.user!.id;

      Logger.debug('PassengerController', 'GET /api/passenger/rides/:rideId', {
        traceId,
        rideId,
      });

      const ride = await this.appService.rideService.getRideById(rideId);

      if (ride.passengerId !== passengerId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'You do not own this ride',
        });
        return;
      }

      res.status(200).json({ success: true, data: ride });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/passenger/rides
   * Listar corridas do passageiro
   */
  async listRides(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const passengerId = req.user!.id;

      Logger.debug('PassengerController', 'GET /api/passenger/rides', {
        traceId,
        passengerId,
      });

      const rides = await this.appService.rideService.listRidesByPassenger(passengerId);

      res.status(200).json({ success: true, data: rides });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/passenger/rides/:rideId/cancel
   * Cancelar corrida
   */
  async cancelRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { rideId } = req.params;
      const passengerId = req.user!.id;
      const { reason } = req.body;

      Logger.debug(
        'PassengerController',
        'POST /api/passenger/rides/:rideId/cancel',
        { traceId, rideId, passengerId }
      );

      const ride = await this.appService.rideService.getRideById(rideId);

      if (ride.passengerId !== passengerId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'You do not own this ride',
        });
        return;
      }

      const cancelled = await this.appService.rideService.cancelRide({
        rideId,
        cancelledBy: 'passenger',
        reason,
      });

      Logger.info('PassengerController', 'Ride cancelled successfully', {
        traceId,
        rideId,
        passengerId,
      });

      res.status(200).json({
        success: true,
        data: cancelled.ride,
        changed: cancelled.changed,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/passenger/rides/:rideId/start-matching
   * Iniciar busca por motorista
   */
  async startMatching(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { rideId } = req.params;
      const passengerId = req.user!.id;

      Logger.debug(
        'PassengerController',
        'POST /api/passenger/rides/:rideId/start-matching',
        { traceId, rideId }
      );

      const ride = await this.appService.rideService.getRideById(rideId);

      if (ride.passengerId !== passengerId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'You do not own this ride',
        });
        return;
      }

      const result = await this.appService.rideService.startSearchingDriver(rideId);

      res.status(200).json({
        success: true,
        data: result.ride,
        changed: result.changed,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/passenger/rides/:rideId/live
   * Obter dados live da corrida para polling/streaming
   * Retorna: status, localização do motorista, distância, ETA
   */
  async getLiveRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { rideId } = req.params;
      const passengerId = req.user!.id;

      Logger.debug('PassengerController', 'GET /api/passenger/rides/:rideId/live', {
        traceId,
        rideId,
      });

      const ride = await this.appService.rideService.getRideById(rideId);

      if (ride.passengerId !== passengerId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'You do not own this ride',
        });
        return;
      }

      const liveData = await this.appService.rideService.getLiveRideData(rideId);

      res.status(200).json({ success: true, data: liveData });
    } catch (error) {
      next(error);
    }
  }
}
