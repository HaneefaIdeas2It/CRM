# CRM System - Developer Documentation

A modern, cloud-native Customer Relationship Management (CRM) system built with Next.js, Express, PostgreSQL, and TypeScript.

## 📋 Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Guide](#development-guide)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Key Features](#key-features)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## 🎯 Overview

This CRM system provides comprehensive customer relationship management capabilities including:

- **Customer Management**: Full CRUD operations for customer records
- **Sales Pipeline**: Visual Kanban board for deal tracking with drag-and-drop
- **Task Management**: Task organization with status tracking and drag-and-drop
- **Contact History**: Log all customer interactions (calls, emails, meetings, notes)
- **Dashboard**: Overview of key metrics and quick actions
- **Authentication**: Secure JWT-based authentication with role-based access control

---

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express 5
- **Language**: TypeScript 5
- **Database**: PostgreSQL 15
- **ORM/Query**: `pg` (node-postgres) for direct SQL queries
- **Validation**: Zod
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Logging**: Winston
- **Security**: Helmet, CORS, rate limiting

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Cache**: Redis
- **Package Manager**: pnpm with workspaces (monorepo)
- **Build Tool**: Turbo (for monorepo builds)

---

## 📁 Project Structure

```
CRM/
├── apps/
│   ├── api/                 # Backend Express application
│   │   ├── src/
│   │   │   ├── api/         # API route handlers
│   │   │   ├── config/      # Configuration (DB, env, etc.)
│   │   │   ├── controllers/ # Business logic controllers
│   │   │   ├── infrastructure/ # External services (auth, etc.)
│   │   │   ├── routes/      # Route definitions
│   │   │   ├── shared/      # Shared utilities, middleware
│   │   │   └── index.ts     # Application entry point
│   │   ├── migrations/      # SQL migration files
│   │   └── package.json
│   │
│   └── web/                 # Frontend Next.js application
│       ├── src/
│       │   ├── app/         # Next.js app router pages
│       │   │   ├── customers/
│       │   │   ├── pipeline/
│       │   │   ├── tasks/
│       │   │   ├── dashboard/
│       │   │   ├── login/
│       │   │   └── page.tsx # Homepage
│       │   └── components/  # Reusable React components
│       └── package.json
│
├── packages/
│   └── shared/              # Shared TypeScript package
│       ├── src/
│       │   ├── types/       # Shared TypeScript types
│       │   ├── utils/       # Utility functions
│       │   └── errors/      # Error classes
│       └── package.json
│
├── docs/                    # Documentation
│   ├── requirements.md
│   ├── PROJECT_STATUS.md
│   ├── API_ENDPOINTS_REFERENCE.md
│   └── ...
│
├── docker-compose.yml       # Docker services configuration
├── package.json             # Root package.json (monorepo)
├── pnpm-workspace.yaml     # pnpm workspace configuration
├── turbo.json              # Turbo build configuration
└── README.md               # This file
```

---

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v20.x or higher
- **pnpm**: v8.x or higher (`npm install -g pnpm`)
- **Docker**: v20.x or higher (for database and Redis)
- **Docker Compose**: v2.x or higher
- **Git**: For version control

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CRM
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

#### Backend (`.env` in `apps/api/`):
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://crm_user:crm@localhost:5433/crm_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=<generate-a-32-char-secret>
JWT_REFRESH_SECRET=<generate-another-32-char-secret>
JWT_EXPIRATION_TIME=15m
JWT_REFRESH_EXPIRATION_TIME=7d
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

#### Frontend (`.env.local` in `apps/web/`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**Note**: Generate JWT secrets using:
```bash
# PowerShell (Windows)
[System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()

# Linux/Mac
openssl rand -hex 32
```

### 4. Start Docker Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify services are running
docker-compose ps
```

### 5. Initialize Database

The database schema is created automatically via Docker Compose. If needed, you can run migrations manually:

```bash
# Connect to PostgreSQL container
docker-compose exec postgres psql -U crm_user -d crm_dev

# Or run SQL scripts directly
docker-compose exec postgres psql -U crm_user -d crm_dev -f /path/to/migrations/init_schema.sql
```

### 6. Seed Database (Optional)

```bash
docker-compose exec postgres psql -U crm_user -d crm_dev -f /path/to/migrations/seed_data.sql
```

**Default Login Credentials** (after seeding):
- Email: `admin@crm.com`
- Password: `Admin12345`

### 7. Start Development Servers

```bash
# From root directory - starts both frontend and backend
pnpm dev

# Or start individually:
# Backend only
cd apps/api && pnpm dev

# Frontend only
cd apps/web && pnpm dev
```

### 8. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Health Check**: http://localhost:4000/health

---

## 💻 Development Guide

### Running the Application

#### Development Mode (Hot Reload)

```bash
# Start all services
pnpm dev

# Or use the PowerShell script
.\start.ps1
```

#### Production Build

```bash
# Build all packages
pnpm build

# Start production servers
pnpm start
```

### Code Quality

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format
```

### Database Commands

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U crm_user -d crm_dev

# View database logs
docker-compose logs postgres

# Backup database
docker-compose exec postgres pg_dump -U crm_user crm_dev > backup.sql

# Restore database
docker-compose exec -T postgres psql -U crm_user -d crm_dev < backup.sql
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

---

## 🏗 Architecture

### Monorepo Structure

This project uses a **pnpm workspace** monorepo with **Turbo** for build orchestration:

- **apps/api**: Backend Express application
- **apps/web**: Frontend Next.js application
- **packages/shared**: Shared TypeScript code (types, utilities)

### Backend Architecture

The backend follows a **layered architecture**:

```
Request → Routes → Controllers → Database → Response
          ↓         ↓            ↓
       Validation  Business    SQL Queries
                    Logic
```

#### Key Patterns:

1. **Repository Pattern**: Data access abstracted (using `pg` directly)
2. **Service Layer**: Business logic in controllers
3. **Middleware**: Authentication, validation, error handling
4. **Dependency Injection**: Controllers receive dependencies

### Frontend Architecture

The frontend uses **Next.js App Router**:

- **Server Components**: For static content
- **Client Components**: For interactivity (`'use client'`)
- **API Routes**: Integrated with backend REST API
- **State Management**: React hooks + localStorage for auth

### Database Architecture

- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage
- **Connection Pooling**: Handled by `pg` library
- **Migrations**: SQL files in `apps/api/migrations/`

---

## 📚 API Documentation

### Base URL

```
http://localhost:4000/api
```

### Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

#### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer (soft delete)

#### Deals
- `GET /api/deals` - List deals (with filters: `?pipelineId=`, `?stageId=`, `?customerId=`)
- `GET /api/deals/:id` - Get deal by ID
- `POST /api/deals` - Create deal
- `PUT /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal

#### Tasks
- `GET /api/tasks` - List tasks
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

#### Contact History
- `GET /api/contact-history` - List contacts (with filters: `?customerId=`, `?type=`)
- `GET /api/contact-history/:id` - Get contact by ID
- `POST /api/contact-history` - Create contact entry
- `PUT /api/contact-history/:id` - Update contact entry
- `DELETE /api/contact-history/:id` - Delete contact entry

#### Pipelines
- `GET /api/pipelines` - List pipelines
- `GET /api/pipelines/:id` - Get pipeline by ID
- `POST /api/pipelines` - Create pipeline
- `PUT /api/pipelines/:id` - Update pipeline
- `DELETE /api/pipelines/:id` - Delete pipeline

**For detailed API documentation**, see [`docs/API_ENDPOINTS_REFERENCE.md`](./docs/API_ENDPOINTS_REFERENCE.md)

---

## 🗄 Database Schema

### Core Tables

- **organizations**: Multi-tenant organization management
- **users**: User accounts with roles (ADMIN, MANAGER, USER)
- **customers**: Customer records with soft delete
- **contact_history**: Customer interaction logs
- **pipelines**: Sales pipeline definitions
- **deals**: Sales deals in pipelines
- **tasks**: Task management

### Key Relationships

- Users belong to Organizations (many-to-one)
- Customers belong to Organizations (many-to-one)
- Deals belong to Customers and Pipelines (many-to-one)
- Tasks can be related to Customers or Deals (optional)
- Contact History belongs to Customers (many-to-one)

### Data Types

- **IDs**: UUID (TEXT in PostgreSQL)
- **Timestamps**: TIMESTAMP(3) with timezone
- **Arrays**: TEXT[] for tags, attachments
- **JSON**: JSONB for flexible data (settings, products, etc.)
- **Decimals**: DECIMAL(15,2) for monetary values

**Full schema**: See [`apps/api/migrations/init_schema.sql`](./apps/api/migrations/init_schema.sql)

---

## ✨ Key Features

### 1. Customer Management
- Create, read, update, delete customers
- Soft delete (records preserved with `deletedAt`)
- Organization isolation (multi-tenant)
- Customer contact history integration

### 2. Sales Pipeline
- Visual Kanban board
- Drag-and-drop between stages
- Quick stage selector (button + right-click menu)
- Deal value tracking
- Probability management

### 3. Task Management
- Kanban board (Pending, In Progress, Complete)
- Drag-and-drop status updates
- Priority levels (LOW, MEDIUM, HIGH)
- Due date tracking
- Related customer/deal linking

### 4. Contact History
- Track all customer interactions
- Types: CALL, EMAIL, MEETING, NOTE
- Duration tracking for calls
- Attachment support (future)
- Customer-specific view

### 5. Dashboard
- Summary statistics
- Quick action links
- Real-time metrics

---

## 🔐 Environment Variables

### Backend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | API server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:port/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `your-secret-key-here` |
| `JWT_REFRESH_SECRET` | Refresh token secret (min 32 chars) | `your-refresh-secret` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |

### Frontend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:4000` |

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Problem**: `Connection refused` or authentication errors

**Solutions**:
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# Check connection string in .env
# Verify DATABASE_URL format: postgresql://user:password@host:port/database
```

#### 2. Port Already in Use

**Problem**: `Port 3000/4000 already in use`

**Solutions**:
```bash
# Find process using port (Windows)
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Find process using port (Linux/Mac)
lsof -ti:3000 | xargs kill -9

# Or change port in .env/.env.local
```

#### 3. Module Not Found Errors

**Problem**: Import errors or missing dependencies

**Solutions**:
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Rebuild shared package
cd packages/shared && pnpm build
```

#### 4. TypeScript Errors

**Problem**: Type errors in IDE or build

**Solutions**:
```bash
# Check types
pnpm type-check

# Rebuild shared package (types might be outdated)
cd packages/shared && pnpm build
```

#### 5. Rate Limiting Errors

**Problem**: "Too many requests" in development

**Solution**: Rate limiting is disabled in development mode. If you see this:
- Check `NODE_ENV=development` in backend `.env`
- Restart API server

---

## 🤝 Contributing

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes**
   - Follow existing code patterns
   - Write TypeScript (strict mode)
   - Add comments for complex logic
   - Update documentation if needed

3. **Test your changes**
   ```bash
   pnpm type-check
   pnpm lint
   # Manual testing in browser
   ```

4. **Commit changes**
   ```bash
   git commit -m "feat: add new feature"
   ```
   Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, etc.

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Style

- **TypeScript**: Use strict mode, avoid `any`
- **Naming**: camelCase for variables/functions, PascalCase for classes/components
- **Components**: Functional components with hooks
- **Error Handling**: Use custom error classes (`NotFoundError`, `ValidationError`)
- **API Responses**: Use `successResponse()` and `errorResponse()` from shared package

### Security Guidelines

- **Never commit secrets**: Use `.env` files (already in `.gitignore`)
- **Validate all inputs**: Use Zod schemas
- **Sanitize outputs**: Prevent XSS attacks
- **Use parameterized queries**: Already handled by `pg` library
- **Rate limiting**: Configured for production

---

## 🚀 Deployment

For detailed deployment instructions including free hosting options, see the **[Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)**.

### Quick Deployment Summary

**Recommended Free Stack:**
- **Frontend**: Vercel (Next.js native)
- **Backend**: Render (free tier)
- **PostgreSQL**: Supabase (free tier)
- **Redis**: Upstash (free tier)

All platforms offer free tiers suitable for development and small production deployments.

---

## 📖 Additional Documentation

- **[Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)**: Complete deployment instructions with free hosting
- **[Project Requirements](./docs/requirements.md)**: Detailed functional requirements
- **[Project Status](./docs/PROJECT_STATUS.md)**: Current implementation status
- **[API Reference](./docs/API_ENDPOINTS_REFERENCE.md)**: Complete API documentation
- **[Customer Management](./docs/CUSTOMER_MANAGEMENT_MODULE.md)**: Customer module details
- **[Documentation Index](./docs/DOCUMENTATION_INDEX.md)**: All documentation files

---

## 📝 License

[Add your license here]

---

## 👥 Team

[Add team/contributor information]

---

## 🆘 Support

For questions or issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review existing documentation in `docs/`
3. Check GitHub issues (if using GitHub)
4. Contact the development team

---

**Happy Coding! 🚀**
