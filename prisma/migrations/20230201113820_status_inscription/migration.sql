/*
  Warnings:

  - You are about to drop the column `validated` on the `Inscription` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InscriptionStatus" AS ENUM ('PENDING', 'VALIDATED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDING';

-- AlterTable
ALTER TABLE "Inscription" DROP COLUMN "validated",
ADD COLUMN     "status" "InscriptionStatus" NOT NULL DEFAULT E'PENDING';
