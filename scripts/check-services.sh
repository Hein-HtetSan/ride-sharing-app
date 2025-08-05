#!/bin/bash

echo "Checking Ride Sharing App Services..."
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_database() {
    echo -e "[1/4] Checking Database (PostgreSQL)..."
    while ! docker exec ride-sharing-db-dev pg_isready -U postgres >/dev/null 2>&1; do
        echo -e "  ${RED}❌ Database is not ready${NC}"
        sleep 5
    done
    echo -e "  ${GREEN}✅ Database is ready${NC}"
}

check_rmi() {
    echo -e "[2/4] Checking RMI Server..."
    while ! (echo > /dev/tcp/localhost/1099) >/dev/null 2>&1; do
        echo -e "  ${RED}❌ RMI Server is not ready${NC}"
        sleep 5
    done
    echo -e "  ${GREEN}✅ RMI Server is ready${NC}"
}

check_api() {
    echo -e "[3/4] Checking Spring Boot API..."
    echo -e "  ${YELLOW}⏳ Waiting for Spring Boot to download dependencies and start...${NC}"
    
    # First check if container is running
    while ! docker ps --filter "name=ride-sharing-api-dev" --filter "status=running" | grep -q ride-sharing-api-dev; do
        echo -e "  ${RED}❌ API container is not running${NC}"
        sleep 5
    done
    
    # Then wait for Spring Boot health endpoint
    local attempt=0
    local max_attempts=60  # 5 minutes timeout (60 * 5 seconds)
    
    while ! curl -s -f http://localhost:8080/api/v1/health >/dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [ $attempt -le $max_attempts ]; then
            if [ $((attempt % 6)) -eq 0 ]; then  # Show message every 30 seconds
                echo -e "  ${YELLOW}⏳ Spring Boot still starting... (${attempt}/60 attempts)${NC}"
            fi
        else
            echo -e "  ${RED}❌ API health check timed out after 5 minutes${NC}"
            echo -e "  ${YELLOW}💡 Try checking logs: docker-compose -f docker-compose.dev.yml logs api${NC}"
            return 1
        fi
        sleep 5
    done
    
    echo -e "  ${GREEN}✅ API is ready and healthy${NC}"
}

check_web() {
    echo -e "[4/4] Checking Web Frontend..."
    while ! curl -s -f http://localhost:3000 >/dev/null 2>&1; do
        echo -e "  ${RED}❌ Web Frontend is not ready${NC}"
        sleep 5
    done
    echo -e "  ${GREEN}✅ Web Frontend is ready${NC}"
}

# Run all checks
check_database
check_rmi
check_api
check_web

echo ""
echo -e "${GREEN}🎉 All services are ready!${NC}"
echo "====================================="
echo "Database:     http://localhost:5432"
echo "RMI Server:   rmi://localhost:1099"
echo "API:          http://localhost:8080"
echo "Web App:      http://localhost:3000"
echo "Swagger UI:   http://localhost:8080/swagger-ui.html"
echo "====================================="
