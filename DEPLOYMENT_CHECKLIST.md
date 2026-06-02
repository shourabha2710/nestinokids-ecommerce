# Pre-Deployment & Post-Deployment Checklist

## 🔍 Pre-Deployment Checklist

### Backend Configuration
- [ ] `backend/.env` created and configured
- [ ] Database credentials updated
- [ ] SECRET_KEY set to random 32+ character string
- [ ] RAZORPAY_KEY_ID and SECRET configured
- [ ] Email SMTP settings configured
- [ ] ALLOWED_ORIGINS updated for frontend/admin URLs
- [ ] DEBUG set to False for production
- [ ] Redis connection tested

### Frontend Configuration
- [ ] `frontend/.env.production` created
- [ ] REACT_APP_API_URL set to production API URL
- [ ] Build successful: `npm run build`
- [ ] No console errors or warnings
- [ ] dist/ directory created

### Admin Configuration
- [ ] Admin .env configured
- [ ] Build successful: `npm run build`
- [ ] Admin dist/ directory created

### Database
- [ ] PostgreSQL database created
- [ ] Migrations run successfully
- [ ] Initial seed data loaded
- [ ] Backups configured and tested
- [ ] Replication setup (if production)

### Docker
- [ ] Docker images build successfully
- [ ] docker-compose.yml configured
- [ ] All services health checks pass
- [ ] Volume mounts verified
- [ ] Port mappings correct

### Security
- [ ] SSL/TLS certificates obtained
- [ ] Nginx configured with SSL
- [ ] Security headers added
- [ ] CORS properly configured
- [ ] Rate limiting configured
- [ ] WAF rules reviewed (if applicable)
- [ ] Database password strong
- [ ] API keys stored securely
- [ ] Secrets not in version control

### Testing
- [ ] API endpoints tested
- [ ] Frontend pages tested
- [ ] Admin dashboard tested
- [ ] Authentication flow tested
- [ ] Payment flow tested (with test cards)
- [ ] Order creation tested
- [ ] Search functionality tested
- [ ] Mobile responsiveness checked

### Performance
- [ ] Database indexes created
- [ ] Query performance optimized
- [ ] Cache configuration tested
- [ ] Asset compression enabled
- [ ] CDN configured (if applicable)
- [ ] Load tested for expected traffic

### Monitoring & Logging
- [ ] Logging configured
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Performance monitoring setup
- [ ] Health check endpoints working
- [ ] Alert rules configured

### Documentation
- [ ] README.md updated with production URLs
- [ ] API documentation complete
- [ ] Deployment guide finalized
- [ ] Runbook created
- [ ] Team trained

---

## 🚀 Deployment Steps

### 1. Server Setup
```bash
# Update packages
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

### 2. Clone & Setup
```bash
cd /opt
git clone https://github.com/yourusername/nestinokids-ecommerce.git
cd nestinokids-ecommerce
```

### 3. Configure Environment
```bash
cp backend/.env.example backend/.env
nano backend/.env
# Update with production values
```

### 4. SSL Certificate
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

### 5. Build & Deploy
```bash
docker-compose build
docker-compose up -d
docker-compose exec backend alembic upgrade head
```

### 6. Verify Deployment
```bash
docker-compose ps
curl http://localhost:8000/health
curl http://localhost:3000
```

---

## ✅ Post-Deployment Checklist

### Immediate Post-Deployment (First Hour)

**Monitoring**:
- [ ] Check all services are running: `docker-compose ps`
- [ ] Monitor logs: `docker-compose logs -f`
- [ ] Verify health endpoints: `curl /health`
- [ ] Check CPU and memory usage
- [ ] Verify disk space
- [ ] Monitor network traffic

**Functionality Tests**:
- [ ] Visit website: `https://yourdomain.com`
- [ ] Test user registration
- [ ] Test user login
- [ ] Browse products
- [ ] Add to cart
- [ ] Create order (with test payment)
- [ ] Check admin dashboard
- [ ] Verify email notifications (if configured)

**Database**:
- [ ] Verify database connection
- [ ] Check database size
- [ ] Verify backups are running
- [ ] Check replication lag (if replicated)

**API**:
- [ ] Test key API endpoints
- [ ] Check response times
- [ ] Monitor error rates
- [ ] Verify CORS headers

### Daily Post-Deployment (First Week)

**Monitoring**:
- [ ] Review error logs daily
- [ ] Monitor performance metrics
- [ ] Check for warnings in logs
- [ ] Review failed transactions

**User Experience**:
- [ ] Monitor user feedback
- [ ] Check conversion rates
- [ ] Monitor page load times
- [ ] Test on various devices

**Security**:
- [ ] Review access logs
- [ ] Check for unauthorized attempts
- [ ] Monitor for DDoS attacks
- [ ] Verify SSL certificate validity

**Operations**:
- [ ] Verify backup completion
- [ ] Test backup restoration
- [ ] Monitor database queries
- [ ] Check resource utilization

### Weekly Post-Deployment

**Performance**:
- [ ] Generate performance reports
- [ ] Review slow query logs
- [ ] Analyze cache hit rates
- [ ] Check CDN performance

**Security**:
- [ ] Review security logs
- [ ] Update security patches
- [ ] Rotate API keys if needed
- [ ] Verify firewall rules

**Maintenance**:
- [ ] Clean up logs
- [ ] Archive old data
- [ ] Review database health
- [ ] Check disk space

**Analytics**:
- [ ] Review sales metrics
- [ ] Analyze user behavior
- [ ] Check conversion funnel
- [ ] Monitor customer satisfaction

### Monthly Post-Deployment

**Optimization**:
- [ ] Review performance data
- [ ] Optimize slow queries
- [ ] Update caching strategies
- [ ] Review and update dependencies

**Security**:
- [ ] Security audit
- [ ] Penetration testing
- [ ] Review access controls
- [ ] Update security policies

**Scaling**:
- [ ] Analyze growth trends
- [ ] Plan for scaling
- [ ] Review infrastructure capacity
- [ ] Plan improvements

**Business Metrics**:
- [ ] Sales performance
- [ ] Customer satisfaction
- [ ] User engagement
- [ ] Churn rate analysis

---

## 🚨 Incident Response

### Issue: Services Not Starting
```bash
# Check logs
docker-compose logs backend
docker-compose logs postgres

# Check Docker daemon
sudo systemctl restart docker

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Issue: Database Connection Error
```bash
# Check PostgreSQL
docker-compose logs postgres

# Verify credentials in .env
grep DATABASE_URL backend/.env

# Restart database
docker-compose restart postgres
```

### Issue: High CPU Usage
```bash
# Check running processes
docker stats

# Check for queries
docker-compose exec postgres psql -U nestinokids_user -d nestinokids_db
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

# Optimize queries or add indexes
```

### Issue: Disk Space Full
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a

# Clear logs
truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

### Issue: Memory Leak
```bash
# Monitor memory
docker stats --no-stream

# Restart affected service
docker-compose restart backend

# Check for memory issues in logs
docker-compose logs backend | grep -i memory
```

---

## 🔄 Rollback Procedure

### Rollback to Previous Version
```bash
# Stop services
docker-compose down

# Restore from backup
docker-compose exec -T postgres psql -U nestinokids_user < db_backup.sql

# Checkout previous version
git checkout <previous-tag>

# Rebuild and start
docker-compose build
docker-compose up -d

# Verify
curl http://localhost:8000/health
```

---

## 📊 Key Metrics to Monitor

### Application Metrics
- [ ] Response time (< 500ms target)
- [ ] Error rate (< 0.1% target)
- [ ] Uptime (> 99.9% target)
- [ ] Active users
- [ ] Requests per second

### Business Metrics
- [ ] Total revenue
- [ ] Order count
- [ ] Average order value
- [ ] Conversion rate
- [ ] Customer satisfaction

### Infrastructure Metrics
- [ ] CPU usage (< 80% target)
- [ ] Memory usage (< 80% target)
- [ ] Disk usage (< 90% target)
- [ ] Network bandwidth
- [ ] Database connections

### Security Metrics
- [ ] Failed login attempts
- [ ] SQL injection attempts
- [ ] DDoS attacks
- [ ] SSL certificate expiry

---

## 📞 Escalation Contacts

| Issue | Contact | Priority |
|-------|---------|----------|
| Critical outage | Team Lead | P0 |
| Payment issues | Razorpay Support | P0 |
| Database issues | DBA on-call | P1 |
| Security breach | Security Team | P0 |
| Performance | DevOps Team | P2 |
| Minor bugs | Development Team | P3 |

---

## 📝 Documentation Updates

Post-deployment, update:
- [ ] Runbook with real URLs
- [ ] Admin guide with actual access
- [ ] Troubleshooting guide with real errors
- [ ] Performance baseline documentation
- [ ] Security policies documentation
- [ ] Disaster recovery procedures
- [ ] Team contact information

---

**Remember**: Keep this checklist updated as you discover new issues or improvements!

Last Updated: 2024-01-15
Version: 1.0
