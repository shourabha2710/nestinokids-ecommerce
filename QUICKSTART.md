# Quick Start Guide

## 🚀 Getting Started with NestinoKids

### Prerequisites
- Docker & Docker Compose installed
- OR Python 3.11+ and Node.js 18+

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
cd nestinokids-ecommerce

# Make setup script executable (Linux/Mac)
chmod +x setup.sh

# Run setup script
./setup.sh

# Or manually start services
docker-compose up -d
```

Access:
- **Frontend**: http://localhost:3000
- **Admin**: http://localhost:3001
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Option 2: Manual Setup

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run migrations (if using Alembic)
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Admin Setup
```bash
cd admin

# Install dependencies
npm install

# Start development server
npm run dev
```

### Default Credentials

**Database:**
- Host: localhost:5432
- User: nestinokids_user
- Password: password
- Database: nestinokids_db

**Redis:**
- Host: localhost:6379

### First Steps

1. **Register a user account**
   - Go to http://localhost:3000/register
   - Fill in the details and create account

2. **Login**
   - Use your credentials to login

3. **Browse products**
   - Visit home page to see products
   - Add items to cart
   - Proceed to checkout

4. **Access Admin**
   - Go to http://localhost:3001
   - Login with admin credentials

### Development Commands

**Backend:**
```bash
# Run tests
pytest

# Check code quality
pylint app/

# Format code
black app/
```

**Frontend:**
```bash
# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Common Issues

**Port Already in Use:**
```bash
# Kill process using port
# Linux/Mac
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Database Connection Error:**
```bash
# Check if PostgreSQL is running
docker-compose logs postgres

# Restart services
docker-compose restart
```

**Module Not Found:**
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Project Structure Overview

```
nestinokids-ecommerce/
├── backend/          # FastAPI REST API
├── frontend/         # React web app
├── admin/            # Admin dashboard
├── docker-compose.yml
└── README.md
```

### Next Steps

1. **Customize branding** - Update colors, logo in settings
2. **Add products** - Use admin panel to add your products
3. **Configure payment** - Set up Razorpay in production
4. **Deploy** - See DEPLOYMENT.md for production deployment

### Support

- **Documentation**: See README.md
- **API Docs**: http://localhost:8000/docs
- **Issues**: Create an issue on GitHub
- **Contact**: support@nestinokids.com

### Useful Commands

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Restart services
docker-compose restart

# Clean up everything
docker-compose down -v
```

---

**Happy Coding! 🚀**
