/*
  Warnings:

  - A unique constraint covering the columns `[name,editionId]` on the table `Race` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,editionId]` on the table `Team` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Race_name_key";

-- DropIndex
DROP INDEX "Team_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Race_name_editionId_key" ON "Race"("name", "editionId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_editionId_key" ON "Team"("name", "editionId");
