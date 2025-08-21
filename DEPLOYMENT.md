# Server Deployment Guide

## Prerequisites on Server

1. **Install Docker**
```bash
# Update package manager
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
```

2. **Install Docker Compose**
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

3. **Install Git**
```bash
sudo apt install git -y
```

## Setup GitHub Actions Secrets

In your GitHub repository, go to Settings > Secrets and variables > Actions, and add these secrets:

- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub password or access token
- `SERVER_HOST`: Your server's IP address or domain
- `SERVER_USER`: SSH username for your server (e.g., ubuntu, root)
- `SERVER_SSH_KEY`: Your private SSH key for server access

## Deploy to Server

### Option 1: Automatic Deployment (via GitHub Actions)

1. Push your code to the main branch
2. GitHub Actions will automatically build and push images to Docker Hub
3. Then deploy to your server

### Option 2: Manual Deployment

1. **Copy the deployment script to your server:**
```bash
# On your local machine
scp scripts/deploy.sh user@your-server-ip:/home/user/
```

2. **Run the deployment script on your server:**
```bash
# On your server
chmod +x deploy.sh
./deploy.sh
```

### Option 3: Direct Docker Compose

1. **Clone repository on server:**
```bash
git clone https://github.com/Hein-HtetSan/ride-sharing-app.git
cd ride-sharing-app
```

2. **Pull and start services:**
```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Update Application

To update your application after pushing new code:

### Automatic (GitHub Actions)
- Just push to main branch, deployment happens automatically

### Manual
```bash
# On your server
cd /opt/ride-sharing-app
./scripts/deploy.sh
```

## Monitor Application

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check individual service logs
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f rmi-server
```

## Ports

- **Web UI**: http://your-server-ip:3000
- **API**: http://your-server-ip:8080
- **RMI Server**: your-server-ip:1099
- **Database**: your-server-ip:5432 (internal use)

## Troubleshooting

1. **Check if services are running:**
```bash
docker ps
```

2. **Restart specific service:**
```bash
docker-compose -f docker-compose.prod.yml restart api
```

3. **Rebuild and restart:**
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

4. **Clean up:**
```bash
docker system prune -a
```
