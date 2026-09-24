"""Pure GST / tax calculation core (G4.2).

Treats every customer-facing price as GST-INCLUSIVE. The tax is always
*embedded* in the price the customer sees: line prices, the coupon/promotion/
loyalty discounts and the shipping charge are all inclusive consideration.
The engine extracts the taxable value out of an inclusive amount rather than
appending tax on top.

Money rules (locked):
  - ``Decimal`` end-to-end inside this module, rounded to ``0.01`` with
    ``ROUND_HALF_UP``;
  - tax rates are expressed in percent (``18.0`` == 18%);
  - ``INTRA_STATE`` splits the embedded tax equally into CGST + SGST;
    ``INTER_STATE`` reports the full embedded tax as IGST.

This module is intentionally pure: it imports nothing from FastAPI or
SQLAlchemy so the arithmetic is trivially unit-testable and dead simple to
reason about. Configuration/validation errors surface as ``GstConfigError``;
the caller decides whether to fail loudly (order finalization) or degrade to a
warning (cart preview).
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional

MONEY_QUANT = Decimal("0.01")
HUNDRED = Decimal("100")

# Tax type identifiers stored on orders / order items.
TAX_TYPE_NONE = "none"
TAX_TYPE_INTRA_STATE = "INTRA_STATE"
TAX_TYPE_INTER_STATE = "INTER_STATE"


class GstConfigError(ValueError):
    """Raised when GST is enabled but required configuration is missing.

    ``code`` carries a stable machine-readable identifier so the API layer can
    produce structured 400 responses (e.g. ``{"code": ..., "message": ...}``).
    """

    def __init__(self, message: str, code: str = "TAX_CONFIG_ERROR") -> None:
        super().__init__(message)
        self.code = code


def to_decimal(value) -> Decimal:
    """Convert any scalar to a Decimal via its string form (no binary drift)."""
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def money(value) -> Decimal:
    """Round to 2 decimal places using ROUND_HALF_UP."""
    return to_decimal(value).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def normalize_state(state: Optional[str]) -> str:
    """Normalize an Indian state name for comparison (case/whitespace only)."""
    if not state:
        return ""
    return str(state).strip().upper()


def resolve_tax_type(
    seller_state: Optional[str], place_of_supply: Optional[str]
) -> str:
    """INTRA_STATE when the place of supply is known and matches the seller's
    registered state; INTER_STATE otherwise. When the place of supply is not
    known (e.g. cart preview before an address is picked) the conservatively
    identical outcome is INTRA_STATE — the *amount* of embedded tax is
    identical either way; only the CGST/SGST vs IGST split label changes."""
    if not seller_state or not place_of_supply:
        return TAX_TYPE_INTRA_STATE
    if normalize_state(seller_state) == normalize_state(place_of_supply):
        return TAX_TYPE_INTRA_STATE
    return TAX_TYPE_INTER_STATE


def extract_inclusive_tax(
    inclusive_amount, tax_rate
) -> tuple[Decimal, Decimal]:
    """Split a GST-inclusive amount into (taxable_value, embedded_tax).

    ``tax_rate`` is a percent (``18.0`` == 18%). For non-positive rates the
    whole amount is taxable and no tax is embedded.
    """
    inclusive = to_decimal(inclusive_amount)
    rate = to_decimal(tax_rate)
    if rate <= 0:
        return money(inclusive), Decimal("0")
    denominator = Decimal("1") + rate / HUNDRED
    taxable = money(inclusive / denominator)
    total_tax = money(inclusive - taxable)
    return taxable, total_tax


def split_tax(total_tax, tax_type: str) -> tuple[Decimal, Decimal, Decimal]:
    """Split embedded tax into (cgst, sgst, igst)."""
    total = to_decimal(total_tax)
    if tax_type == TAX_TYPE_INTER_STATE:
        return Decimal("0"), Decimal("0"), money(total)
    cgst = money(total / Decimal("2"))
    sgst = money(total - cgst)
    return cgst, sgst, Decimal("0")


def allocate_discounts(
    line_totals: list, total_discount
) -> List[float]:
    """Deterministically allocate a discount across cart lines.

    Produces per-line discounts whose EXACT sum equals ``total_discount``
    (to the paisa), so ``sum(line_total_i - allocated_i)`` is exactly the
    discounted subtotal with no residual rounding gap. Uses a largest-
    remainder allocation on integer paisa, ties broken by input order for
    full determinism. A line never receives more discount than its own total,
    so discounted consideration is never negative.
    """
    n = len(line_totals)
    if n == 0:
        return []

    totals_p = [int(money(t) * HUNDRED) for t in line_totals]
    grand_p = sum(totals_p)
    discount_p = int(money(total_discount) * HUNDRED)

    if grand_p <= 0 or discount_p <= 0:
        return [0.0] * n

    discount_p = min(discount_p, grand_p)

    base = [totals_p[i] * discount_p // grand_p for i in range(n)]
    remainder = [
        totals_p[i] * discount_p - base[i] * grand_p for i in range(n)
    ]
    leftover = discount_p - sum(base)

    for idx in sorted(range(n), key=lambda i: (-remainder[i], i)):
        if leftover <= 0:
            break
        if base[idx] < totals_p[idx]:
            base[idx] += 1
            leftover -= 1

    return [base[i] / 100.0 for i in range(n)]


def compute_line_tax(
    inclusive_amount, tax_rate, tax_type: str
) -> dict:
    """Compute the per-line tax snapshot for one (discounted) consideration."""
    taxable, total_tax = extract_inclusive_tax(inclusive_amount, tax_rate)
    cgst, sgst, igst = split_tax(total_tax, tax_type)
    return {
        "taxable_value": taxable,
        "cgst_amount": cgst,
        "sgst_amount": sgst,
        "igst_amount": igst,
        "total_tax": total_tax,
    }


def compute_shipping_tax(
    shipping_amount, tax_type: str, shipping_gst_rate
) -> dict:
    """Compute the embedded tax on a shipping charge.

    The shipping charge is itself inclusive consideration charged to the
    customer; its GST is extracted at ``shipping_gst_rate`` percent. A zero
    shipping charge (or free-shipping promotion) carries no tax. A missing
    ``shipping_gst_rate`` when tax is enabled and shipping is charged raises
    ``GstConfigError`` (the caller routes this to 400 at finalization).
    """
    shipping = to_decimal(shipping_amount)
    if shipping <= 0:
        return {
            "taxable_value": Decimal("0"),
            "cgst_amount": Decimal("0"),
            "sgst_amount": Decimal("0"),
            "igst_amount": Decimal("0"),
            "total_tax": Decimal("0"),
        }
    if shipping_gst_rate is None:
        raise GstConfigError(
            "Shipping GST rate is not configured for this store",
            code="SHIPPING_GST_RATE_MISSING",
        )
    taxable, total_tax = extract_inclusive_tax(shipping, shipping_gst_rate)
    cgst, sgst, igst = split_tax(total_tax, tax_type)
    return {
        "taxable_value": taxable,
        "cgst_amount": cgst,
        "sgst_amount": sgst,
        "igst_amount": igst,
        "total_tax": total_tax,
    }