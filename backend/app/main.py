import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.config import settings
from app.api.v1.endpoints import auth, products, shopping, admin
from app.db.database import Base, engine

# Create tables
Base.metadata.create_all(bind=engine)

# Create upload directories
upload_path = Path(settings.UPLOAD_DIR) / "products"
upload_path.mkdir(parents=True, exist_ok=True)

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=settings.DEBUG)
