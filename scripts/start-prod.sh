#!/bin/bash

echo "🚀 Starting Ride Sharing App Production Environment..."
echo "=================================================="

# Set production environment variables
export NODE_ENV=production
export IMAGE_PREFIX=ghcr.io/hein-htetsan/ride-sharing-app
export IMAGE_TAG=latest

echo "🛑 Stopping existing Docker services..."
docker-compose -f docker-compose.prod.yml down

echo "📦 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

echo "🚀 Starting Docker Compose services..."
docker-compose -f docker-compose.prod.yml up --build -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 30

echo "🔍 Running health checks..."

# Make the check script executable and run it
chmod +x ./scripts/check-services-prod.sh
./scripts/check-services-prod.sh

echo ""
echo "🌍 Ride Sharing App is now running at:"
echo "  - Main Site: https://sharelite.site"
echo "  - API: https://api.sharelite.site"
echo "  - WWW: https://www.sharelite.site"
echo ""
echo "To stop all services, run:"
echo "  docker-compose -f docker-compose.prod.yml down"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f [service-name]"
echo ""
echo "Services:"
echo "- database: PostgreSQL database"
echo "- rmi-server: RMI server for backend logic"
echo "- api: Spring Boot REST API"
echo "- web: React frontend application"
echo "- nginx: Reverse proxy and SSL termination"
