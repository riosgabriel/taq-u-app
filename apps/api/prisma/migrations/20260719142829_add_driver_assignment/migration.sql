-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'ASSIGNED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "driverId" TEXT;

-- CreateIndex
CREATE INDEX "Order_driverId_idx" ON "Order"("driverId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
