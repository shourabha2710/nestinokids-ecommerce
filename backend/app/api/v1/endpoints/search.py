from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.schemas import GlobalSearchResponse
from app.services.search_service import search_service
from app.api.v1.endpoints.auth import require_admin
from app.models.models import User

router = APIRouter(prefix="/api/v1/admin", tags=["admin-search"])


@router.get("/search", response_model=GlobalSearchResponse)
def global_search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(5, ge=1, le=50, description="Results per category"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    results = search_service.search_all(db, q.strip(), limit)
    total_results = sum(len(v) for v in results.values())
    search_service.track_search(q.strip(), total_results)
    return GlobalSearchResponse(query=q.strip(), results=results, total_results=total_results)
