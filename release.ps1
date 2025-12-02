param (
    [string]$Version
)

# Якщо версія не передана параметром, запитуємо її
if (-not $Version) {
    $Version = Read-Host "Enter release version (e.g. 1.0.5-beta)"
}

$ImageName = "easy-seo"
$Username = "karbivskyi"
$Repo = "$Username/$ImageName"

Write-Host "Starting release process for version $Version..." -ForegroundColor Cyan

# 1. Build
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t $ImageName .
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

# 2. Tag
Write-Host "Tagging images..." -ForegroundColor Yellow
docker tag $ImageName "${Repo}:${Version}"
docker tag $ImageName "${Repo}:latest"

# 3. Push
Write-Host "Pushing version tag to Docker Hub..." -ForegroundColor Yellow
docker push "${Repo}:${Version}"
if ($LASTEXITCODE -ne 0) { Write-Error "Push failed for version tag"; exit 1 }

Write-Host "Pushing latest tag to Docker Hub..." -ForegroundColor Yellow
docker push "${Repo}:latest"
if ($LASTEXITCODE -ne 0) { Write-Error "Push failed for latest tag"; exit 1 }

Write-Host "Release $Version completed successfully!" -ForegroundColor Green
Write-Host "   - ${Repo}:${Version}"
Write-Host "   - ${Repo}:latest"
