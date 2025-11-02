# Local Deployment Script for Windows PowerShell
# This script helps deploy from your local machine without requiring GitHub

Write-Host "🚀 CRM Local Deployment Script" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Check if required tools are installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 20+ first." -ForegroundColor Red
    exit 1
}

# Check pnpm
try {
    $pnpmVersion = pnpm --version
    Write-Host "✅ pnpm: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pnpm not found. Installing..." -ForegroundColor Yellow
    npm install -g pnpm
}

Write-Host ""
Write-Host "Deployment Options:" -ForegroundColor Cyan
Write-Host "1. Deploy Backend only (Railway/Render)" -ForegroundColor White
Write-Host "2. Deploy Frontend only (Vercel)" -ForegroundColor White
Write-Host "3. Deploy Both" -ForegroundColor White
Write-Host "4. Build for manual deployment" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select option (1-4)"

switch ($choice) {
    "1" {
        Write-Host "📦 Building Backend..." -ForegroundColor Yellow
        Set-Location apps/api
        Set-Location ../..
        pnpm install
        pnpm --filter @crm/shared build
        Set-Location apps/api
        pnpm build
        
        Write-Host ""
        Write-Host "Backend build complete!" -ForegroundColor Green
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Install Railway CLI: npm install -g @railway/cli" -ForegroundColor White
        Write-Host "2. Login: railway login" -ForegroundColor White
        Write-Host "3. Deploy: railway up" -ForegroundColor White
        Write-Host ""
        Write-Host "Or use Render CLI:" -ForegroundColor Cyan
        Write-Host "1. Install: npm install -g render-cli" -ForegroundColor White
        Write-Host "2. Login: render login" -ForegroundColor White
        Write-Host "3. Deploy: render deploy" -ForegroundColor White
    }
    
    "2" {
        Write-Host "📦 Building Frontend..." -ForegroundColor Yellow
        Set-Location apps/web
        Set-Location ../..
        pnpm install
        pnpm --filter @crm/shared build
        Set-Location apps/web
        pnpm build
        
        Write-Host ""
        Write-Host "Frontend build complete!" -ForegroundColor Green
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Install Vercel CLI: npm install -g vercel" -ForegroundColor White
        Write-Host "2. Login: vercel login" -ForegroundColor White
        Write-Host "3. Deploy: vercel --prod" -ForegroundColor White
    }
    
    "3" {
        Write-Host "📦 Building Both..." -ForegroundColor Yellow
        
        # Install dependencies
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        pnpm install
        
        # Build shared package
        Write-Host "Building shared package..." -ForegroundColor Yellow
        pnpm --filter @crm/shared build
        
        # Build backend
        Write-Host "Building backend..." -ForegroundColor Yellow
        Set-Location apps/api
        pnpm build
        Set-Location ../..
        
        # Build frontend
        Write-Host "Building frontend..." -ForegroundColor Yellow
        Set-Location apps/web
        pnpm build
        Set-Location ../..
        
        Write-Host ""
        Write-Host "✅ Build complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Deploy Backend:" -ForegroundColor Cyan
        Write-Host "  cd apps/api" -ForegroundColor White
        Write-Host "  railway up  (or render deploy)" -ForegroundColor White
        Write-Host ""
        Write-Host "Deploy Frontend:" -ForegroundColor Cyan
        Write-Host "  cd apps/web" -ForegroundColor White
        Write-Host "  vercel --prod" -ForegroundColor White
    }
    
    "4" {
        Write-Host "📦 Building for manual deployment..." -ForegroundColor Yellow
        
        # Install dependencies
        pnpm install
        
        # Build shared
        pnpm --filter @crm/shared build
        
        # Build backend
        Write-Host "Building backend..." -ForegroundColor Yellow
        Set-Location apps/api
        pnpm build
        Set-Location ../..
        
        # Build frontend
        Write-Host "Building frontend..." -ForegroundColor Yellow
        Set-Location apps/web
        pnpm build
        Set-Location ../..
        
        Write-Host ""
        Write-Host "✅ Build complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Backend build output: apps/api/dist/" -ForegroundColor Cyan
        Write-Host "Frontend build output: apps/web/.next/" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "You can now:" -ForegroundColor Yellow
        Write-Host "1. ZIP the apps/api/dist folder and upload to hosting platform" -ForegroundColor White
        Write-Host "2. ZIP the apps/web/.next folder and upload to hosting platform" -ForegroundColor White
        Write-Host "3. Or use CLI tools to deploy" -ForegroundColor White
    }
    
    default {
        Write-Host "Invalid option" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "  - docs/DEPLOYMENT_GUIDE.md" -ForegroundColor White
Write-Host "  - DEPLOYMENT_QUICK_START.md" -ForegroundColor White

