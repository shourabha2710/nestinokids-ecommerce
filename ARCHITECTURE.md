# NestinoKids - Technical Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CDN / Static Assets                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Nginx (Reverse Proxy / Load Balancer)          │
├─────────────────────────────────────────────────────────────┤
│  Frontend │ Admin │ API Gateway │ Static Files │ SSL/TLS    │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                     ↓
    ┌─────────┐      ┌──────────────────┐    ┌─────────────┐
    │ React   │      │  FastAPI Backend │    │  Nginx Logs │
    │Frontend │      │  ┌────────────┐  │    └─────────────┘
    └─────────┘      │  │ API Routes │  │
                     │  │ Auth       │  │
    ┌─────────┐      │  │ Products   │  │
    │ React   │      │  │ Orders     │  │
    │ Admin   │      │  │ Shopping   │  │
    └─────────┘      │  └────────────┘  │
                     │  ┌────────────┐  │
                     │  │SQLAlchemy  │  │
                     │  │ORM         │  │
                     │  └────────────┘  │
                     └──────────────────┘
                              ↓
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │ Redis   │          │PostgreSQL│          │ File    │
    │ Cache   │          │ Database │          │ Storage │
    │ Session │          │          │          │         │
    └─────────┘          └─────────┘          └─────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build**: Vite for fast bundling
- **Styling**: Tailwind CSS for utility-first design
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **HTTP Client**: Axios with interceptors
- **Animations**: Framer Motion
- **Forms**: React Hook Form
- **Data Fetching**: React Query

### Backend
- **Framework**: FastAPI (Python 3.11)
- **ORM**: SQLAlchemy 2.0
- **Database**: PostgreSQL 15
- **Authentication**: JWT (Python-Jose)
- **Password Hashing**: Bcrypt
- **Migration**: Alembic
- **Validation**: Pydantic v2
- **Server**: Uvicorn
- **Cache**: Redis

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx
- **SSL/TLS**: Let's Encrypt
- **CI/CD**: GitHub Actions
- **Monitoring**: (Prometheus/Grafana ready)

## Database Design

### Entity Relationship Diagram

```
┌─────────────┐
│   Users     │
├─────────────┤
│ id (PK)     │
│ email       │
│ password    │
│ role        │
│ is_active   │
└──────┬──────┘
       │ 1..* │
       │      │
       ├─────────────────────────┬─────────────────────────┐
       │                         │                         │
       ↓                         ↓                         ↓
    ┌──────────┐         ┌──────────────┐         ┌──────────────┐
    │ Addresses│         │ Orders       │         │ Reviews      │
    └──────────┘         └──────────────┘         └──────────────┘
                                │ 1..*
                                │
                                ↓
                        ┌──────────────┐
                        │ OrderItems   │
                        │ ├─product_id │
                        │ ├─quantity   │
                        │ ├─price      │
                        └──────────────┘
                                │
                                └─────────┬──────────┐
                                          │          │
                        ┌─────────────────┴┐    ┌────┴───────────┐
                        ↓                  ↓    ↓                │
                    ┌─────────┐      ┌──────────────┐      ┌──────────────┐
                    │ Products│      │ Variants     │      │ Inventory    │
                    ├─────────┤      ├──────────────┤      ├──────────────┤
                    │ id (PK) │      │ size         │      │ total_qty    │
                    │ name    │      │ color        │      │ available_qty│
                    │ price   │      │ price_mod    │      │ reserved_qty │
                    │ sku     │      └──────────────┘      └──────────────┘
                    └────┬────┘
                         │
                    ┌────┴─────────┐
                    │              │
                    ↓              ↓
            ┌──────────────┐  ┌──────────────┐
            │ProductImages │  │  Category    │
            └──────────────┘  └──────────────┘

┌──────────────┐         ┌──────────────┐
│  Coupons     │         │  Banners     │
├──────────────┤         ├──────────────┤
│ code         │         │ title        │
│ discount_pct │         │ image_url    │
│ min_order    │         │ button_link  │
│ max_usage    │         │ is_active    │
└──────────────┘         └──────────────┘
```

## API Architecture

### Request/Response Flow

```
Client Request
      ↓
   Router
      ↓
 Middleware (CORS, Auth, etc.)
      ↓
 Authentication Check (get_current_user)
      ↓
 Request Validation (Pydantic)
      ↓
 Business Logic (Services)
      ↓
 Database Query (SQLAlchemy)
      ↓
 Response Formatting
      ↓
Client Response
```

### API Versioning

- Current: v1 (`/api/v1`)
- Future versions can be deployed alongside v1
- Deprecation timeline: 6 months notice for major changes

## Authentication Flow

```
User Credentials
      ↓
   Register/Login
      ↓
 Hash Password (Bcrypt)
      ↓
 Create JWT Tokens
  ├─ Access Token (15 min)
  └─ Refresh Token (7 days)
      ↓
 Return to Client
      ↓
 Store in Local Storage
      ↓
 Include in API Requests
      ↓
 Validate on Server
      ↓
 Grant Access
```

## Data Security

### At Rest
- Database encryption
- Encrypted backups
- Secure key management

### In Transit
- HTTPS/TLS encryption
- Secure cookies (HttpOnly, SameSite)
- CORS validation

### Application
- Input validation & sanitization
- SQL injection prevention (ORM)
- XSS prevention (React escaping)
- CSRF token protection

## Scaling Strategy

### Current Setup
- Single server deployment
- Vertical scaling capabilities

### Production Setup
1. **Load Balancing**: Nginx or HAProxy
2. **API Servers**: Multiple FastAPI instances
3. **Database**: PostgreSQL replication
4. **Cache**: Redis cluster
5. **CDN**: CloudFlare or AWS CloudFront
6. **Storage**: S3 or equivalent

### Horizontal Scaling
```
         ┌─────────────────┐
         │   Load Balancer │
         └────────┬────────┘
                  │
         ┌────────┼────────┐
         ↓        ↓        ↓
    ┌────────┐┌────────┐┌────────┐
    │Backend1││Backend2││Backend3│
    └────┬───┘└────┬───┘└────┬───┘
         └─────────┼─────────┘
                   ↓
         ┌─────────────────┐
         │   PostgreSQL    │ (Primary)
         └─────────────────┘
                   │
         ┌─────────┴─────────┐
         ↓                   ↓
    (Read Replica)      (Read Replica)
```

## Performance Optimization

### Database
- Connection pooling
- Query indexing
- Query optimization
- Materialized views for reporting

### Caching
- Redis for session storage
- Redis for API responses
- Browser cache headers
- CDN caching

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Asset minification

### Backend
- Async processing (Celery)
- Database query caching
- Response compression (Gzip)
- Rate limiting

## Monitoring & Observability

```
┌──────────────────────────────────┐
│      Application Metrics          │
├──────────────────────────────────┤
│ • Request latency                │
│ • Error rates                    │
│ • User sessions                  │
│ • API response times             │
│ • Database queries               │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│    Prometheus + Grafana          │
├──────────────────────────────────┤
│ • Real-time dashboards           │
│ • Historical data                │
│ • Alerting rules                 │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│    AlertManager / PagerDuty       │
├──────────────────────────────────┤
│ • Escalation                     │
│ • On-call notifications          │
│ • Incident tracking              │
└──────────────────────────────────┘
```

## Disaster Recovery

### Backup Strategy
- Daily incremental backups
- Weekly full backups
- Monthly off-site backups
- RTO: 4 hours
- RPO: 1 hour

### High Availability
- Multi-zone deployment
- Database replication
- Automated failover
- Health checks every 30 seconds

## Development Workflow

```
Feature Branch → Pull Request → Code Review → Tests
                                   ↓
                            ✓ Approved → Merge to Main
                                   ↓
                         Build & Push Docker Image
                                   ↓
                              Deploy to Staging
                                   ↓
                          E2E Tests & QA
                                   ↓
                              Deploy to Production
```

## Deployment Environments

### Development
- Local Docker Compose setup
- SQLite optional for quick testing
- Debug mode enabled
- Sample data included

### Staging
- Same as production
- Staging database
- No real transactions
- Pre-deployment testing

### Production
- PostgreSQL primary + replicas
- Redis cluster
- CDN enabled
- SSL/TLS required
- Monitoring enabled
- Backups automated

---

For detailed API documentation, see [API.md](API.md)
For deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)
