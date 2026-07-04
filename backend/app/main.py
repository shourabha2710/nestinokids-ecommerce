import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.config import settings
from app.api.v1.endpoints import auth, products, shopping, admin
from app.api.v1.endpoints import search as search_router
from app.api.v1.endpoints import reviews as reviews_router
from app.api.v1.endpoints import settings as site_settings_router
from app.api.v1.endpoints import hero as hero_router
from app.api.v1.endpoints import coupons as coupons_router
from app.api.v1.endpoints import engagement as engagement_router
from app.api.v1.endpoints import support as support_router
from app.api.v1.endpoints import notifications as notifications_router
from app.db.database import Base, engine

# Create tables in development only; production relies on Alembic migrations
if settings.DEBUG:
    Base.metadata.create_all(bind=engine)

# Create upload directories
upload_path = Path(settings.UPLOAD_DIR) / "products"
upload_path.mkdir(parents=True, exist_ok=True)
hero_upload_path = Path(settings.UPLOAD_DIR) / "hero"
hero_upload_path.mkdir(parents=True, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-ready e-commerce API for NestinoKids"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZIP Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(shopping.router)
app.include_router(admin.router)
app.include_router(site_settings_router.router)
app.include_router(reviews_router.router)
app.include_router(hero_router.router)
app.include_router(coupons_router.router)
app.include_router(engagement_router.router)
app.include_router(support_router.router)
app.include_router(notifications_router.router)
app.include_router(search_router.router)

# Serve uploaded files
app.mount(f"/{settings.UPLOAD_DIR}", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Health check endpoint
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "app": settings.APP_NAME
    }


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.on_event("startup")
def create_default_settings():
    """Auto-create default site settings on startup if none exist."""
    from app.db.database import SessionLocal
    from app.models.models import SiteSettings
    db = SessionLocal()
    try:
        if not db.query(SiteSettings).first():
            db.add(SiteSettings())
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=settings.DEBUG)
