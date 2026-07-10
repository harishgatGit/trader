# ============================================
# Upload all of today's videos to YouTube
# ============================================

$date = "2026-06-27"
$videoBase = "C:\Users\haris\Documents\code_base\trader\video_agents_service\outputs\videos\$date"
$serviceUrl = "http://localhost:8095"
$apiKey = "investingatti-youtube-key-dev"

# All tickers with final-video.mp4
$tickers = @("AMD","AMZN","ARM","AVGO","COIN","GOOGL","MARA","META","MSFT","MSTR","NFLX","NIO","NVDA","PLTR","RIOT","SOFI","TSLA")

Write-Host "=== Uploading $($tickers.Count) videos to YouTube ===" -ForegroundColor Cyan
Write-Host ""

foreach ($ticker in $tickers) {
    $videoPath = "$videoBase\$ticker\final-video.mp4"
    
    if (-not (Test-Path $videoPath)) {
        Write-Host "[$ticker] SKIP - Video not found at $videoPath" -ForegroundColor Yellow
        continue
    }

    $jobId = "manual-upload-${ticker}-${date}"
    
    $body = @{
        jobId      = $jobId
        ticker     = $ticker
        reportDate = $date
        videoPath  = $videoPath
        reportData = @{
            finalRating      = "ANALYZED"
            executiveSummary = "AI-powered stock analysis for $ticker on $date"
        }
        visibility = "private"
    } | ConvertTo-Json -Depth 5

    Write-Host "[$ticker] Uploading..." -ForegroundColor Green -NoNewline

    try {
        $response = Invoke-RestMethod -Uri "$serviceUrl/upload" `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{ "x-api-key" = $apiKey } `
            -Body $body `
            -TimeoutSec 10

        Write-Host " queued (jobId: $jobId)" -ForegroundColor Gray
    }
    catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Small delay between requests to avoid overwhelming the service
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "=== All uploads queued. Check service logs for progress. ===" -ForegroundColor Cyan
