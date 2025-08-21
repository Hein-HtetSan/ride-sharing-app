#!/bin/bash

echo "Starting Ride Sharing App Production Environment..."
echo "=================================================="

echo "Down all Docker services..."
docker-compose down

echo "Starting Docker Compose services..."
echo "Building and starting all Docker Compose services..."
docker-compose up --build -d

echo ""
echo "Waiting for services to start..."
echo "Running health checks..."

# Make the check script executable and run it
chmod +x ./scripts/check-services.sh
./scripts/check-services-prod.sh

echo ""
echo "To stop all services, run:"
echo "  docker-compose -f docker-compose.dev.yml down"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.dev.yml logs -f [service-name]"
echo ""
echo "Services:"
echo "- database: PostgreSQL database"
echo "- rmi-server: RMI server for backend logic"
echo "- api: Spring Boot REST API"
echo "- web: React frontend application"
