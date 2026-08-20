from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FEATURE_ROOT = PROJECT_ROOT / "src" / "features" / "customer-growth"


def _read(relative_path: str) -> str:
    return (PROJECT_ROOT / relative_path).read_text(encoding="utf-8")


def test_interactive_customer_growth_targets_are_at_least_44px() -> None:
    selector = _read("src/features/customer-growth/merchant-selector.tsx")
    select_ui = _read("src/features/customer-growth/ui/select.tsx")
    evidence = _read("src/features/customer-growth/evidence-details.tsx")

    assert 'className="min-h-11 w-full"' in selector
    assert 'className="min-h-11"' in selector
    assert "items={merchantOptions}" in selector
    assert "flex min-h-11 w-fit" in select_ui
    assert "relative flex min-h-11 w-full" in select_ui
    assert "flex min-h-11 cursor-pointer" in evidence


def test_heading_order_has_no_skipped_h4_level() -> None:
    page = _read("src/features/customer-growth/customer-growth-page.tsx")
    evidence = _read("src/features/customer-growth/evidence-details.tsx")

    assert "<h1" in page
    assert "<h2" in page
    assert "<h3" in page
    assert "<h4" not in page
    assert "<h4" not in evidence


def test_customer_growth_does_not_depend_on_unapproved_shared_ui() -> None:
    files = list(FEATURE_ROOT.rglob("*.tsx")) + list(
        (PROJECT_ROOT / "src" / "app" / "customers").rglob("*.tsx")
    )

    for path in files:
        assert "@/components/ui/" not in path.read_text(encoding="utf-8"), path
