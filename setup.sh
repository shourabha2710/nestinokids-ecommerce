#!/bin/bash

# NestinoKids Setup Script

set -e

echo "🚀 Setting up NestinoKids E-Commerce Platform..."

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo -e "${BLUE}Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

# Check Docker Compose
echo -e "${BLUE}Checking Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is installed${NC}"

# Create .env files
echo -e "${BLUE}Setting up environment files...${NC}"

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✓ Created backend/.env${NC}"
else
    echo -e "${YELLOW}⚠ backend/.env already exists${NC}"
fi

# Start services
echo -e "${BLUE}Starting Docker services...${NC}"
docker-compose up -d

echo ""
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo ""
echo "📍 Access your services at:"
echo "   Frontend:  ${BLUE}http://localhost:3000${NC}"
echo "   Admin:     ${BLUE}http://localhost:3001${NC}"
echo "   API Docs:  ${BLUE}http://localhost:8000/docs${NC}"
echo ""
echo "🗄️  Database:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   User: nestinokids_user"
echo "   Password: password"
echo "   Database: nestinokids_db"
echo ""
echo "Redis:"
echo "   Host: localhost"
echo "   Port: 6379"
echo ""
echo "📝 Next steps:"
echo "   1. Update backend/.env with your configuration"
echo "   2. Set up initial categories and products"
echo "   3. Configure payment gateway (Razorpay)"
echo ""
echo "🛑 To stop services:"
echo "   ${BLUE}docker-compose down${NC}"
echo ""
echo "📚 Documentation: See README.md"
echo ""
