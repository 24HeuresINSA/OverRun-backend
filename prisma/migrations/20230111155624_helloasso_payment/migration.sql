/*
  Warnings:

  - You are about to drop the column `filename` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `transaction` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `Payment` table. All the data in the column will be lost.
  - The `status` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[helloassoCheckoutIntentId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[va]` on the table `VA` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `totalAmount` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VALIDATED', 'REFUSED', 'REFUND');

-- AlterTable
ALTER TABLE "Inscription" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "filename",
DROP COLUMN "transaction",
DROP COLUMN "value",
ADD COLUMN     "donationAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "helloassoCheckoutExpiresAt" TIMESTAMP(3),
ADD COLUMN     "helloassoCheckoutIntentId" INTEGER,
ADD COLUMN     "helloassoCheckoutIntentUrl" VARCHAR(255),
ADD COLUMN     "helloassoPaymentReceiptUrl" VARCHAR(255),
ADD COLUMN     "totalAmount" INTEGER NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT E'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Payment_helloassoCheckoutIntentId_key" ON "Payment"("helloassoCheckoutIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "VA_va_key" ON "VA"("va");
