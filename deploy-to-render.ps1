# Deploy CRM Backend to Render
# This script helps you deploy your backend to Render

Write-Host "🚀 CRM Backend Deployment to Render" -ForegroundColor Cyan
Write-Host ""

# Step 1: Render Deployment Note
Write-Host "Step 1: Render Deployment Method" -ForegroundColor Yellow
Write-Host 'Note: Render.com does not have a traditional CLI tool.' -ForegroundColor Cyan
Write-Host '   We will use the Render Dashboard (recommended) or manual Git deployment.' -ForegroundColor Cyan
Write-Host ""

# Step 2: Build the project
Write-Host ""
Write-Host "Step 2: Building backend..." -ForegroundColor Yellow
Set-Location apps/api
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Set-Location ../..
    exit 1
}
Write-Host "✅ Build successful!" -ForegroundColor Green
Set-Location ../..

# Step 3: Check environment variables
Write-Host ""
Write-Host "Step 3: Environment Variables Setup" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 IMPORTANT: You need to set these in Render Dashboard:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Required Variables:" -ForegroundColor White
Write-Host "  DATABASE_URL=postgresql://postgres:crm-db@db.gexgkpklsmeldaeiatmz.supabase.co:5432/postgres" -ForegroundColor Gray
Write-Host "  JWT_SECRET=<generate-random-64-char-string>" -ForegroundColor Gray
Write-Host "  JWT_REFRESH_SECRET=<generate-random-64-char-string>" -ForegroundColor Gray
Write-Host ""
Write-Host "Optional Variables:" -ForegroundColor White
Write-Host "  NODE_ENV=production" -ForegroundColor Gray
Write-Host "  PORT=10000" -ForegroundColor Gray
Write-Host '  REDIS_URL=(leave empty if not using Redis)' -ForegroundColor Gray
Write-Host "  CORS_ORIGIN=https://your-frontend-app.vercel.app" -ForegroundColor Gray
Write-Host "  LOG_LEVEL=info" -ForegroundColor Gray
Write-Host ""

# Generate JWT secrets
Write-Host "Generating JWT secrets for you..." -ForegroundColor Yellow
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$jwtRefreshSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

Write-Host ""
Write-Host "🔑 Generated JWT Secrets (Save these!):" -ForegroundColor Green
Write-Host "JWT_SECRET=$jwtSecret" -ForegroundColor Cyan
Write-Host "JWT_REFRESH_SECRET=$jwtRefreshSecret" -ForegroundColor Cyan
Write-Host ""
Write-Host 'Copy these secrets and paste them in Render Dashboard Environment Variables' -ForegroundColor Yellow
Write-Host ""

# Step 4: Login and Deploy
Write-Host ""
Write-Host "Step 4: Render Login and Deployment" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Use Render Dashboard (Recommended):" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to https://dashboard.render.com" -ForegroundColor White
Write-Host "   - Sign up or login (free tier available)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Click 'New +' then 'Web Service'" -ForegroundColor White
Write-Host ""
Write-Host "3. Connect your repository:" -ForegroundColor White
Write-Host "   - Option A: Connect GitHub (auto-deploy on push) ✅ Recommended" -ForegroundColor Gray
Write-Host "   - Option B: Manual deploy (upload code)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Configure service settings:" -ForegroundColor White
Write-Host "   - Name: crm-api (or your preferred name)" -ForegroundColor Gray
Write-Host "   - Region: Choose closest to your users" -ForegroundColor Gray
Write-Host "   - Branch: main (or your default branch)" -ForegroundColor Gray
Write-Host "   - Root Directory: apps/api" -ForegroundColor Gray
Write-Host "   - Runtime: Node" -ForegroundColor Gray
Write-Host '   - Build Command: cd ../.. && pnpm install && cd apps/api && pnpm build' -ForegroundColor Gray
Write-Host "   - Start Command: node dist/index.js" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Add Environment Variables (from Step 3 above):" -ForegroundColor White
Write-Host "   - Click 'Add Environment Variable' for each one" -ForegroundColor Gray
Write-Host "   - Copy the JWT secrets generated above" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Choose Plan:" -ForegroundColor White
Write-Host "   - Free: 750 hours/month (enough for development)" -ForegroundColor Green
Write-Host "   - Click 'Create Web Service'" -ForegroundColor Gray
Write-Host ""
Write-Host "7. Wait for deployment (~5-10 minutes)" -ForegroundColor White
Write-Host '   - Render will build and deploy your app' -ForegroundColor Gray
Write-Host '   - You will get a URL like: https://crm-api.onrender.com' -ForegroundColor Gray
Write-Host ""

Write-Host ""
Write-Host 'Setup complete! Follow the steps above to deploy.' -ForegroundColor Green
Write-Host ""

