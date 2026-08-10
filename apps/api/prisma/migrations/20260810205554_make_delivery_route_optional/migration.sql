-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_routeId_fkey";

-- AlterTable
ALTER TABLE "Delivery" ALTER COLUMN "routeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;
