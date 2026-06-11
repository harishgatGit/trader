# ============================================
# InvestingAtti Video Agents Service
# Local Windows Startup Script
# ============================================
# Run from the repo root:  .\video_agents_service\start_local.ps1
# Or from video_agents_service dir: .\start_local.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "=== InvestingAtti Video Agents Service (Local) ===" -ForegroundColor Cyan
Write-Host "Working dir: $ScriptDir" -ForegroundColor Gray

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python not found. Install Python 3.11+ and add to PATH."
    exit 1
}

# Check/create virtual environment
if (-not (Test-Path ".\venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Install/upgrade dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt -q

# Verify Remotion node_modules exist
$RemotionDir = Join-Path $ScriptDir "templates\remotion"
if (-not (Test-Path "$RemotionDir\node_modules")) {
    Write-Host "Installing Remotion npm dependencies..." -ForegroundColor Yellow
    Push-Location $RemotionDir
    npm install
    Pop-Location
}

Write-Host ""
Write-Host "Starting FastAPI server on http://localhost:8090 ..." -ForegroundColor Green
Write-Host "Health check: http://localhost:8090/health" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

# Start uvicorn
python -m uvicorn app.main:app --host 0.0.0.0 --port 8090 --reload
