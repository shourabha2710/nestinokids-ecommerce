# NestinoKids E-Commerce Platform

Premium, mobile-first e-commerce platform for NestinoKids children's clothing brand.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Development Setup

1. **Clone the repository**
```bash
cd nestinokids-ecommerce
```

2. **Setup environment variables**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

3. **Start with Docker Compose**
```bash
docker-compose up -d
```

4. **Access the applications**
- Frontend: http://localhost:3000
- Admin Dashboard: http://localhost:3001
- API Docs: http://localhost:8000/docs
- Database: localhost:5432

### Manual Setup

**Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

**Admin Setup:**
```bash
cd admin
npm install
npm run dev
```

## 📁 Project Structure

```
nestinokids-ecommerce/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/               # API Endpoints
│   │   ├── models/            # Database Models
│   │   ├── schemas/           # Pydantic Schemas
│   │   ├── core/              # Configuration & Security
│   │   ├── db/                # Database Setup
│   │   ├── services/          # Business Logic
│   │   ├── middleware/        # Custom Middleware
│   │   └── utils/             # Utility Functions
│   ├── migrations/            # Alembic Migrations
│   ├── requirements.txt       # Python Dependencies
│   └── .env.example          # Environment Template
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/        # React Components
│   │   ├── pages/             # Page Components
│   │   ├── store/             # Redux Store
│   │   ├── api/               # API Clients
│   │   ├── hooks/             # Custom Hooks
│   │   ├── utils/             # Utilities
│   │   └── styles/            # Global Styles
│   ├── package.json           # Node Dependencies
│   └── vite.config.js         # Vite Configuration
├── admin/                      # Admin Dashboard
│   └── (Similar structure to frontend)
├── docker-compose.yml         # Docker Compose Configuration
├── Dockerfile.backend         # Backend Docker Image
├── Dockerfile.frontend        # Frontend Docker Image
└── README.md                  # This file
```

## 🗄️ Database Schema

### Core Tables
- **users** - User accounts and profiles
- **categories** - Product categories (supports hierarchy)
- **products** - Product catalog
- **product_images** - Multiple images per product
- **product_variants** - Size/color variants
- **inventory** - Stock management
- **orders** - Customer orders
- **order_items** - Items in orders
- **reviews** - Product reviews
- **addresses** - Customer addresses
- **coupons** - Discount coupons
- **banners** - Marketing banners
- **wishlist** - User wishlist (Many-to-Many)
- **cart** - Shopping cart (Many-to-Many)

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### Products
- `GET /api/v1/products` - List products
- `GET /api/v1/products/{slug}` - Get product details
- `GET /api/v1/categories` - List categories
- `GET /api/v1/search` - Search products

### Shopping
- `GET /api/v1/cart` - Get cart items
- `POST /api/v1/cart/{product_id}` - Add to cart
- `DELETE /api/v1/cart/{product_id}` - Remove from cart
- `GET /api/v1/wishlist` - Get wishlist
- `POST /api/v1/wishlist/{product_id}` - Add to wishlist
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - Get user orders

## 🎨 Design System

### Color Palette
- **Primary Gold**: #D4AF37 (Luxury & Premium)
- **Secondary Ivory**: #FFFDF8 (Soft & Warm)
- **Accent Blush**: #F8E8E8 (Gentle & Playful)
- **Text Dark**: #2D2D2D (High Contrast)
- **Background**: #FFFFFF (Clean & Clear)

### Typography
- Font Family: Poppins
- Weights: 300, 400, 500, 600, 700, 800

### Components
- Header with sticky navigation
- Product cards with zoom and hover effects
- Shopping cart with real-time updates
- Checkout flow with address management
- Product reviews and ratings
- Wishlist functionality
- Order tracking

## 🔐 Security Features

- JWT authentication with access & refresh tokens
- Password hashing with bcrypt
- CORS protection
- CSRF token support
- Rate limiting
- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy ORM
- Secure headers middleware

## 📊 Admin Dashboard

### Features
- **Dashboard** - Key metrics and charts
- **Product Management** - Add/Edit/Delete products with bulk operations
- **Category Management** - Organize product categories
- **Order Management** - Track orders with status updates
- **Customer Management** - View customer details and history
- **Coupon Management** - Create and track coupons
- **Banner Management** - Marketing banners
- **Inventory Management** - Stock tracking
- **Analytics** - Sales reports and insights

## 🚢 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Kubernetes (Optional)
```bash
kubectl apply -f k8s/
```

### Environment Variables

**Backend:**
```
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=your-secret-key
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=http://localhost:3000
```

## 🧪 Testing

**Backend Tests:**
```bash
cd backend
pytest
pytest --cov=app tests/
```

**Frontend Tests:**
```bash
cd frontend
npm test
npm run test:coverage
```

## 🔄 CI/CD Pipeline

- GitHub Actions for automated testing
- Docker image building and pushing
- Automated deployment to production
- Health checks after deployment

## 📈 Performance

- Lighthouse Score: 95+
- Lazy loading for images
- Code splitting with dynamic imports
- Database query optimization
- Redis caching ready
- CDN ready architecture
- Gzip compression enabled

## 🌐 SEO

- Dynamic meta tags
- sitemap.xml generation
- robots.txt configuration
- Schema markup (JSON-LD)
- Open Graph tags
- SEO-friendly URLs
- Canonical tags

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## 📝 License

© 2024 NestinoKids Enterprises. All rights reserved.

## 📞 Support

- Email: support@nestinokids.com
- Phone: 9015957377
- Address: F-3/339 Street No. Sangam Vihar, New Delhi 110080

## 🎯 Future Enhancements

- Mobile app (React Native)
- AI-powered recommendations
- Live chat support
- Subscription boxes
- Gamification (loyalty points)
- Social commerce integration
- AR product try-on
- Voice search
- Progressive Web App (PWA)
- Multi-language support
- Multi-currency support

---

**Made with ❤️ for happy kids - NestinoKids Team**
