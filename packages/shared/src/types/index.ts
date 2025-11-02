/**
 * Shared types for CRM system
 */

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Base entity
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User types
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  mfaEnabled: boolean;
}

// Customer types
export interface Customer extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string | null;
  tags: string[];
  customFields: Record<string, unknown> | null;
  createdBy: string;
}

// Contact History types
export enum ContactType {
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  NOTE = 'NOTE',
}

export interface ContactHistory extends BaseEntity {
  customerId: string;
  type: ContactType;
  subject: string | null;
  body: string;
  duration: number | null;
  attachments: string[];
  aiSummary: string | null;
  createdBy: string;
}

// Pipeline & Deal types
export enum Stage {
  LEAD = 'LEAD',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

export interface Pipeline extends BaseEntity {
  name: string;
  stages: Stage[];
  isDefault: boolean;
  organizationId: string;
}

export interface Deal extends BaseEntity {
  customerId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  value: number;
  currency: string;
  expectedCloseDate: Date | null;
  actualCloseDate: Date | null;
  probability: number;
  notes: string | null;
  products: LineItem[];
  ownerId: string;
}

export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

// Task types
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
}

export interface Task extends BaseEntity {
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date | null;
  assigneeId: string;
  relatedCustomerId: string | null;
  relatedDealId: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  timeSpent: number | null;
  completedAt: Date | null;
}

// Organization types
export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export interface Organization extends BaseEntity {
  name: string;
  settings: Record<string, unknown>;
  subscriptionTier: SubscriptionTier;
  maxUsers: number;
}

