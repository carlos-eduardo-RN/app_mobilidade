import {
  DriverStatusType as PrismaDriverStatusType,
  Prisma,
  RideStatus as PrismaRideStatus,
} from '@prisma/client';
import prisma from '../db/prisma';
import {
  IUserRepository,
  IDriverRepository,
  IRideRepository,
  ILocationRepository,
  IDriverStatusRepository,
  RideUpdateWhereConditions,
  RideUpdateWhereData,
} from './IRepository';
import { DriverStatus, DriverStatusType } from '../models/DriverStatus';
import { Location } from '../models/Location';
import { Ride, RideStatusChange, RideStatus } from '../models/Ride';

/* ======================================================
   MAPPER
====================================================== */

type RideRecordWithHistory = Prisma.RideGetPayload<{
  include: { statusHistory: true };
}>;

function toPrismaRideStatus(status: RideStatus): PrismaRideStatus {
  return status as unknown as PrismaRideStatus;
}

function toDomainRideStatus(status: PrismaRideStatus): RideStatus {
  return status as unknown as RideStatus;
}

function mapRide(record: RideRecordWithHistory): Ride {
  return {
    id: record.id,
    passengerId: record.passengerId,
    driverId: record.driverId ?? undefined,
    status: toDomainRideStatus(record.status),
    version: record.version,

    pickupLocation: {
      latitude: record.pickupLat,
      longitude: record.pickupLng,
    },

    dropoffLocation: {
      latitude: record.dropoffLat,
      longitude: record.dropoffLng,
    },

    driverLocation:
      record.driverLocationLat != null && record.driverLocationLng != null
      ? {
          latitude: record.driverLocationLat,
          longitude: record.driverLocationLng,
          accuracy: record.driverLocationAccuracy ?? undefined,
          timestamp: record.driverLocationTimestamp ?? new Date(),
        }
      : undefined,

    createdAt: record.createdAt,
    startedAt: record.startedAt ?? undefined,
    finishedAt: record.finishedAt ?? undefined,
    cancelledAt: record.cancelledAt ?? undefined,
    lastStatusUpdate: record.lastStatusUpdate,
    cancelReason: record.cancelReason ?? undefined,
    notes: record.notes ?? undefined,

    statusHistory: record.statusHistory.map((entry) => ({
      status: toDomainRideStatus(entry.status),
      timestamp: entry.timestamp,
      reason: entry.reason ?? undefined,
      changedBy: entry.changedBy ?? undefined,
    })),
  };
}

function mapLocation(
  latitude?: number | null,
  longitude?: number | null,
  accuracy?: number | null,
  timestamp?: Date | null
): Location | null {
  if (latitude == null || longitude == null || !timestamp) {
    return null;
  }

  return {
    latitude,
    longitude,
    accuracy: accuracy ?? undefined,
    timestamp,
  };
}

function toDomainDriverStatus(status: PrismaDriverStatusType): DriverStatusType {
  return status as unknown as DriverStatusType;
}

function toPrismaDriverStatus(status: DriverStatusType): PrismaDriverStatusType {
  return status as unknown as PrismaDriverStatusType;
}

function mapDriverStatus(record: {
  id: string;
  status: PrismaDriverStatusType;
  currentRideId: string | null;
  lastLocationAt: Date | null;
  updatedAt: Date;
}): DriverStatus {
  return {
    driverId: record.id,
    status: toDomainDriverStatus(record.status),
    currentRideId: record.currentRideId ?? undefined,
    lastLocationUpdate: record.lastLocationAt ?? record.updatedAt,
    updatedAt: record.updatedAt,
  };
}

/* ======================================================
   USER REPOSITORY
====================================================== */

export class PrismaUserRepository implements IUserRepository {
  async save(entity: any): Promise<any> {
    return prisma.user.create({ data: entity });
  }

  async findById(id: string): Promise<any | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findAll(): Promise<any[]> {
    return prisma.user.findMany();
  }

  async delete(id: string): Promise<boolean> {
    await prisma.user.delete({ where: { id } });
    return true;
  }

  async update(id: string, entity: Partial<any>): Promise<any> {
    return prisma.user.update({ where: { id }, data: entity });
  }

  async findByEmail(email: string): Promise<any | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByPhone(phone: string): Promise<any | null> {
    return prisma.user.findUnique({ where: { phone } });
  }

  async findByRole(role: string): Promise<any[]> {
    return prisma.user.findMany({ where: { role: role as any } });
  }
}

/* ======================================================
   DRIVER REPOSITORY
====================================================== */

export class PrismaDriverRepository implements IDriverRepository {
  async save(entity: any): Promise<any> {
    return prisma.driver.create({ data: entity });
  }

  async findById(id: string): Promise<any | null> {
    return prisma.driver.findUnique({ where: { id } });
  }

  async findAll(): Promise<any[]> {
    return prisma.driver.findMany();
  }

  async delete(id: string): Promise<boolean> {
    await prisma.driver.delete({ where: { id } });
    return true;
  }

  async update(id: string, entity: Partial<any>): Promise<any> {
    return prisma.driver.update({ where: { id }, data: entity });
  }

  async findActiveDrivers(): Promise<any[]> {
    return prisma.driver.findMany({
      where: { active: true, isBlocked: false },
    });
  }

  async findDriversByStatus(status: string): Promise<any[]> {
    return prisma.driver.findMany({
      where: { status: status as any },
    });
  }

  async findDriversInRadius(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<any[]> {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.1));

    return prisma.driver.findMany({
      where: {
        active: true,
        isBlocked: false,
        lastLat: {
          gte: latitude - latDelta,
          lte: latitude + latDelta,
        },
        lastLng: {
          gte: longitude - lngDelta,
          lte: longitude + lngDelta,
        },
      },
    });
  }
}

/* ======================================================
   RIDE REPOSITORY
====================================================== */

export class PrismaRideRepository implements IRideRepository {
  async save(entity: Ride): Promise<Ride> {
    const data: Prisma.RideUncheckedCreateInput = {
      id: entity.id,
      passengerId: entity.passengerId,
      driverId: entity.driverId ?? null,
      status: toPrismaRideStatus(entity.status),
      version: entity.version ?? 1,
      pickupLat: entity.pickupLocation.latitude,
      pickupLng: entity.pickupLocation.longitude,
      dropoffLat: entity.dropoffLocation.latitude,
      dropoffLng: entity.dropoffLocation.longitude,
      driverLocationLat: entity.driverLocation?.latitude ?? null,
      driverLocationLng: entity.driverLocation?.longitude ?? null,
      driverLocationAccuracy: entity.driverLocation?.accuracy ?? null,
      driverLocationTimestamp: entity.driverLocation?.timestamp ?? null,
      createdAt: entity.createdAt,
      startedAt: entity.startedAt ?? null,
      finishedAt: entity.finishedAt ?? null,
      cancelledAt: entity.cancelledAt ?? null,
      lastStatusUpdate: entity.lastStatusUpdate,
      cancelReason: entity.cancelReason ?? null,
      notes: entity.notes ?? null,
    };

    const created = await prisma.ride.create({
      data: {
        ...data,
        statusHistory: {
          createMany: {
            data: entity.statusHistory.map((s) => ({
              status: toPrismaRideStatus(s.status),
              timestamp: s.timestamp,
              changedBy: s.changedBy ?? null,
              reason: s.reason ?? null,
            })),
          },
        },
      },

      include: { statusHistory: true },
    });

    return mapRide(created);
  }

  async findById(id: string): Promise<Ride | null> {
    const ride = await prisma.ride.findUnique({
      where: { id },
      include: { statusHistory: true },
    });

    if (!ride) return null;

    return mapRide(ride);
  }

  async findAll(): Promise<Ride[]> {
    const rides = await prisma.ride.findMany({
      include: { statusHistory: true },
    });

    return rides.map((r) => mapRide(r));
  }

  async delete(id: string): Promise<boolean> {
    await prisma.ride.delete({ where: { id } });
    return true;
  }

  async update(id: string, entity: Partial<Ride>): Promise<Ride> {
    const data: Prisma.RideUncheckedUpdateInput = {};

    if (entity.passengerId !== undefined) data.passengerId = entity.passengerId;
    if (entity.driverId !== undefined) data.driverId = entity.driverId ?? null;

    if (entity.status !== undefined) {
      data.status = toPrismaRideStatus(entity.status);
      data.version = { increment: 1 };
    }

    if (entity.pickupLocation !== undefined) {
      data.pickupLat = entity.pickupLocation.latitude;
      data.pickupLng = entity.pickupLocation.longitude;
    }

    if (entity.dropoffLocation !== undefined) {
      data.dropoffLat = entity.dropoffLocation.latitude;
      data.dropoffLng = entity.dropoffLocation.longitude;
    }

    if (entity.driverLocation !== undefined) {
      data.driverLocationLat = entity.driverLocation?.latitude ?? null;
      data.driverLocationLng = entity.driverLocation?.longitude ?? null;
      data.driverLocationAccuracy = entity.driverLocation?.accuracy ?? null;
      data.driverLocationTimestamp = entity.driverLocation?.timestamp ?? null;
    }

    if (entity.createdAt !== undefined) data.createdAt = entity.createdAt;
    if (entity.startedAt !== undefined) data.startedAt = entity.startedAt ?? null;
    if (entity.finishedAt !== undefined) data.finishedAt = entity.finishedAt ?? null;
    if (entity.cancelledAt !== undefined) {
      data.cancelledAt = entity.cancelledAt ?? null;
    }
    if (entity.lastStatusUpdate !== undefined) {
      data.lastStatusUpdate = entity.lastStatusUpdate;
    }
    if (entity.cancelReason !== undefined) {
      data.cancelReason = entity.cancelReason ?? null;
    }
    if (entity.notes !== undefined) data.notes = entity.notes ?? null;

    const updated = await prisma.ride.update({
      where: { id },
      data,
      include: { statusHistory: true },
    });

    return mapRide(updated);
  }

  async findByPassengerId(passengerId: string): Promise<Ride[]> {
    const rides = await prisma.ride.findMany({
      where: { passengerId },
      include: { statusHistory: true },
    });

    return rides.map((r) => mapRide(r));
  }

  async findByDriverId(driverId: string): Promise<Ride[]> {
    const rides = await prisma.ride.findMany({
      where: { driverId },
      include: { statusHistory: true },
    });

    return rides.map((r) => mapRide(r));
  }

  async findActiveRides(): Promise<Ride[]> {
    const rides = await prisma.ride.findMany({
      where: {
        status: {
          notIn: [
            toPrismaRideStatus(RideStatus.COMPLETED),
            toPrismaRideStatus(RideStatus.CANCELLED),
          ],
        },
      },
      include: { statusHistory: true },
    });

    return rides.map((r) => mapRide(r));
  }

  async findByStatus(status: RideStatus): Promise<Ride[]> {
    const rides = await prisma.ride.findMany({
      where: { status: toPrismaRideStatus(status) },
      include: { statusHistory: true },
    });

    return rides.map((r) => mapRide(r));
  }

  async updateWhere(
    conditions: RideUpdateWhereConditions,
    updates: RideUpdateWhereData
  ): Promise<number> {
    const where: Prisma.RideWhereInput = {};

    if (conditions.id !== undefined) where.id = conditions.id;
    if (conditions.passengerId !== undefined) {
      where.passengerId = conditions.passengerId;
    }
    if (conditions.driverId !== undefined) where.driverId = conditions.driverId;
    if (conditions.status !== undefined) {
      where.status = toPrismaRideStatus(conditions.status);
    }
    if (conditions.statusNotIn !== undefined) {
      where.status = {
        notIn: conditions.statusNotIn.map((status) => toPrismaRideStatus(status)),
      };
    }

    const data: Prisma.RideUncheckedUpdateManyInput = {};

    if (updates.driverId !== undefined) data.driverId = updates.driverId ?? null;
    if (updates.status !== undefined) {
      data.status = toPrismaRideStatus(updates.status);
      data.version = { increment: 1 };
    }
    if (updates.startedAt !== undefined) data.startedAt = updates.startedAt ?? null;
    if (updates.finishedAt !== undefined) data.finishedAt = updates.finishedAt ?? null;
    if (updates.cancelledAt !== undefined) {
      data.cancelledAt = updates.cancelledAt ?? null;
    }
    if (updates.lastStatusUpdate !== undefined) {
      data.lastStatusUpdate = updates.lastStatusUpdate;
    }
    if (updates.cancelReason !== undefined) {
      data.cancelReason = updates.cancelReason ?? null;
    }
    if (updates.notes !== undefined) data.notes = updates.notes ?? null;

    const result = await prisma.ride.updateMany({
      where,
      data,
    });

    return result.count;
  }

  async appendStatusHistory(
    rideId: string,
    statusChange: RideStatusChange
  ): Promise<void> {
    await prisma.rideStatusHistory.create({
      data: {
        rideId,
        status: toPrismaRideStatus(statusChange.status),
        timestamp: statusChange.timestamp,
        changedBy: statusChange.changedBy ?? null,
        reason: statusChange.reason ?? null,
      },
    });
  }
}

/* ======================================================
   LOCATION REPOSITORY
====================================================== */

export class PrismaLocationRepository implements ILocationRepository {
  async save(entity: Location): Promise<Location> {
    return entity;
  }

  async findById(id: string): Promise<Location | null> {
    const driverLocation = await this.getLatestDriverLocation(id);
    if (driverLocation) {
      return driverLocation;
    }

    return this.getLatestPassengerLocation(id);
  }

  async findAll(): Promise<Location[]> {
    return [];
  }

  async delete(id: string): Promise<boolean> {
    return true;
  }

  async update(id: string, entity: Partial<Location>): Promise<Location> {
    const current = await this.findById(id);
    return {
      latitude: entity.latitude ?? current?.latitude ?? 0,
      longitude: entity.longitude ?? current?.longitude ?? 0,
      accuracy: entity.accuracy ?? current?.accuracy,
      timestamp: entity.timestamp ?? current?.timestamp ?? new Date(),
      bearing: entity.bearing ?? current?.bearing,
      speed: entity.speed ?? current?.speed,
    };
  }

  async saveDriverLocation(driverId: string, location: Location): Promise<void> {
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        lastLat: location.latitude,
        lastLng: location.longitude,
        lastAccuracy: location.accuracy ?? null,
        lastLocationAt: location.timestamp,
      },
    });
  }

  async getLatestDriverLocation(driverId: string): Promise<Location | null> {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        lastLat: true,
        lastLng: true,
        lastAccuracy: true,
        lastLocationAt: true,
      },
    });

    if (!driver) {
      return null;
    }

    return mapLocation(
      driver.lastLat,
      driver.lastLng,
      driver.lastAccuracy,
      driver.lastLocationAt
    );
  }

  async savePassengerLocation(passengerId: string, location: Location): Promise<void> {
    await prisma.passenger.update({
      where: { id: passengerId },
      data: {
        lastLat: location.latitude,
        lastLng: location.longitude,
        lastAccuracy: location.accuracy ?? null,
        lastLocationAt: location.timestamp,
      },
    });
  }

  async getLatestPassengerLocation(passengerId: string): Promise<Location | null> {
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      select: {
        lastLat: true,
        lastLng: true,
        lastAccuracy: true,
        lastLocationAt: true,
      },
    });

    if (!passenger) {
      return null;
    }

    return mapLocation(
      passenger.lastLat,
      passenger.lastLng,
      passenger.lastAccuracy,
      passenger.lastLocationAt
    );
  }
}

/* ======================================================
   DRIVER STATUS REPOSITORY
====================================================== */

export class PrismaDriverStatusRepository implements IDriverStatusRepository {
  async save(entity: DriverStatus): Promise<DriverStatus> {
    return entity;
  }

  async findById(id: string): Promise<DriverStatus | null> {
    return this.findByDriverId(id);
  }

  async findAll(): Promise<DriverStatus[]> {
    const drivers = await prisma.driver.findMany({
      select: {
        id: true,
        status: true,
        currentRideId: true,
        lastLocationAt: true,
        updatedAt: true,
      },
    });

    return drivers.map((driver) => mapDriverStatus(driver));
  }

  async delete(id: string): Promise<boolean> {
    return true;
  }

  async update(id: string, entity: Partial<DriverStatus>): Promise<DriverStatus> {
    const updated = await prisma.driver.update({
      where: { id },
      data: {
        status:
          entity.status !== undefined ? toPrismaDriverStatus(entity.status) : undefined,
        currentRideId:
          entity.currentRideId !== undefined ? entity.currentRideId ?? null : undefined,
      },
      select: {
        id: true,
        status: true,
        currentRideId: true,
        lastLocationAt: true,
        updatedAt: true,
      },
    });

    return mapDriverStatus(updated);
  }

  async findByDriverId(driverId: string): Promise<DriverStatus | null> {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        status: true,
        currentRideId: true,
        lastLocationAt: true,
        updatedAt: true,
      },
    });

    if (!driver) {
      return null;
    }

    return mapDriverStatus(driver);
  }

  async setStatus(driverId: string, status: DriverStatusType): Promise<DriverStatus> {
    const updated = await prisma.driver.update({
      where: { id: driverId },
      data: {
        status: toPrismaDriverStatus(status),
      },
      select: {
        id: true,
        status: true,
        currentRideId: true,
        lastLocationAt: true,
        updatedAt: true,
      },
    });

    return mapDriverStatus(updated);
  }
}
