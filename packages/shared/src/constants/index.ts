/**
 * Shared constants for CRM system
 */

// Application constants
export const APP_NAME = 'CRM System';
export const APP_VERSION = '1.0.0';

// Pagination defaults
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// File upload constants
export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_FILE_TYPES = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
];

// Cache TTL constants (in seconds)
export const CACHE_TTL_DEFAULT = 3600; // 1 hour
export const CACHE_TTL_SHORT = 300; // 5 minutes
export const CACHE_TTL_LONG = 86400; // 24 hours

// Rate limiting constants
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const RATE_LIMIT_AUTH_MAX = 5;

// Password requirements
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_REQUIRE_UPPERCASE = true;
export const PASSWORD_REQUIRE_LOWERCASE = true;
export const PASSWORD_REQUIRE_NUMBER = true;
export const PASSWORD_REQUIRE_SPECIAL = true;

// JWT constants
export const JWT_EXPIRATION_TIME = '15m';
export const JWT_REFRESH_EXPIRATION_TIME = '7d';

// Database constants
export const DB_POOL_MIN = 2;
export const DB_POOL_MAX = 10;

// Validation constants
export const EMAIL_MAX_LENGTH = 255;
export const NAME_MAX_LENGTH = 100;
export const PHONE_MAX_LENGTH = 20;

// Task priorities
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

// Task statuses
export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETE'] as const;

// Contact types
export const CONTACT_TYPES = ['CALL', 'EMAIL', 'MEETING', 'NOTE'] as const;

// User roles
export const USER_ROLES = ['ADMIN', 'MANAGER', 'USER'] as const;

// Subscription tiers
export const SUBSCRIPTION_TIERS = ['FREE', 'PRO', 'ENTERPRISE'] as const;

// Date formats
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const TIME_FORMAT = 'HH:mm:ss';

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

