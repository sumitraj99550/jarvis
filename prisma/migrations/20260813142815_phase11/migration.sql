-- CreateEnum
CREATE TYPE "RevenueSubscriptionStatus" AS ENUM ('ACTIVE', 'IN_TRIAL', 'CANCELLED', 'EXPIRED', 'BILLING_ISSUE');

-- CreateEnum
CREATE TYPE "RevenueStore" AS ENUM ('APP_STORE', 'PLAY_STORE', 'STRIPE', 'PROMOTIONAL');

-- CreateEnum
CREATE TYPE "RevenueTransactionType" AS ENUM ('PURCHASE', 'RENEWAL', 'REFUND', 'CANCELLATION', 'PROMOTIONAL_GRANT');

-- CreateEnum
CREATE TYPE "RevenuePeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY', 'LIFETIME');

-- CreateTable
CREATE TABLE "revenue_products" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "period" "RevenuePeriod" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_subscribers" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "email" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_subscriptions" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "RevenueSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "store" "RevenueStore" NOT NULL DEFAULT 'APP_STORE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_transactions" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "RevenueTransactionType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayCurrency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "revenue_products_productId_key" ON "revenue_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_subscribers_appUserId_key" ON "revenue_subscribers"("appUserId");

-- CreateIndex
CREATE INDEX "revenue_subscribers_ownerId_idx" ON "revenue_subscribers"("ownerId");

-- CreateIndex
CREATE INDEX "revenue_subscriptions_subscriberId_status_idx" ON "revenue_subscriptions"("subscriberId", "status");

-- CreateIndex
CREATE INDEX "revenue_transactions_subscriberId_occurredAt_idx" ON "revenue_transactions"("subscriberId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_settings_userId_key" ON "revenue_settings"("userId");

-- AddForeignKey
ALTER TABLE "revenue_subscribers" ADD CONSTRAINT "revenue_subscribers_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_subscriptions" ADD CONSTRAINT "revenue_subscriptions_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "revenue_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_subscriptions" ADD CONSTRAINT "revenue_subscriptions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "revenue_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "revenue_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "revenue_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_settings" ADD CONSTRAINT "revenue_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
