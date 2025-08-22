# ShareLite Production Deployment Guide

## Prerequisites
1. Your DNS A records are configured:
   - `@` -> Your server IP
   - `www` -> Your server IP  
   - `api` -> Your server IP

2. Your server has:
   - Nginx installed
   - Certbot installed
   - Node.js (if running backend)

## Step 1: Build the Frontend
```bash
cd web
npm run build
```

## Step 2: Upload Files to Server
```bash
# Upload built frontend
scp -r dist/* username@your-server-ip:/var/www/sharelite.site/

# Upload nginx config
scp nginx/nginx.conf username@your-server-ip:/tmp/
```

## Step 3: Configure Nginx on Server
```bash
# SSH into your server
ssh username@your-server-ip

# Copy nginx config
sudo cp /tmp/nginx.conf /etc/nginx/nginx.conf

# Test nginx config
sudo nginx -t

# Get SSL certificates
sudo certbot --nginx -d sharelite.site -d www.sharelite.site -d api.sharelite.site

# Restart nginx
sudo systemctl restart nginx
```

## Step 4: Verify Deployment
1. Visit https://sharelite.site
2. Check that redirects work:
   - http://sharelite.site -> https://sharelite.site
   - http://www.sharelite.site -> https://www.sharelite.site
3. Test API endpoint: https://api.sharelite.site

## Step 5: Monitor
```bash
# Check nginx status
sudo systemctl status nginx

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check SSL certificate
sudo certbot certificates
```

## Troubleshooting

### DNS Issues
```bash
# Check DNS propagation
nslookup sharelite.site
nslookup www.sharelite.site
nslookup api.sharelite.site
```

### SSL Issues
```bash
# Renew certificates manually
sudo certbot renew --dry-run

# Check certificate expiry
sudo certbot certificates
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo nginx -s reload

# Restart nginx
sudo systemctl restart nginx
```

## Auto-renewal Setup
Add to crontab for automatic SSL renewal:
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```
