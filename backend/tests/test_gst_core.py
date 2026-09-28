"""G4.2 - pure GST core unit tests (``app.services.gst_service``).

Covers the money semantics of the GST-inclusive tax engine without any
database or HTTP involvement:

  - HALF_UP paisa rounding;
  - inclusive-tax extraction (taxable value + embedded tax);
  - CGST/SGST/IGST splitting for intra/inter-state supply;
  - deterministic paisa-exact discount allocation across lines;
  - per-line and per-shipping tax computation, including the
    ``SHIPPING_GST_RATE_MISSING`` configuration error.
"""
from decimal import Decimal

import pytest

from app.services.gst_service import (
    GstConfigError,
    TAX_TYPE_INTER_STATE,
    TAX_TYPE_INTRA_STATE,
    TAX_TYPE_NONE,
    allocate_discounts,
    compute_line_tax,
    compute_shipping_tax,
    extract_inclusive_tax,
    money,
    normalize_state,
    resolve_tax_type,
    split_tax,
    to_decimal,
)


# ─── base money helpers ───────────────────────────────────────────────────────


def test_to_decimal_uses_string_conversion_no_binary_drift():
    assert to_decimal(0.1) == Decimal("0.1")
    assert to_decimal("18.0") == Decimal("18.0")
    assert to_decimal(None) == Decimal("0")


def test_money_rounds_half_up():
    assert money("1.005") == Decimal("1.01")
    assert money("1.004") == Decimal("1.00")
    assert money("2.675") == Decimal("2.68")
    assert money("0") == Decimal("0.00")


def test_normalize_state():
    assert normalize_state(" maharashtra ") == "MAHARASHTRA"
    assert normalize_state(None) == ""
    assert normalize_state("") == ""


# ─── inclusive-tax extraction ─────────────────────────────────────────────────


def test_extract_inclusive_tax_round_trip():
    taxable, total = extract_inclusive_tax(118, 18)
    assert taxable == Decimal("100.00")
    assert total == Decimal("18.00")
    assert taxable + total == money(118)


def test_extract_inclusive_tax_300_at_18():
    taxable, total = extract_inclusive_tax(300, 18)
    assert taxable == Decimal("254.24")
    assert total == Decimal("45.76")


def test_extract_inclusive_tax_50_at_18():
    taxable, total = extract_inclusive_tax(50, 18)
    assert taxable == Decimal("42.37")
    assert total == Decimal("7.63")


def test_extract_inclusive_tax_zero_rate_all_taxable():
    taxable, total = extract_inclusive_tax(300, 0)
    assert taxable == Decimal("300.00")
    assert total == Decimal("0.00")


# ─── CGST / SGST / IGST splitting ─────────────────────────────────────────────


def test_split_tax_intra_state_equal_halves():
    cgst, sgst, igst = split_tax("45.76", TAX_TYPE_INTRA_STATE)
    assert cgst == Decimal("22.88")
    assert sgst == Decimal("22.88")
    assert igst == Decimal("0")


def test_split_tax_intra_odd_remainder_keeps_paisa():
    cgst, sgst, igst = split_tax("7.63", TAX_TYPE_INTRA_STATE)
    assert cgst == Decimal("3.82")
    assert sgst == Decimal("3.81")
    assert cgst + sgst == Decimal("7.63")


def test_split_tax_inter_state_all_igst():
    cgst, sgst, igst = split_tax("45.76", TAX_TYPE_INTER_STATE)
    assert cgst == Decimal("0")
    assert sgst == Decimal("0")
    assert igst == Decimal("45.76")


# ─── tax type resolution ──────────────────────────────────────────────────────


def test_resolve_tax_type_matching_state_is_intra():
    assert (
        resolve_tax_type("Maharashtra", "  maharashtra ")
        == TAX_TYPE_INTRA_STATE
    )


def test_resolve_tax_type_different_state_is_inter():
    assert (
        resolve_tax_type("Maharashtra", "Karnataka") == TAX_TYPE_INTER_STATE
    )


def test_resolve_tax_type_unknown_place_of_supply_is_intra():
    assert resolve_tax_type("Maharashtra", None) == TAX_TYPE_INTRA_STATE
    assert resolve_tax_type(None, "Maharashtra") == TAX_TYPE_INTRA_STATE


# ─── discount allocation ──────────────────────────────────────────────────────


def test_allocate_discounts_exact_proportional_split():
    allocs = allocate_discounts([300.0, 100.0], 50.0)
    assert allocs == pytest.approx([37.5, 12.5])


def test_allocate_discounts_largest_remainder_deterministic():
    allocs = allocate_discounts([250.01, 99.99], 10.0)
    assert round(sum(allocs), 2) == 10.0
    assert allocs == pytest.approx([7.14, 2.86])


def test_allocate_discounts_exact_sum_always():
    totals = [199.99, 349.99, 50.0]
    for discount in (0.0, 10.0, 100.0, 599.98, 5000.0):
        allocs = allocate_discounts(totals, discount)
        assert round(sum(allocs), 2) == round(min(discount, sum(totals)), 2)
        assert all(a >= 0 for a in allocs)


def test_allocate_discounts_never_exceeds_line_total():
    allocs = allocate_discounts([30.0], 100.0)
    assert allocs == pytest.approx([30.0])


def test_allocate_discounts_zero_cases():
    assert allocate_discounts([], 10.0) == []
    assert allocate_discounts([100.0, 200.0], 0) == pytest.approx([0.0, 0.0])


# ─── per-line tax ─────────────────────────────────────────────────────────────


def test_compute_line_tax_intra_state():
    result = compute_line_tax(300, 18, TAX_TYPE_INTRA_STATE)
    assert result["taxable_value"] == Decimal("254.24")
    assert result["cgst_amount"] == Decimal("22.88")
    assert result["sgst_amount"] == Decimal("22.88")
    assert result["igst_amount"] == Decimal("0")
    assert result["total_tax"] == Decimal("45.76")


def test_compute_line_tax_inter_state():
    result = compute_line_tax(300, 18, TAX_TYPE_INTER_STATE)
    assert result["cgst_amount"] == Decimal("0")
    assert result["sgst_amount"] == Decimal("0")
    assert result["igst_amount"] == Decimal("45.76")


# ─── shipping tax ─────────────────────────────────────────────────────────────


def test_compute_shipping_tax_intra_state():
    result = compute_shipping_tax(50, TAX_TYPE_INTRA_STATE, 18)
    assert result["taxable_value"] == Decimal("42.37")
    assert result["cgst_amount"] == Decimal("3.82")
    assert result["sgst_amount"] == Decimal("3.81")
    assert result["igst_amount"] == Decimal("0")
    assert result["total_tax"] == Decimal("7.63")


def test_compute_shipping_tax_zero_shipping_is_tax_free():
    result = compute_shipping_tax(0, TAX_TYPE_NONE, None)
    assert result["taxable_value"] == Decimal("0")
    assert result["total_tax"] == Decimal("0")


def test_compute_shipping_tax_zero_rate_has_no_embedded_tax():
    result = compute_shipping_tax(50, TAX_TYPE_INTRA_STATE, 0.0)
    assert result["taxable_value"] == Decimal("50.00")
    assert result["total_tax"] == Decimal("0.00")


def test_compute_shipping_tax_missing_rate_raises_config_error():
    with pytest.raises(GstConfigError) as exc_info:
        compute_shipping_tax(50, TAX_TYPE_INTRA_STATE, None)
    assert exc_info.value.code == "SHIPPING_GST_RATE_MISSING"