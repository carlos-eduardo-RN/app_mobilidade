/*
  Warnings:

  - The values [created,searching_driver,driver_assigned,cancelled_by_passenger,cancelled_by_driver,cancelled_by_admin] on the enum `RideStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RideStatus_new" AS ENUM ('requested', 'accepted', 'driver_arrived', 'in_progress', 'completed', 'cancelled');
ALTER TABLE "Ride" ALTER COLUMN "status" TYPE "RideStatus_new" USING ("status"::text::"RideStatus_new");
ALTER TABLE "RideStatusHistory" ALTER COLUMN "status" TYPE "RideStatus_new" USING ("status"::text::"RideStatus_new");
ALTER TYPE "RideStatus" RENAME TO "RideStatus_old";
ALTER TYPE "RideStatus_new" RENAME TO "RideStatus";
DROP TYPE "public"."RideStatus_old";
COMMIT;
