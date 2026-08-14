-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('AWARENESS', 'TRAFFIC', 'ENGAGEMENT', 'CONVERSIONS', 'APP_INSTALLS');

-- CreateEnum
CREATE TYPE "AdPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'AUDIENCE_NETWORK', 'MESSENGER');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "budgetCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dailyBudgetCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "objective" "CampaignObjective" NOT NULL DEFAULT 'TRAFFIC',
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "platform" "AdPlatform" NOT NULL DEFAULT 'FACEBOOK',
ADD COLUMN     "providerId" TEXT;

-- CreateTable
CREATE TABLE "campaign_daily_stats" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "spendCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "campaign_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_audiences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sizeEstimate" INTEGER NOT NULL DEFAULT 0,
    "providerId" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_ads_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayCurrency" TEXT NOT NULL DEFAULT 'USD',
    "autoPauseOnBudget" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_ads_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_daily_stats_campaignId_date_key" ON "campaign_daily_stats"("campaignId", "date");

-- CreateIndex
CREATE INDEX "ad_audiences_ownerId_idx" ON "ad_audiences"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_ads_settings_userId_key" ON "meta_ads_settings"("userId");

-- CreateIndex
CREATE INDEX "campaigns_ownerId_status_idx" ON "campaigns"("ownerId", "status");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_daily_stats" ADD CONSTRAINT "campaign_daily_stats_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_audiences" ADD CONSTRAINT "ad_audiences_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ads_settings" ADD CONSTRAINT "meta_ads_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
