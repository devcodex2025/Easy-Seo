param (
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ImageName = "easy-seo"
$Username = "karbivskyi"
$Repo = "$Username/$ImageName"

Write-Host "🚀 Starting release process for version $Version..." -ForegroundColor Cyan

# 1. Build
Write-Host "🔨 Building Docker image..." -ForegroundColor Yellow
docker build -t $ImageName:latest .
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

# 2. Tag
Write-Host "🏷️  Tagging images..." -ForegroundColor Yellow
docker tag $ImageName:latest "${Repo}:${Version}"
docker tag $ImageName:latest "${Repo}:latest"

# 3. Push
Write-Host "mw  Pushing to Docker Hub..." -ForegroundColor Yellow
docker push "${Repo}:${Version}"
if ($LASTEXITCODE -ne 0) { Write-Error "Push failed for version tag"; exit 1 }

docker push "${Repo}:latest"
if ($LASTEXITCODE -ne 0) { Write-Error "Push failed for latest tag"; exit 1 }

Write-Host "✅ Release $Version completed successfully!" -ForegroundColor Green
Write-Host "   - ${Repo}:${Version}"
Write-Host "   - ${Repo}:latest"
