# 🚀 Ride Sharing App Auto-Deployment Summary

## What You Get
✅ **Automatic deployment** when you push to `main` branch  
✅ **Docker-based infrastructure** with GitHub Container Registry  
✅ **SSL certificates** automatically managed  
✅ **Zero-downtime deployments** with health checks  
✅ **Domain-based routing** to `sharelite.site`  

## Quick Setup Checklist

### 1. 🔧 Server Setup (One-time)
```bash
# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo apt install docker-compose-plugin nginx certbot python3-certbot-nginx

# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again

# Create directories
sudo mkdir -p /opt/sharelite /var/www/sharelite.site
sudo chown $USER:$USER /opt/sharelite
sudo chown www-data:www-data /var/www/sharelite.site
```

### 2. 🔑 GitHub Secrets Setup
Add these in GitHub → Repository → Settings → Secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `SERVER_HOST` | Your server IP | `123.456.789.012` |
| `SERVER_USER` | SSH username | `ubuntu` or `root` |
| `SERVER_SSH_KEY` | Private SSH key | `-----BEGIN OPENSSH...` |
| `DB_PASSWORD` | Database password | `SecurePassword123!` |
| `SSL_EMAIL` | Your email | `you@example.com` |
| `VITE_ORS_API_KEY` | OpenRoute API key | (optional) |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps key | (optional) |

### 3. 🌐 DNS Configuration (Already Done)
Your A records should already be set:
- `@` → Server IP
- `www` → Server IP  
- `api` → Server IP

### 4. 🚀 Deploy!
Simply push to main branch:
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

## What Happens When You Push

1. **🔨 Build Phase** (2-3 minutes)
   - Builds Docker images for web, api, rmi
   - Pushes to GitHub Container Registry
   - Includes production environment variables

2. **🚀 Deploy Phase** (1-2 minutes)
   - Copies files to server
   - Pulls latest images
   - Updates containers
   - Sets up SSL certificates (first time)
   - Reloads nginx

3. **🧪 Test Phase** (30 seconds)
   - Tests website accessibility
   - Verifies API endpoints
   - Reports success/failure

## After First Deployment

### Your Live URLs:
- 🌍 **Main Site**: https://sharelite.site
- 🔧 **API**: https://api.sharelite.site  
- 📱 **WWW**: https://www.sharelite.site (redirects to main)

### Monitoring Commands:
```bash
# SSH into server
ssh your-username@your-server-ip

# Check containers
cd /opt/sharelite && sudo docker compose ps

# View logs
sudo docker compose logs -f web
sudo docker compose logs -f api

# Check SSL
sudo certbot certificates

# Nginx status
sudo systemctl status nginx
```

## Future Deployments

Every time you push to `main`:
1. New Docker images are built automatically
2. Server pulls latest images
3. Containers restart with zero downtime
4. Your changes go live in ~5 minutes

## Environment-Specific Features

### Development (`localhost`)
- Uses local environment variables
- CORS allows all origins
- Debug features enabled

### Production (`sharelite.site`)
- Secure HTTPS-only
- Production API endpoints
- SSL certificates
- Optimized builds

## Rollback if Needed

If something goes wrong:
```bash
# SSH into server
ssh your-username@your-server-ip
cd /opt/sharelite

# Rollback to previous version
sudo docker compose down
sudo docker image ls  # Find previous image tag
# Edit docker-compose.yml to use previous tag
sudo docker compose up -d
```

## Next Steps

1. **Setup GitHub Secrets** (most important)
2. **Test build workflow** (push a small change)
3. **Monitor first deployment** (check Actions tab)
4. **Verify SSL setup** (certificates auto-generated)
5. **Test your app** at https://sharelite.site

The system is designed to be **"push and forget"** - just develop and push, everything else happens automatically! 🎉

**Project:** Ride Sharing App  
**Domain:** sharelite.site  
**Deployment:** Fully automated via GitHub Actions
