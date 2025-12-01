@echo off
REM Easy SEO - Docker Build Script for Windows

echo ========================================
echo Easy SEO - Docker Build
echo ========================================
echo.

REM Build the Docker image
echo Building Docker image...
docker build -t easy-seo:latest .

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Docker image built successfully!
    echo.
    
    REM Ask if user wants to test locally
    set /p test="Do you want to test run locally? (y/n): "
    if /i "%test%"=="y" (
        echo.
        echo Starting local test on http://localhost:3000
        echo Press Ctrl+C to stop
        echo.
        docker run -p 3000:3000 --env-file .env easy-seo:latest
    )
    
    REM Ask if user wants to push to Docker Hub
    set /p push="Do you want to push to Docker Hub? (y/n): "
    if /i "%push%"=="y" (
        set /p username="Enter your Docker Hub username: "
        echo.
        echo Tagging image as %username%/easy-seo:latest
        docker tag easy-seo:latest %username%/easy-seo:latest
        
        echo Pushing to Docker Hub...
        docker push %username%/easy-seo:latest
        
        if %ERRORLEVEL% EQU 0 (
            echo.
            echo ✓ Successfully pushed to Docker Hub!
            echo Image: %username%/easy-seo:latest
        ) else (
            echo.
            echo ✗ Failed to push to Docker Hub
            echo Make sure you're logged in: docker login
        )
    )
) else (
    echo.
    echo ✗ Docker build failed!
    exit /b 1
)

echo.
echo ========================================
echo Build process complete
echo ========================================
pause
