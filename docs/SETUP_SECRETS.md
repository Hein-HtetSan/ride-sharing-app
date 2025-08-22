# 🔧 GitHub Secrets Setup Guide

## Quick Setup Instructions

**🚨 IMPORTANT:** You need to set up GitHub Secrets before the deployment will work properly.

### 1. Go to GitHub Secrets Settings
1. Open your repository: https://github.com/Hein-HtetSan/ride-sharing-app
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### 2. Add Required Secrets

#### Server Access (Required)
```
Name: SERVER_HOST
Value: YOUR_SERVER_IP_ADDRESS
```

```
Name: SERVER_USER  
Value: YOUR_SSH_USERNAME (e.g., ubuntu, root, admin)
```

```
Name: SERVER_SSH_KEY
Value: YOUR_PRIVATE_SSH_KEY
```

**To get your SSH key:**
```bash
# On your local machine
cat ~/.ssh/id_rsa
# Copy the ENTIRE content including -----BEGIN and -----END lines
```

#### Database Security (Required)
```
Name: DB_PASSWORD
Value: YOUR_SECURE_DATABASE_PASSWORD
```

#### SSL Certificate (Required)
```
Name: SSL_EMAIL
Value: YOUR_EMAIL_ADDRESS
```

#### API Keys (Optional)
```
Name: ORS_API_KEY
Value: YOUR_OPENROUTESERVICE_API_KEY
```

```
Name: GOOGLE_MAPS_API_KEY  
Value: YOUR_GOOGLE_MAPS_API_KEY
```

### 3. Server Preparation

**SSH into your server and run:**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt update
sudo apt install docker-compose-plugin

# Install Nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx

# Logout and login again
exit
```

### 4. Test Deployment

After setting up secrets:

```bash
# Push any change to trigger deployment
git add .
git commit -m "Test deployment"
git push origin main
```

### 5. Monitor Deployment

- **GitHub Actions**: https://github.com/Hein-HtetSan/ride-sharing-app/actions
- **Live Site**: https://sharelite.site (after successful deployment)
- **API**: https://api.sharelite.site

## Troubleshooting

### Common Issues

1. **"Context access might be invalid"**
   - This is a linting warning, not an error
   - The deployment will still work

2. **"Permission denied (publickey)"**
   - Check SERVER_SSH_KEY is complete
   - Ensure public key is on server: `ssh-copy-id user@server`

3. **"fatal: Need to specify how to reconcile divergent branches"**
   - Fixed in latest deployment script
   - Uses `git reset --hard origin/main`

4. **"Docker command not found"**
   - Install Docker on server (see server preparation)
   - Add user to docker group: `sudo usermod -aG docker $USER`

### Check Deployment Status

```bash
# SSH into your server
ssh your-user@your-server-ip

# Check containers
cd /opt/ride-sharing-app
sudo docker compose -f docker-compose.prod.yml ps

# Check logs
sudo docker compose -f docker-compose.prod.yml logs -f web
```

## Current Status

✅ **Fixed Issues:**
- Docker build now includes devDependencies
- Git conflicts resolved with force reset
- Custom nginx configuration added
- Build performance improved with .dockerignore

⚠️ **Next Steps:**
1. Set up GitHub Secrets (above)
2. Prepare your server 
3. Push to trigger deployment
4. Monitor GitHub Actions for success

## Quick Secret Template

Copy this template and fill in your values:

```
SERVER_HOST=123.456.789.012
SERVER_USER=ubuntu
SERVER_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
[your private key content]
-----END OPENSSH PRIVATE KEY-----
DB_PASSWORD=MySecurePassword123!
SSL_EMAIL=yourname@example.com
ORS_API_KEY=your_api_key_here
GOOGLE_MAPS_API_KEY=your_maps_key_here
```
