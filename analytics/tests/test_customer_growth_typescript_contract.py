import subprocess
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONTRACT_TEST = (
    PROJECT_ROOT
    / "src"
    / "features"
    / "customer-growth"
    / "customer-growth-artifact.test.mjs"
)


def test_customer_growth_typescript_contract() -> None:
    subprocess.run(
        [
            "node",
            "--experimental-strip-types",
            "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
            "--test",
            str(CONTRACT_TEST),
        ],
        cwd=PROJECT_ROOT,
        check=True,
    )
