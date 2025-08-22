# GitHub Actions CI/CD Setup Guide

## Required GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions, and add these secrets:

### Server Configuration
```
SERVER_HOST=your.server.ip.address
SERVER_USER=your-server-username
SERVER_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
your-private-ssh-key-content-here
-----END OPENSSH PRIVATE KEY-----
```

### Database Configuration
```
DB_PASSWORD=your-secure-database-password
```

### SSL Certificate Email
```
SSL_EMAIL=your-email@example.com
```

### API Keys (Optional but recommended)
```
ORS_API_KEY=your-openrouteservice-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

**Note:** The workflow uses GitHub Container Registry (ghcr.io) which is free and doesn't require additional Docker Hub secrets.

## Server Preparation

### 1. Install Required Software on Your Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Install Nginx
sudo apt install nginx

# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Logout and login again for Docker permissions
```

### 2. Setup SSH Key Authentication
```bash
# On your local machine, generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy public key to server
ssh-copy-id your-username@your-server-ip

# Test SSH connection
ssh your-username@your-server-ip

# Add the PRIVATE key content to GitHub Secrets as SERVER_SSH_KEY
cat ~/.ssh/id_ed25519  # Copy this entire content
```

### 3. Prepare Server Directories
```bash
# SSH into your server
ssh your-username@your-server-ip

# Create deployment directory
sudo mkdir -p /opt/sharelite
sudo chown $USER:$USER /opt/sharelite

# Create web directory for static files
sudo mkdir -p /var/www/sharelite.site
sudo chown www-data:www-data /var/www/sharelite.site
```

### 4. Configure Domain DNS (Already done)
Your A records should point to your server IP:
- `@` (sharelite.site) → Server IP
- `www` → Server IP  
- `api` → Server IP

## How It Works

### Automatic Deployment Trigger
1. **Push to main branch** triggers the workflow
2. **Builds Docker images** for web, api, and rmi services
3. **Pushes images** to GitHub Container Registry
4. **Deploys to server** using Docker Compose
5. **Sets up SSL certificates** automatically
6. **Tests deployment** and reports status

### Workflow Steps
1. 🔨 **Build Phase**: Creates Docker images for all services
2. 🚀 **Deploy Phase**: 
   - Copies files to server
   - Pulls latest images
   - Updates containers with zero downtime
   - Configures SSL certificates
   - Updates Nginx configuration
3. 🧪 **Test Phase**: Verifies deployment is working

## Manual Deployment Commands

If you need to deploy manually:

```bash
# Build and push images manually
docker build -t ghcr.io/your-username/sharelite-web:latest ./web
docker build -t ghcr.io/your-username/sharelite-api:latest ./api
docker build -t ghcr.io/your-username/sharelite-rmi:latest ./rmi

docker push ghcr.io/your-username/sharelite-web:latest
docker push ghcr.io/your-username/sharelite-api:latest
docker push ghcr.io/your-username/sharelite-rmi:latest

# Deploy on server
ssh your-username@your-server-ip
cd /opt/sharelite
sudo docker compose pull
sudo docker compose up -d
```

## Monitoring Deployment

### Check GitHub Actions
- Go to your repository → Actions tab
- Watch the workflow progress
- Check logs if deployment fails

### Check Server Status
```bash
# SSH into server
ssh your-username@your-server-ip

# Check running containers
cd /opt/sharelite
sudo docker compose ps

# Check logs
sudo docker compose logs -f web
sudo docker compose logs -f api
sudo docker compose logs -f rmi-server

# Check Nginx
sudo systemctl status nginx
sudo nginx -t
```

### Test Your Application
- 🌍 Main site: https://sharelite.site
- 🔧 API: https://api.sharelite.site
- 📱 WWW redirect: https://www.sharelite.site

## Troubleshooting

### Common Issues

1. **SSH Permission Denied**
   - Verify SSH key is correct in GitHub Secrets
   - Ensure public key is in server's `~/.ssh/authorized_keys`

2. **Docker Permission Denied**
   - User must be in docker group: `sudo usermod -aG docker $USER`
   - Logout and login again

3. **SSL Certificate Issues**
   - Ensure DNS is properly configured
   - Check domain points to correct IP
   - Manually run: `sudo certbot --nginx -d sharelite.site -d www.sharelite.site -d api.sharelite.site`

4. **Container Won't Start**
   - Check logs: `sudo docker compose logs service-name`
   - Verify environment variables
   - Check resource usage: `docker system df`

## Security Notes

- 🔐 Never commit secrets to repository
- 🔑 Use strong passwords for database
- 🛡️ Keep server updated
- 📊 Monitor logs regularly
- 🔄 Rotate SSH keys periodically
