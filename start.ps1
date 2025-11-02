# ============================================
# CRM System - Startup Script (PowerShell)
# ============================================
# This script starts both the frontend and backend services
# Usage: .\start.ps1 [options]
# Options:
#   --skip-deps    Skip dependency installation
#   --skip-migrate Skip database migrations
#   --skip-db      Skip starting Docker database services
#   --api-only     Start only the API backend
#   --web-only     Start only the frontend
# ============================================

param(
    [switch]$SkipDeps,
    [switch]$SkipMigrate,
    [switch]$SkipDb,
    [switch]$ApiOnly,
    [switch]$WebOnly
)

# Define helper functions first
function Show-Success {
    param([string]$Message)
    $originalColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = "Green"
    Write-Output "✓ $Message"
    $host.UI.RawUI.ForegroundColor = $originalColor
}

function Show-Info {
    param([string]$Message)
    $originalColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = "Cyan"
    Write-Output "ℹ $Message"
    $host.UI.RawUI.ForegroundColor = $originalColor
}

function Show-Warning {
    param([string]$Message)
    $originalColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = "Yellow"
    Write-Output "⚠ $Message"
    $host.UI.RawUI.ForegroundColor = $originalColor
}

function Show-Error {
    param([string]$Message)
    $originalColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = "Red"
    Write-Output "✗ $Message"
    $host.UI.RawUI.ForegroundColor = $originalColor
}

# Set error handling (after functions are defined)  
# Note: We'll set this later after verifying functions work
# $ErrorActionPreference = "Stop"

# Print header
Write-Output ""
$originalColor = $host.UI.RawUI.ForegroundColor
$host.UI.RawUI.ForegroundColor = "Cyan"
Write-Output "============================================"
Write-Output "  CRM System - Startup Script"
Write-Output "============================================"
$host.UI.RawUI.ForegroundColor = $originalColor
Write-Output ""

# Check Node.js
Show-Info -Message "Checking Node.js installation..."
try {
    $nodeVersion = node --version
    $nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($nodeMajorVersion -lt 20) {
        Show-Error -Message "Node.js version 20 or higher is required. Current version: $nodeVersion"
        exit 1
    }
    Show-Success -Message "Node.js $nodeVersion found"
} catch {
    Show-Error -Message "Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/"
    exit 1
}

# Check pnpm
Show-Info -Message "Checking pnpm installation..."
try {
    $pnpmVersion = pnpm --version
    Show-Success -Message "pnpm $pnpmVersion found"
} catch {
    Show-Info -Message "pnpm not found. Installing pnpm..."
    try {
        npm install -g pnpm
        Show-Success -Message "pnpm installed successfully"
    } catch {
        Show-Error -Message "Failed to install pnpm. Please install manually: npm install -g pnpm"
        exit 1
    }
}

# Check environment files
Show-Info -Message "Checking environment configuration..."
$envFiles = @(".env", "apps/api/.env", "apps/web/.env.local")
$missingEnvFiles = @()

foreach ($envFile in $envFiles) {
    if (-not (Test-Path $envFile)) {
        $missingEnvFiles += $envFile
    }
}

if ($missingEnvFiles.Count -gt 0) {
    Show-Warning -Message "The following environment files are missing:"
    foreach ($file in $missingEnvFiles) {
        Show-Warning -Message "  - $file"
    }
    Show-Warning -Message "Please create them from the template: docs/environment-template.txt"
    Show-Warning -Message "Continuing anyway, but the application may not work correctly..."
}

# Install dependencies
if (-not $SkipDeps) {
    Show-Info -Message "Installing dependencies..."
    try {
        pnpm install
        Show-Success -Message "Dependencies installed successfully"
    } catch {
        Show-Error -Message "Failed to install dependencies"
        exit 1
    }
} else {
    Show-Info -Message "Skipping dependency installation (--skip-deps flag set)"
}

# Start Docker services (PostgreSQL and Redis)
if (-not $SkipDb -and -not $WebOnly) {
    Show-Info -Message "Starting database services (Docker)..."
    
    # Check if Docker is installed
    try {
        $dockerVersion = docker --version
        Show-Success -Message "Docker found: $dockerVersion"
    } catch {
        Show-Warning -Message "Docker is not installed or not running."
        Show-Warning -Message "Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
        Show-Warning -Message "Skipping database startup. Make sure PostgreSQL and Redis are running manually."
        $SkipDb = $true
    }
    
    if (-not $SkipDb) {
        # Check if docker-compose.yml exists
        if (-not (Test-Path "docker-compose.yml")) {
            Show-Warning -Message "docker-compose.yml not found. Skipping Docker services."
            Show-Warning -Message "Make sure PostgreSQL and Redis are running manually."
        } else {
            try {
                # Check if services are already running
                $runningServices = docker-compose ps --services --filter "status=running" 2>$null
                if ($runningServices -and ($runningServices -contains "postgres" -or $runningServices -contains "redis")) {
                    Show-Info -Message "Database services are already running."
                } else {
                    Show-Info -Message "Starting PostgreSQL and Redis containers..."
                    docker-compose up -d postgres redis
                    
                    # Wait for services to be healthy
                    Show-Info -Message "Waiting for database services to be ready..."
                    $maxRetries = 30
                    $retryCount = 0
                    $allHealthy = $false
                    
                    while ($retryCount -lt $maxRetries -and -not $allHealthy) {
                        Start-Sleep -Seconds 2
                        $postgresStatus = docker-compose ps postgres 2>$null | Select-String "healthy"
                        $redisStatus = docker-compose ps redis 2>$null | Select-String "healthy"
                        
                        if ($postgresStatus -and $redisStatus) {
                            $allHealthy = $true
                            Show-Success -Message "Database services are healthy and ready!"
                        } else {
                            $retryCount++
                            Show-Info -Message "Waiting for services... ($retryCount/$maxRetries)"
                        }
                    }
                    
                    if (-not $allHealthy) {
                        Show-Warning -Message "Services may not be fully ready. Continuing anyway..."
                    }
                }
            } catch {
                Show-Warning -Message "Failed to start Docker services: $_"
                Show-Warning -Message "Make sure Docker is running and try manually: docker-compose up -d"
            }
        }
    }
}

# Run database migrations (optional)
if (-not $SkipMigrate -and -not $WebOnly) {
    Show-Info -Message "Checking database migrations..."
    Show-Info -Message "Note: Run 'pnpm db:migrate' manually if you need to run migrations"
}

# Generate Prisma client if needed
if (-not $WebOnly) {
    Show-Info -Message "Generating Prisma client..."
    try {
        Push-Location apps/api
        pnpm db:generate
        Pop-Location
        Show-Success -Message "Prisma client generated"
    } catch {
        Show-Warning -Message "Failed to generate Prisma client. Continuing anyway..."
    }
}

# Function to handle cleanup on exit
function Cleanup {
    Write-Output ""
    Show-Info -Message "Shutting down application services..."
    if ($turboProcess) {
        Stop-Process -Id $turboProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Show-Info -Message "Note: Docker services (PostgreSQL, Redis) are still running."
    Show-Info -Message "To stop them, run: docker-compose down"
    Show-Success -Message "Application services stopped"
}

# Register cleanup on script exit
Register-EngineEvent PowerShell.Exiting -Action { Cleanup } | Out-Null

# Start services
Write-Output ""
$originalColor = $host.UI.RawUI.ForegroundColor
$host.UI.RawUI.ForegroundColor = "Cyan"
Write-Output "Starting CRM System..."
$host.UI.RawUI.ForegroundColor = $originalColor
Write-Output ""

# Determine which services to start
$startCommand = "pnpm dev"

if ($ApiOnly) {
    Show-Info -Message "Starting API backend only..."
    $startCommand = "cd apps/api && pnpm dev"
} elseif ($WebOnly) {
    Show-Info -Message "Starting frontend only..."
    $startCommand = "cd apps/web && pnpm dev"
} else {
    Show-Info -Message "Starting both frontend and backend..."
    Show-Info -Message "  - Frontend: http://localhost:3000"
    Show-Info -Message "  - Backend API: http://localhost:4000"
}

Write-Output ""
$originalColor = $host.UI.RawUI.ForegroundColor
$host.UI.RawUI.ForegroundColor = "Yellow"
Write-Output "Press Ctrl+C to stop all services"
$host.UI.RawUI.ForegroundColor = $originalColor
Write-Output ""

try {
    # Start the services
    if ($ApiOnly -or $WebOnly) {
        # Run single service in current terminal
        Invoke-Expression $startCommand
    } else {
        # Use turbo to run both services
        $turboProcess = Start-Process -FilePath "pnpm" -ArgumentList "dev" -NoNewWindow -PassThru
        
        # Wait for the process
        Wait-Process -Id $turboProcess.Id
    }
} catch {
    Show-Error -Message "Failed to start services: $_"
    Cleanup
    exit 1
} finally {
    Cleanup
}

