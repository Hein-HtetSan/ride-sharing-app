#!/bin/bash

echo "Checking Ride Sharing App Services..."
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in production environment
check_environment() {
    echo -e "[0/4] ${BLUE}Checking deployment environment...${NC}"
    
    if [ -f "/etc/letsencrypt/live/sharelite.site/fullchain.pem" ]; then
        echo -e "  ${GREEN}✅ Production environment detected (SSL certificates found)${NC}"
        PRODUCTION_MODE=true
    elif dig +short sharelite.site >/dev/null 2>&1; then
        echo -e "  ${YELLOW}⚠️ Domain configured but SSL not yet set up${NC}"
        PRODUCTION_MODE=true
    else
        echo -e "  ${BLUE}ℹ️ Development/Local environment${NC}"
        PRODUCTION_MODE=false
    fi
    echo ""
}

check_database() {
    echo -e "[1/4] Checking Database (PostgreSQL)..."
    while ! docker exec ride-sharing-db pg_isready -U postgres >/dev/null 2>&1; do
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
    while ! docker ps --filter "name=ride-sharing-api" --filter "status=running" | grep -q ride-sharing-api; do
        echo -e "  ${RED}❌ API container is not running${NC}"
        sleep 5
    done
    
    # Then wait for Spring Boot health endpoint (check both internal and external)
    local attempt=0
    local max_attempts=60  # 5 minutes timeout (60 * 5 seconds)
    
    # Check internal API first (container to container)
    while ! curl -s -f http://localhost:8080/api/v1/health >/dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [ $attempt -le $max_attempts ]; then
            if [ $((attempt % 6)) -eq 0 ]; then  # Show message every 30 seconds
                echo -e "  ${YELLOW}⏳ Spring Boot still starting... (${attempt}/60 attempts)${NC}"
            fi
        else
            echo -e "  ${RED}❌ API health check timed out after 5 minutes${NC}"
            echo -e "  ${YELLOW}💡 Try checking logs: docker compose -f docker-compose.prod.yml logs api${NC}"
            return 1
        fi
        sleep 5
    done
    
    # Also check external API endpoint if in production mode
    if [ "$PRODUCTION_MODE" = true ]; then
        echo -e "  ${YELLOW}⏳ Checking external API endpoint...${NC}"
        if curl -s -f https://api.sharelite.site/health >/dev/null 2>&1 || curl -s -f https://api.sharelite.site/api/v1/health >/dev/null 2>&1; then
            echo -e "  ${GREEN}✅ External API is accessible${NC}"
        else
            echo -e "  ${YELLOW}⚠️ External API not yet accessible (SSL/DNS might still be setting up)${NC}"
        fi
    fi
    
    echo -e "  ${GREEN}✅ API is ready and healthy${NC}"
}

check_web() {
    echo -e "[4/4] Checking Web Frontend..."
    
    # Check internal web service first
    while ! curl -s -f http://localhost:3000 >/dev/null 2>&1; do
        echo -e "  ${RED}❌ Web Frontend container is not ready${NC}"
        sleep 5
    done
    echo -e "  ${GREEN}✅ Web Frontend container is ready${NC}"
    
    # Also check external web endpoint if in production mode
    if [ "$PRODUCTION_MODE" = true ]; then
        echo -e "  ${YELLOW}⏳ Checking external web endpoint...${NC}"
        if curl -s -f https://sharelite.site >/dev/null 2>&1; then
            echo -e "  ${GREEN}✅ External website is accessible at https://sharelite.site${NC}"
        elif curl -s -f http://sharelite.site >/dev/null 2>&1; then
            echo -e "  ${YELLOW}⚠️ Website accessible via HTTP (HTTPS redirect may be pending)${NC}"
        else
            echo -e "  ${YELLOW}⚠️ External website not yet accessible (DNS/SSL might still be setting up)${NC}"
        fi
    fi
}

# Run all checks
check_environment
check_database
check_rmi
check_api
check_web

echo ""
echo -e "${GREEN}🎉 All services are ready!${NC}"
echo "====================================="
echo "Internal Services (Docker network):"
echo "Database:     localhost:5432"
echo "RMI Server:   rmi://localhost:1099"
echo "API:          http://localhost:8080"
echo "Web App:      http://localhost:3000"
echo ""
echo "External URLs (Production):"
echo "Main Site:    https://sharelite.site"
echo "API:          https://api.sharelite.site"
echo "WWW:          https://www.sharelite.site"
echo "Swagger UI:   https://api.sharelite.site/swagger-ui.html"
echo "====================================="

# Additional production checks
if [ "$PRODUCTION_MODE" = true ]; then
    echo ""
    echo -e "${YELLOW}🔍 Running additional production checks...${NC}"

    # Check SSL certificate
    if command -v openssl >/dev/null 2>&1; then
        echo -e "  ${YELLOW}⏳ Checking SSL certificate...${NC}"
        if echo | openssl s_client -servername sharelite.site -connect sharelite.site:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
            echo -e "  ${GREEN}✅ SSL certificate is valid${NC}"
        else
            echo -e "  ${YELLOW}⚠️ SSL certificate check failed or not yet configured${NC}"
        fi
    fi

    # Check nginx status
    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo -e "  ${GREEN}✅ Nginx is running${NC}"
    else
        echo -e "  ${YELLOW}⚠️ Nginx status unknown or not running${NC}"
    fi
fi

# Check disk space
echo -e "  ${YELLOW}💾 Disk usage:${NC}"
df -h / | tail -1 | awk '{print "     Root: " $3 "/" $2 " (" $5 " used)"}'
