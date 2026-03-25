ALTER TYPE "RideStatus" RENAME TO "RideStatus_old";

CREATE TYPE "RideStatus" AS ENUM (
  'requested',
  'searching',
  'driver_assigned',
  'in_progress',
  'completed',
  'cancelled'
);

ALTER TABLE "Ride"
ALTER COLUMN "status" TYPE "RideStatus"
USING (
  CASE "status"::text
    WHEN 'accepted' THEN 'driver_assigned'
    WHEN 'driver_arrived' THEN 'driver_assigned'
    ELSE "status"::text
  END
)::"RideStatus";

ALTER TABLE "RideStatusHistory"
ALTER COLUMN "status" TYPE "RideStatus"
USING (
  CASE "status"::text
    WHEN 'accepted' THEN 'driver_assigned'
    WHEN 'driver_arrived' THEN 'driver_assigned'
    ELSE "status"::text
  END
)::"RideStatus";

DROP TYPE "RideStatus_old";
