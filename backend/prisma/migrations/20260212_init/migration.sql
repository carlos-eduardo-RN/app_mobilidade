CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'SUPPORT', 'DRIVER', 'PASSENGER');
CREATE TYPE "DriverStatusType" AS ENUM ('OFFLINE', 'ONLINE', 'BUSY', 'ON_BREAK');
CREATE TYPE "RideStatus" AS ENUM (
  'created',
  'searching_driver',
  'driver_assigned',
  'driver_arrived',
  'in_progress',
  'completed',
  'cancelled_by_passenger',
  'cancelled_by_driver',
  'cancelled_by_admin'
);

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT UNIQUE,
  "role" "UserRole" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "Driver" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE REFERENCES "User"("id"),
  "status" "DriverStatusType" NOT NULL DEFAULT 'OFFLINE',
  "currentRideId" UUID,
  "isBlocked" BOOLEAN NOT NULL DEFAULT FALSE,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "rating" DOUBLE PRECISION,
  "lastLat" DOUBLE PRECISION,
  "lastLng" DOUBLE PRECISION,
  "lastAccuracy" DOUBLE PRECISION,
  "lastLocationAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "Passenger" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE REFERENCES "User"("id"),
  "lastLat" DOUBLE PRECISION,
  "lastLng" DOUBLE PRECISION,
  "lastAccuracy" DOUBLE PRECISION,
  "lastLocationAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "Ride" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "passengerId" UUID NOT NULL REFERENCES "Passenger"("id"),
  "driverId" UUID REFERENCES "Driver"("id"),
  "status" "RideStatus" NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "pickupLat" DOUBLE PRECISION NOT NULL,
  "pickupLng" DOUBLE PRECISION NOT NULL,
  "dropoffLat" DOUBLE PRECISION NOT NULL,
  "dropoffLng" DOUBLE PRECISION NOT NULL,
  "driverLocationLat" DOUBLE PRECISION,
  "driverLocationLng" DOUBLE PRECISION,
  "driverLocationAccuracy" DOUBLE PRECISION,
  "driverLocationTimestamp" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "startedAt" TIMESTAMP,
  "finishedAt" TIMESTAMP,
  "lastStatusUpdate" TIMESTAMP NOT NULL,
  "cancelReason" TEXT,
  "notes" TEXT
);

CREATE TABLE "RideStatusHistory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "rideId" UUID NOT NULL REFERENCES "Ride"("id"),
  "status" "RideStatus" NOT NULL,
  "timestamp" TIMESTAMP NOT NULL,
  "changedBy" TEXT,
  "reason" TEXT
);

CREATE TABLE "AdminLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "adminId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetId" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "Ride_status_idx" ON "Ride"("status");
CREATE INDEX "Ride_driver_idx" ON "Ride"("driverId");
CREATE INDEX "Ride_passenger_idx" ON "Ride"("passengerId");
CREATE INDEX "RideStatusHistory_ride_idx" ON "RideStatusHistory"("rideId");
CREATE INDEX "RideStatusHistory_timestamp_idx" ON "RideStatusHistory"("timestamp");
CREATE INDEX "AdminLog_admin_idx" ON "AdminLog"("adminId");
CREATE INDEX "AdminLog_created_idx" ON "AdminLog"("createdAt");
