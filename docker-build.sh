#!/bin/bash

# Easy SEO - Docker Build and Deploy Script

echo "🚀 Building Easy SEO Docker Image..."

# Build the Docker image
docker build -t easy-seo:latest .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    
    # Optional: Test run locally
    read -p "Do you want to test run locally? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🧪 Starting local test..."
        docker run -p 3000:3000 --env-file .env easy-seo:latest
    fi
    
    # Optional: Push to Docker Hub
    read -p "Do you want to push to Docker Hub? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your Docker Hub username: " username
        docker tag easy-seo:latest $username/easy-seo:latest
        docker push $username/easy-seo:latest
        echo "✅ Pushed to Docker Hub as $username/easy-seo:latest"
    fi
else
    echo "❌ Docker build failed!"
    exit 1
fi
