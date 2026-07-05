import logging
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, String
from app.models.models import Product, Order, OrderItem, User, SupportTicket, RoleEnum
from app.schemas.schemas import GlobalSearchResult

logger = logging.getLogger(__name__)


class SearchService:

    def _normalize_query(self, query: str) -> str | None:
        query = query.strip()
        if not query:
            return None
        return query

    # TODO: Replace stub with Redis cache in production
    def _get_cached_results(self, key: str):
        return None

    # TODO: Replace stub with Redis cache in production
    def _set_cached_results(self, key: str, value):
        pass

    # TODO: Implement search analytics persistence
    def track_search(self, query: str, total_results: int):
        pass

    def search_all(
        self, db: Session, query: str, limit: int = 5
    ) -> dict[str, list[GlobalSearchResult]]:
        normalized = self._normalize_query(query)
        if normalized is None:
            return {k: [] for k in ("products", "orders", "customers", "support")}
        pattern = f"%{normalized}%"
        return {
            "products": self._safe_search(self._search_products, db, pattern, limit),
            "orders": self._safe_search(self._search_orders, db, pattern, limit),
            "customers": self._safe_search(self._search_customers, db, pattern, limit),
            "support": self._safe_search(self._search_support_tickets, db, pattern, limit),
        }

    def _safe_search(self, search_fn, db, pattern, limit):
        try:
            return search_fn(db, pattern, limit)
        except Exception as exc:
            logger.exception("Global search category failed: %s", exc)
            return []

    def _search_products(
        self, db: Session, pattern: str, limit: int
    ) -> list[GlobalSearchResult]:
        rows = (
            db.query(Product)
            .filter(
                Product.is_active == True,
                (Product.name.ilike(pattern))
                | (Product.sku.ilike(pattern))
                | (Product.slug.ilike(pattern)),
            )
            .limit(limit)
            .all()
        )
        return [
            GlobalSearchResult(
                type="product",
                id=p.id,
                title=p.name,
                subtitle=f"SKU: {p.sku}",
                url=f"/products/{p.id}/edit",
            )
            for p in rows
        ]

    def _search_orders(
        self, db: Session, pattern: str, limit: int
    ) -> list[GlobalSearchResult]:
        rows = (
            db.query(Order)
            .filter(
                (Order.order_number.ilike(pattern))
                | (Order.user.has(User.email.ilike(pattern)))
            )
            .limit(limit)
            .all()
        )
        return [
            GlobalSearchResult(
                type="order",
                id=o.id,
                title=f"Order #{o.order_number}",
                subtitle=f"Total: ${o.final_amount:.2f}" if o.final_amount else "",
                url="/orders",
            )
            for o in rows
        ]

    def _search_customers(
        self, db: Session, pattern: str, limit: int
    ) -> list[GlobalSearchResult]:
        rows = (
            db.query(User)
            .filter(
                User.role != RoleEnum.ADMIN,
                (User.first_name.ilike(pattern))
                | (User.last_name.ilike(pattern))
                | (User.email.ilike(pattern)),
            )
            .limit(limit)
            .all()
        )
        return [
            GlobalSearchResult(
                type="customer",
                id=u.id,
                title=f"{u.first_name} {u.last_name}",
                subtitle=u.email,
                url=f"/orders",
            )
            for u in rows
        ]

    def _search_support_tickets(
        self, db: Session, pattern: str, limit: int
    ) -> list[GlobalSearchResult]:
        rows = (
            db.query(SupportTicket)
            .filter(
                (cast(SupportTicket.id, String).ilike(pattern))
                | (SupportTicket.subject.ilike(pattern))
            )
            .limit(limit)
            .all()
        )
        results = []
        for t in rows:
            status_tag = f"[{t.status}]" if t.status else ""
            results.append(
                GlobalSearchResult(
                    type="support",
                    id=t.id,
                    title=f"Ticket #{t.id}",
                    subtitle=f"{status_tag} {t.subject}".strip(),
                    url="/support-tickets",
                )
            )
        return results


search_service = SearchService()
