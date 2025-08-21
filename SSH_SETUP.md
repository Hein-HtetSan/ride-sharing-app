# SSH Key Setup Guide for GitHub Actions

## 1. Generate SSH Key Pair (if you don't have one)

On your local machine, generate a new SSH key pair:

```bash
# Generate a new SSH key (replace with your email)
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/deploy_key

# Or if ed25519 is not supported, use RSA
ssh-keygen -t rsa -b 4096 -C "your-email@example.com" -f ~/.ssh/deploy_key
```

**Important**: When prompted for a passphrase, **leave it empty** (just press Enter). GitHub Actions doesn't handle encrypted keys well without additional setup.

This creates two files:
- `~/.ssh/deploy_key` (private key)
- `~/.ssh/deploy_key.pub` (public key)

## 2. Add Public Key to Your Server

Copy the public key to your server:

```bash
# Copy public key to server
ssh-copy-id -i ~/.ssh/deploy_key.pub username@your-server-ip

# Or manually add it to authorized_keys
cat ~/.ssh/deploy_key.pub | ssh username@your-server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

## 3. Test SSH Connection

Test that the key works:

```bash
ssh -i ~/.ssh/deploy_key username@your-server-ip
```

## 4. Add Secrets to GitHub

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret:

### Add these secrets:

1. **SERVER_HOST**
   ```
   your-server-ip-or-domain
   ```

2. **SERVER_USER**
   ```
   ubuntu
   ```
   (or whatever your SSH username is: root, ec2-user, etc.)

3. **SERVER_SSH_KEY**
   ```bash
   # Copy the ENTIRE private key content
   cat ~/.ssh/deploy_key
   ```
   
   Copy the output including:
   ```
   -----BEGIN OPENSSH PRIVATE KEY-----
   [key content]
   -----END OPENSSH PRIVATE KEY-----
   ```

4. **DOCKER_USERNAME**
   ```
   your-dockerhub-username
   ```

5. **DOCKER_PASSWORD**
   ```
   your-dockerhub-password-or-token
   ```

## 5. Server Prerequisites

Make sure your server has:

```bash
# Update system
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y

# Log out and back in for group changes
```

## 6. Troubleshooting

### If SSH key still doesn't work:

1. **Check key format**: Make sure you copied the entire private key including headers/footers
2. **Check permissions**: 
   ```bash
   chmod 600 ~/.ssh/deploy_key
   chmod 700 ~/.ssh
   ```
3. **Try password authentication** temporarily:
   - Add `password: ${{ secrets.SERVER_PASSWORD }}` to the ssh-action
   - Remove the `key:` line
   - Add SERVER_PASSWORD secret with your user password

### Alternative: Use password authentication

If SSH keys continue to cause issues, you can use password authentication:

```yaml
- name: Deploy to server
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    password: ${{ secrets.SERVER_PASSWORD }}
    port: 22
    script: |
      # deployment script here
```

Then add `SERVER_PASSWORD` secret with your user's password.

## Security Note

For production, SSH keys are more secure than passwords. If you must use passwords, consider:
- Creating a dedicated deploy user with limited permissions
- Using sudo with NOPASSWD for docker commands only
