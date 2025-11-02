-- CRM Database Schema
-- Generated from Prisma schema
-- Run this script via DBeaver or psql to create all tables

-- Create enums
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'USER');
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE "ContactType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'NOTE');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE');

-- Create organizations table
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Create users table
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- Create customers table
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "company" VARCHAR(200),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customFields" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");
CREATE INDEX "customers_email_idx" ON "customers"("email");
CREATE INDEX "customers_phone_idx" ON "customers"("phone");
CREATE INDEX "customers_company_idx" ON "customers"("company");
CREATE INDEX "customers_organizationId_idx" ON "customers"("organizationId");
CREATE INDEX "customers_createdAt_idx" ON "customers"("createdAt");

-- Create contact_history table
CREATE TABLE "contact_history" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "subject" VARCHAR(500),
    "body" TEXT NOT NULL,
    "duration" INTEGER,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "contact_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_history_customerId_idx" ON "contact_history"("customerId");
CREATE INDEX "contact_history_type_idx" ON "contact_history"("type");
CREATE INDEX "contact_history_createdAt_idx" ON "contact_history"("createdAt");

-- Create pipelines table
CREATE TABLE "pipelines" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "stages" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pipelines_organizationId_idx" ON "pipelines"("organizationId");
CREATE INDEX "pipelines_isDefault_idx" ON "pipelines"("isDefault");

-- Create deals table
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "probability" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "products" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deals_customerId_idx" ON "deals"("customerId");
CREATE INDEX "deals_pipelineId_idx" ON "deals"("pipelineId");
CREATE INDEX "deals_stageId_idx" ON "deals"("stageId");
CREATE INDEX "deals_ownerId_idx" ON "deals"("ownerId");
CREATE INDEX "deals_expectedCloseDate_idx" ON "deals"("expectedCloseDate");

-- Create tasks table
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "assigneeId" TEXT NOT NULL,
    "relatedCustomerId" TEXT,
    "relatedDealId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" VARCHAR(255),
    "timeSpent" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tasks_assigneeId_idx" ON "tasks"("assigneeId");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_priority_idx" ON "tasks"("priority");
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");
CREATE INDEX "tasks_relatedCustomerId_idx" ON "tasks"("relatedCustomerId");

-- Add foreign key constraints
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customers" ADD CONSTRAINT "customers_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contact_history" ADD CONSTRAINT "contact_history_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_history" ADD CONSTRAINT "contact_history_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deals" ADD CONSTRAINT "deals_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_relatedCustomerId_fkey" FOREIGN KEY ("relatedCustomerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create Prisma migration tracking table
CREATE TABLE "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

