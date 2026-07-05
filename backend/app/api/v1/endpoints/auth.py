import string
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.schemas import UserCreate, UserResponse, LoginRequest, TokenResponse, UserUpdate, RefreshTokenRequest
from app.models.models import User, RoleEnum, LoyaltyTransaction
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.constants import AuditAction, AuditEntityType
from app.services.audit_service import audit_service
from datetime import timedelta

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


def _generate_referral_code(db: Session) -> str:
    """Generate a unique 8-char referral code."""
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(secrets.choice(alphabet) for _ in range(8))
        if not db.query(User).filter(User.referral_code == code).first():
            return code


def _award_signup_bonus(user_id: int, db: Session):
    """Award 25 signup bonus points."""
    tx = LoyaltyTransaction(
        user_id=user_id,
        points=25,
        transaction_type="signup_bonus",
        description="Welcome! 25 signup bonus points credited.",
    )
    db.add(tx)


def _award_referral_bonus(referrer_id: int, db: Session):
    """Award 50 points to referrer when referred user signs up."""
    tx = LoyaltyTransaction(
        user_id=referrer_id,
        points=50,
        transaction_type="referral_bonus",
        description="Referral bonus: 50 points for referring a new user.",
    )
    db.add(tx)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    referred_by_user = None
    if user.referral_code:
        referred_by_user = db.query(User).filter(User.referral_code == user.referral_code).first()
        if not referred_by_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid referral code"
            )
    
    # Create new user
    db_user = User(
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        hashed_password=hash_password(user.password),
        referral_code=_generate_referral_code(db),
        referred_by=referred_by_user.id if referred_by_user else None,
    )
    db.add(db_user)
    db.flush()

    # Award signup bonus
    _award_signup_bonus(db_user.id, db)

    # Award referral bonus to referrer
    if referred_by_user:
        _award_referral_bonus(referred_by_user.id, db)

    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Login user and return tokens"""
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    if user.role == RoleEnum.ADMIN:
        audit_service.create_log(
            db=db,
            user=user,
            action=AuditAction.LOGIN,
            entity_type=AuditEntityType.USER,
            entity_id=user.id,
            description="Admin logged in",
            request=request,
        )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.from_orm(user)
    )


@router.post("/refresh")
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    from app.core.security import decode_token
    
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    """Dependency to get current logged-in user"""
    from app.core.security import decode_token
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    """Return the current user when a valid token is present, otherwise None."""
    from app.core.security import decode_token

    if not credentials:
        return None

    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None

    user_id = int(payload.get("sub"))
    return db.query(User).filter(User.id == user_id).first()


def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency: require admin or super admin role"""
    if current_user.role not in (RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_staff(current_user: User = Depends(get_current_user)):
    """Dependency: require admin, super admin, or moderator role"""
    if current_user.role not in (RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN, RoleEnum.MODERATOR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required"
        )
    return current_user


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user info"""
    update_data = user_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
