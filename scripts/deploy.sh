#!/bin/bash

# Deployment script for Ride Sharing App
# Run this script on your server to deploy the application

set -e

APP_DIR="/opt/ride-sharing-app"
REPO_URL="https://github.com/Hein-HtetSan/ride-sharing-app.git"

echo "🚀 Starting deployment of Ride Sharing App..."

# Create application directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
    echo "📁 Creating application directory..."
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
fi

# Navigate to application directory
cd "$APP_DIR"

# Clone or update repository
if [ ! -d ".git" ]; then
    echo "📥 Cloning repository..."
    git clone "$REPO_URL" .
else
    echo "🔄 Updating repository..."
    git pull origin main
fi

# Make sure Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Start new containers
echo "🚀 Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

# Clean up unused images
echo "🧹 Cleaning up unused Docker images..."
docker image prune -f

echo "✅ Deployment completed successfully!"
echo "🌐 Application should be available at:"
echo "   - Web UI: http://your-server-ip:3000"
echo "   - API: http://your-server-ip:8080"
echo "   - RMI Server: your-server-ip:1099"

# Optional: Show logs
echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=50
