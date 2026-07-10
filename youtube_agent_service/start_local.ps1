# ============================================
# InvestingAtti YouTube Agent Service (Node/NestJS)
# Local Windows Startup Script
# ============================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "=== InvestingAtti YouTube Agent Service (Local NestJS) ===" -ForegroundColor Cyan
Write-Host "Working dir: $ScriptDir" -ForegroundColor Gray

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js not found. Install Node.js 18+ and add to PATH."
    exit 1
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path ".\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Run Prisma generate to ensure client is updated
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host ""
Write-Host "Starting NestJS server on http://localhost:8095 ..." -ForegroundColor Green
Write-Host "Health check: http://localhost:8095/health" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

# Start NestJS development server
npm run start:dev
