/*
  Warnings:

  - Added the required column `stats` to the `briefings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "briefings" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "stats" JSONB NOT NULL;
