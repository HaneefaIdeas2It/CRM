#!/bin/bash
# ============================================
# CRM System - Startup Script (Bash)
# ============================================
# This script starts both the frontend and backend services
# Usage: ./start.sh [options]
# Options:
#   --skip-deps    Skip dependency installation
#   --skip-migrate Skip database migrations
#   --skip-db      Skip starting Docker database services
#   --api-only     Start only the API backend
#   --web-only     Start only the frontend
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse command line arguments
SKIP_DEPS=false
SKIP_MIGRATE=false
SKIP_DB=false
API_ONLY=false
WEB_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --skip-migrate)
            SKIP_MIGRATE=true
            shift
            ;;
        --skip-db)
            SKIP_DB=true
            shift
            ;;
        --api-only)
            API_ONLY=true
            shift
            ;;
        --web-only)
            WEB_ONLY=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: ./start.sh [--skip-deps] [--skip-migrate] [--skip-db] [--api-only] [--web-only]"
            exit 1
            ;;
    esac
done

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Cleanup function
cleanup() {
    echo ""
    print_info "Shutting down application services..."
    if [ ! -z "$TURBO_PID" ]; then
        kill $TURBO_PID 2>/dev/null || true
    fi
    # Kill any remaining node processes started by this script
    pkill -f "tsx watch\|next dev" 2>/dev/null || true
    print_info "Note: Docker services (PostgreSQL, Redis) are still running."
    print_info "To stop them, run: docker-compose down"
    print_success "Application services stopped"
}

# Register cleanup on exit
trap cleanup EXIT INT TERM

# Print header
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  CRM System - Startup Script${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Check Node.js
print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR_VERSION" -lt 20 ]; then
    print_error "Node.js version 20 or higher is required. Current version: $NODE_VERSION"
    exit 1
fi
print_success "Node.js $NODE_VERSION found"

# Check pnpm
print_info "Checking pnpm installation..."
if ! command -v pnpm &> /dev/null; then
    print_info "pnpm not found. Installing pnpm..."
    if npm install -g pnpm; then
        print_success "pnpm installed successfully"
    else
        print_error "Failed to install pnpm. Please install manually: npm install -g pnpm"
        exit 1
    fi
else
    PNPM_VERSION=$(pnpm --version)
    print_success "pnpm $PNPM_VERSION found"
fi

# Check environment files
print_info "Checking environment configuration..."
MISSING_ENV_FILES=()

check_env_file() {
    if [ ! -f "$1" ]; then
        MISSING_ENV_FILES+=("$1")
    fi
}

check_env_file ".env"
check_env_file "apps/api/.env"
check_env_file "apps/web/.env.local"

if [ ${#MISSING_ENV_FILES[@]} -gt 0 ]; then
    print_warning "The following environment files are missing:"
    for file in "${MISSING_ENV_FILES[@]}"; do
        print_warning "  - $file"
    done
    print_warning "Please create them from the template: docs/environment-template.txt"
    print_warning "Continuing anyway, but the application may not work correctly..."
fi

# Install dependencies
if [ "$SKIP_DEPS" = false ]; then
    print_info "Installing dependencies..."
    if pnpm install; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_info "Skipping dependency installation (--skip-deps flag set)"
fi

# Start Docker services (PostgreSQL and Redis)
if [ "$SKIP_DB" = false ] && [ "$WEB_ONLY" = false ]; then
    print_info "Starting database services (Docker)..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed or not in PATH."
        print_warning "Please install Docker from https://www.docker.com/products/docker-desktop/"
        print_warning "Skipping database startup. Make sure PostgreSQL and Redis are running manually."
        SKIP_DB=true
    else
        DOCKER_VERSION=$(docker --version)
        print_success "Docker found: $DOCKER_VERSION"
    fi
    
    if [ "$SKIP_DB" = false ]; then
        # Check if docker-compose.yml exists
        if [ ! -f "docker-compose.yml" ]; then
            print_warning "docker-compose.yml not found. Skipping Docker services."
            print_warning "Make sure PostgreSQL and Redis are running manually."
        else
            # Check if services are already running
            if docker-compose ps postgres redis 2>/dev/null | grep -q "Up"; then
                print_info "Database services are already running."
            else
                print_info "Starting PostgreSQL and Redis containers..."
                if docker-compose up -d postgres redis; then
                    # Wait for services to be healthy
                    print_info "Waiting for database services to be ready..."
                    MAX_RETRIES=30
                    RETRY_COUNT=0
                    ALL_HEALTHY=false
                    
                    while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$ALL_HEALTHY" = false ]; do
                        sleep 2
                        POSTGRES_STATUS=$(docker-compose ps postgres 2>/dev/null | grep -q "healthy" && echo "healthy" || echo "")
                        REDIS_STATUS=$(docker-compose ps redis 2>/dev/null | grep -q "healthy" && echo "healthy" || echo "")
                        
                        if [ -n "$POSTGRES_STATUS" ] && [ -n "$REDIS_STATUS" ]; then
                            ALL_HEALTHY=true
                            print_success "Database services are healthy and ready!"
                        else
                            RETRY_COUNT=$((RETRY_COUNT + 1))
                            print_info "Waiting for services... ($RETRY_COUNT/$MAX_RETRIES)"
                        fi
                    done
                    
                    if [ "$ALL_HEALTHY" = false ]; then
                        print_warning "Services may not be fully ready. Continuing anyway..."
                    fi
                else
                    print_warning "Failed to start Docker services."
                    print_warning "Make sure Docker is running and try manually: docker-compose up -d"
                fi
            fi
        fi
    fi
fi

# Run database migrations (optional)
if [ "$SKIP_MIGRATE" = false ] && [ "$WEB_ONLY" = false ]; then
    print_info "Checking database migrations..."
    print_info "Note: Run 'pnpm db:migrate' manually if you need to run migrations"
fi

# Generate Prisma client if needed
if [ "$WEB_ONLY" = false ]; then
    print_info "Generating Prisma client..."
    if (cd apps/api && pnpm db:generate); then
        print_success "Prisma client generated"
    else
        print_warning "Failed to generate Prisma client. Continuing anyway..."
    fi
fi

# Start services
echo ""
echo -e "${CYAN}Starting CRM System...${NC}"
echo ""

# Determine which services to start
if [ "$API_ONLY" = true ]; then
    print_info "Starting API backend only..."
    echo ""
    print_info "  - Backend API: http://localhost:4000"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the service${NC}"
    echo ""
    cd apps/api && pnpm dev
elif [ "$WEB_ONLY" = true ]; then
    print_info "Starting frontend only..."
    echo ""
    print_info "  - Frontend: http://localhost:3000"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the service${NC}"
    echo ""
    cd apps/web && pnpm dev
else
    print_info "Starting both frontend and backend..."
    print_info "  - Frontend: http://localhost:3000"
    print_info "  - Backend API: http://localhost:4000"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo ""
    
    # Start turbo in background and capture PID
    pnpm dev &
    TURBO_PID=$!
    
    # Wait for the process
    wait $TURBO_PID
fi

