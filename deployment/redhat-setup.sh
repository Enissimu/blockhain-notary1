#!/bin/bash

# Blockchain Notary Service - RedHat Enterprise Linux Setup Script
# This script sets up the environment for deploying the blockchain notarization service

set -e

echo "🚀 Starting RedHat Enterprise Linux deployment setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo dnf update -y

# Install required system packages
print_status "Installing required system packages..."
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y \
    curl \
    wget \
    git \
    openssl \
    openssl-devel \
    gcc-c++ \
    make \
    python3 \
    python3-pip \
    firewalld \
    nginx \
    systemd

# Install Node.js 18.x (LTS)
print_status "Installing Node.js 18.x..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
print_status "Node.js version: $node_version"
print_status "NPM version: $npm_version"

# Create application user
print_status "Creating application user 'notary'..."
if ! id "notary" &>/dev/null; then
    sudo useradd -m -s /bin/bash notary
    sudo usermod -aG wheel notary
    print_status "User 'notary' created successfully"
else
    print_warning "User 'notary' already exists"
fi

# Create application directory
APP_DIR="/opt/blockchain-notary"
print_status "Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown notary:notary $APP_DIR

# Set up project structure
print_status "Setting up project structure..."
sudo -u notary mkdir -p $APP_DIR/{logs,config,ssl,backups}

# Copy application files (assuming they're in current directory)
print_status "Copying application files..."
sudo cp -r . $APP_DIR/app/
sudo chown -R notary:notary $APP_DIR/app/

# Install application dependencies
print_status "Installing application dependencies..."
cd $APP_DIR/app
sudo -u notary npm install --production

# Install PM2 for process management
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Create PM2 ecosystem file
print_status "Creating PM2 ecosystem configuration..."
sudo -u notary tee $APP_DIR/config/ecosystem.config.js > /dev/null << 'EOF'
module.exports = {
  apps: [{
    name: 'blockchain-notary-api',
    script: '/opt/blockchain-notary/app/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: '/opt/blockchain-notary/logs/combined.log',
    out_file: '/opt/blockchain-notary/logs/out.log',
    error_file: '/opt/blockchain-notary/logs/error.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 5000,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};
EOF

# Create environment file template
print_status "Creating environment configuration template..."
sudo -u notary tee $APP_DIR/config/.env.production > /dev/null << 'EOF'
# Blockchain Configuration
NETWORK_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=
PRIVATE_KEY=

# API Configuration
PORT=3000
NODE_ENV=production

# Security
REPORT_GAS=false

# SSL Configuration (if using HTTPS)
SSL_CERT_PATH=/opt/blockchain-notary/ssl/cert.pem
SSL_KEY_PATH=/opt/blockchain-notary/ssl/key.pem
EOF

# Create systemd service for PM2
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/blockchain-notary.service > /dev/null << 'EOF'
[Unit]
Description=Blockchain Notary Service
Documentation=https://github.com/your-repo/blockchain-notary
After=network.target

[Service]
Type=forking
User=notary
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=PM2_HOME=/home/notary/.pm2
PIDFile=/home/notary/.pm2/pm2.pid
Restart=on-failure

ExecStart=/usr/bin/pm2 start /opt/blockchain-notary/config/ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 restart all --update-env
ExecStop=/usr/bin/pm2 stop all

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx reverse proxy
print_status "Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/conf.d/blockchain-notary.conf > /dev/null << 'EOF'
upstream blockchain_notary {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;  # Replace with your domain
    
    # SSL Configuration (replace with your certificates)
    ssl_certificate /opt/blockchain-notary/ssl/cert.pem;
    ssl_certificate_key /opt/blockchain-notary/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    location / {
        proxy_pass http://blockchain_notary;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # File upload size
        client_max_body_size 10M;
    }
    
    # Health check endpoint (bypass rate limiting)
    location /api/health {
        proxy_pass http://blockchain_notary;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files (if any)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Configure firewall
print_status "Configuring firewall..."
sudo systemctl enable firewalld
sudo systemctl start firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp  # For direct API access if needed
sudo firewall-cmd --reload

# Set up log rotation
print_status "Configuring log rotation..."
sudo tee /etc/logrotate.d/blockchain-notary > /dev/null << 'EOF'
/opt/blockchain-notary/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 notary notary
    postrotate
        /usr/bin/pm2 reloadLogs
    endscript
}
EOF

# Create backup script
print_status "Creating backup script..."
sudo -u notary tee $APP_DIR/scripts/backup.sh > /dev/null << 'EOF'
#!/bin/bash

# Blockchain Notary Service Backup Script
BACKUP_DIR="/opt/blockchain-notary/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="notary_backup_${DATE}.tar.gz"

echo "Creating backup: $BACKUP_FILE"

tar -czf "${BACKUP_DIR}/${BACKUP_FILE}" \
    --exclude='node_modules' \
    --exclude='cache' \
    --exclude='artifacts' \
    --exclude='logs' \
    /opt/blockchain-notary/app \
    /opt/blockchain-notary/config

# Keep only last 30 backups
find ${BACKUP_DIR} -name "notary_backup_*.tar.gz" -type f -mtime +30 -delete

echo "Backup completed: ${BACKUP_DIR}/${BACKUP_FILE}"
EOF

chmod +x $APP_DIR/scripts/backup.sh

# Create monitoring script
print_status "Creating monitoring script..."
sudo -u notary tee $APP_DIR/scripts/monitor.sh > /dev/null << 'EOF'
#!/bin/bash

# Simple monitoring script
SERVICE_NAME="blockchain-notary"
API_URL="http://localhost:3000/api/health"

# Check if service is running
if ! systemctl is-active --quiet $SERVICE_NAME; then
    echo "$(date): Service $SERVICE_NAME is not running" >> /opt/blockchain-notary/logs/monitor.log
    systemctl restart $SERVICE_NAME
fi

# Check API health
if ! curl -f -s $API_URL > /dev/null; then
    echo "$(date): API health check failed" >> /opt/blockchain-notary/logs/monitor.log
fi
EOF

chmod +x $APP_DIR/scripts/monitor.sh

# Set up cron jobs
print_status "Setting up cron jobs..."
sudo -u notary crontab << 'EOF'
# Backup every day at 2 AM
0 2 * * * /opt/blockchain-notary/scripts/backup.sh

# Monitor every 5 minutes
*/5 * * * * /opt/blockchain-notary/scripts/monitor.sh
EOF

# Enable and start services
print_status "Enabling and starting services..."
sudo systemctl daemon-reload
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl enable blockchain-notary

# Generate self-signed SSL certificate (for testing)
print_status "Generating self-signed SSL certificate for testing..."
sudo -u notary openssl req -x509 -newkey rsa:4096 -keyout $APP_DIR/ssl/key.pem -out $APP_DIR/ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Create startup script for blockchain node (if needed)
print_status "Creating blockchain node startup script..."
sudo -u notary tee $APP_DIR/scripts/start-blockchain.sh > /dev/null << 'EOF'
#!/bin/bash

# Start local blockchain node (Hardhat)
cd /opt/blockchain-notary/app
npm run node &

# Wait for node to start
sleep 5

# Deploy contracts
npm run deploy:localhost

echo "Blockchain node started and contracts deployed"
EOF

chmod +x $APP_DIR/scripts/start-blockchain.sh

# Set proper permissions
print_status "Setting proper permissions..."
sudo chown -R notary:notary $APP_DIR
sudo chmod -R 755 $APP_DIR
sudo chmod 600 $APP_DIR/config/.env.production
sudo chmod 600 $APP_DIR/ssl/key.pem

print_status "✅ RedHat deployment setup completed successfully!"
print_warning "⚠️  Next steps:"
echo "1. Edit /opt/blockchain-notary/config/.env.production with your configuration"
echo "2. Replace SSL certificates in /opt/blockchain-notary/ssl/ with real ones"
echo "3. Update domain name in /etc/nginx/conf.d/blockchain-notary.conf"
echo "4. Start the service: sudo systemctl start blockchain-notary"
echo "5. Check status: sudo systemctl status blockchain-notary"
echo "6. View logs: sudo journalctl -u blockchain-notary -f"
echo ""
print_status "🌐 Service will be available at:"
echo "- HTTP: http://your-domain.com"
echo "- HTTPS: https://your-domain.com"
echo "- Direct API: http://localhost:3000"
echo ""
print_status "📊 Monitoring:"
echo "- PM2 status: sudo -u notary pm2 status"
echo "- Logs: tail -f /opt/blockchain-notary/logs/*.log"
echo "- Nginx status: sudo systemctl status nginx" 