#!/bin/bash

# Ride Sharing App Production Deployment Script
# Run this script on your server to deploy techo ""
echo "✅ Ride Sharing App deployment completed successfully!"
echo "🌐 Application is available at:"
echo "   - Main Site: https://${DOMAIN}"
echo "   - API: https://api.${DOMAIN}"
echo "   - WWW: https://www.${DOMAIN}"
echo ""ication

set -e

APP_DIR="/opt/ride-sharing-app"
REPO_URL="https://github.com/Hein-HtetSan/ride-sharing-app.git"
DOMAIN="sharelite.site"

echo "🚀 Starting deployment of Ride Sharing App to ${DOMAIN}..."

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

# Create production environment file
echo "🔧 Setting up environment variables..."
cat > .env << EOF
POSTGRES_DB=ride_sharing
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD:-postgres_secure_password}
DB_HOST=database
DB_PORT=5432
DB_NAME=ride_sharing
DB_USER=postgres
DB_PASSWORD=${DB_PASSWORD:-postgres_secure_password}
RMI_HOST=rmi-server
RMI_PORT=1099
IMAGE_PREFIX=ghcr.io/hein-htetsan/ride-sharing-app
IMAGE_TAG=latest
EOF

# Make sure Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Login to GitHub Container Registry if credentials are available
if [ ! -z "$GITHUB_TOKEN" ] && [ ! -z "$GITHUB_ACTOR" ]; then
    echo "🔑 Logging into GitHub Container Registry..."
    echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin
fi

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker compose -f docker-compose.prod.yml pull

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down

# Start new containers
echo "🚀 Starting new containers..."
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 60

# Check service health
echo "🏥 Checking service health..."
docker compose -f docker-compose.prod.yml ps

# Setup SSL certificates if not already present
if [ ! -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]; then
    echo "🔒 Setting up SSL certificates..."
    if command -v certbot &> /dev/null; then
        sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d api.${DOMAIN} --email ${SSL_EMAIL:-admin@${DOMAIN}} --agree-tos --non-interactive || echo "⚠️ SSL setup needs manual configuration"
    else
        echo "⚠️ Certbot not installed. SSL certificates need to be configured manually."
    fi
fi

# Update nginx configuration
if [ -f nginx/nginx.conf ]; then
    echo "🔧 Updating nginx configuration..."
    sudo cp nginx/nginx.conf /etc/nginx/sites-available/${DOMAIN}
    sudo ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx || echo "⚠️ Nginx configuration needs manual review"
fi

# Clean up unused images
echo "🧹 Cleaning up unused Docker images..."
docker image prune -f

echo ""
echo "✅ ShareLite deployment completed successfully!"
echo "🌐 Application is available at:"
echo "   - Main Site: https://${DOMAIN}"
echo "   - API: https://api.${DOMAIN}"
echo "   - WWW: https://www.${DOMAIN}"
echo ""

# Optional: Show logs
echo "📋 Recent logs:"
docker compose -f docker-compose.prod.yml logs --tail=20
