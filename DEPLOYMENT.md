# NestinoKids - Production Deployment Guide

## Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database backups taken
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] Monitoring setup
- [ ] Logging configured
- [ ] CDN configured
- [ ] Email service configured

## Deployment Steps

### 1. Server Preparation

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Clone Repository

```bash
cd /opt
git clone https://github.com/yourusername/nestinokids-ecommerce.git
cd nestinokids-ecommerce
```

### 3. Configure Environment

```bash
# Copy and edit environment file
cp backend/.env.example backend/.env
nano backend/.env

# Update with production values:
# - Database URL
# - Secret key (strong random string)
# - Razorpay credentials
# - Email configuration
# - Domain URLs
```

### 4. Set Up SSL Certificate

```bash
# Using Let's Encrypt with Certbot
sudo apt-get install certbot python3-certbot-nginx -y
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

### 5. Update Nginx Configuration

Edit nginx.conf with:
- SSL certificate paths
- Domain names
- Cache headers
- Security headers

### 6. Start Services

```bash
# Build and start
docker-compose -f docker-compose.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### 7. Database Setup

```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Create initial data (optional)
docker-compose exec backend python -m scripts.seed_data
```

### 8. Setup Monitoring

```bash
# Install monitoring tools
# Consider: Prometheus, Grafana, ELK Stack

# Configure alerts for:
# - CPU usage
# - Memory usage
# - Disk space
# - API response time
# - Database connections
```

### 9. Setup Backups

```bash
# Create backup script
cat > /opt/nestinokids-ecommerce/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/nestinokids"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker-compose exec -T postgres pg_dump -U nestinokids_user nestinokids_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Application data backup
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /opt/nestinokids-ecommerce

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

chmod +x /opt/nestinokids-ecommerce/backup.sh

# Schedule backups (daily at 2 AM)
echo "0 2 * * * /opt/nestinokids-ecommerce/backup.sh" | sudo crontab -
```

## Performance Optimization

### Database Optimization
```sql
-- Create indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Analyze tables
ANALYZE;
```

### Caching Strategy
- Redis for session storage
- Redis for API response caching
- CDN for static assets
- Browser caching headers

### Database Connection Pooling
Configure SQLAlchemy with:
```python
pool_size=20
max_overflow=40
pool_pre_ping=True
```

## Scaling Strategy

### Horizontal Scaling
1. Use AWS ECS/EKS or similar
2. Auto-scaling groups
3. Load balancer (Nginx/HAProxy)
4. Multiple backend instances

### Vertical Scaling
1. Increase server resources
2. Database optimization
3. Query caching

## Security Hardening

```bash
# Update security headers in nginx.conf
add_header Strict-Transport-Security "max-age=31536000" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;

# Setup WAF (Web Application Firewall)
# Consider: ModSecurity, AWS WAF, Cloudflare

# Setup DDoS protection
# Consider: Cloudflare, AWS Shield

# Enable firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Health Checks

```bash
# Endpoint monitoring
curl -f http://localhost:8000/health

# Database check
docker-compose exec postgres pg_isready -U nestinokids_user

# Redis check
docker-compose exec redis redis-cli ping
```

## Rollback Procedure

```bash
# If deployment fails:
docker-compose down
git checkout previous-tag
docker-compose up -d

# Restore database from backup
docker-compose exec -T postgres psql -U nestinokids_user < db_backup.sql
```

## Monitoring Metrics

Track these metrics:
- API response time
- Error rate
- CPU/Memory usage
- Database query time
- Cache hit rate
- Active user sessions
- Revenue metrics
- Conversion rates

## Log Aggregation

Setup centralized logging:
```bash
# Using ELK Stack
# Configure log shipping from containers to ELK
```

## Regular Maintenance

- Weekly database optimization
- Monthly security updates
- Quarterly performance review
- Annual architecture review

## Incident Response

1. Alert received
2. Investigation
3. Mitigation
4. Fix deployment
5. Verification
6. Documentation

## Contact

Production Support:
- Email: devops@nestinokids.com
- On-call: +91-9015957377
- Slack Channel: #production-alerts

---

For more details, see the main README.md
