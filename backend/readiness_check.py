#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, '.')
from dotenv import load_dotenv

# Load environment
load_dotenv('.env')

print("=" * 70)
print("BACKEND READINESS CHECK")
print("=" * 70)

# 1. Environment check
print("\n[1] ENVIRONMENT VARIABLES")
required_vars = [
    'DATABASE_URL', 'SECRET_KEY', 'ALGORITHM', 
    'ACCESS_TOKEN_EXPIRE_MINUTES', 'REFRESH_TOKEN_EXPIRE_DAYS',
    'REDIS_URL', 'ALLOWED_ORIGINS', 'DEBUG'
]

env_check = {}
for var in required_vars:
    val = os.getenv(var)
    status = "✓" if val else "✗"
    is_placeholder = "placeholder" in str(val).lower() or "your_" in str(val).lower()
    placeholder_note = " [PLACEHOLDER]" if is_placeholder else ""
    env_check[var] = bool(val) and not is_placeholder
    print(f"  {status} {var}: {val[:40] if val else 'MISSING'}...{placeholder_note}")

env_pass = all(env_check.values())
print(f"\n  Result: {'PASS' if env_pass else 'WARNING/FAIL'}")

# 2. Database URL check
print("\n[2] DATABASE URL CONFIGURATION")
db_url = os.getenv('DATABASE_URL', '')
db_parts = {
    'scheme': 'postgresql' in db_url,
    'host': 'localhost' in db_url,
    'port': ':5432' in db_url,
    'database': 'nestinokids_db' in db_url,
}
for key, found in db_parts.items():
    print(f"  {'✓' if found else '✗'} {key}: {found}")
db_pass = all(db_parts.values())
print(f"\n  Result: {'PASS' if db_pass else 'FAIL'}")

# 3. Import check
print("\n[3] IMPORT RESOLUTION & CIRCULAR DEPS")
import_results = {}
import_errors = []

try:
    print("  Testing: app.main import...")
    from app.main import app
    import_results['app.main'] = True
    print("    ✓ Successfully imported app.main")
except Exception as e:
    import_results['app.main'] = False
    import_errors.append(f"app.main: {str(e)}")
    print(f"    ✗ Import failed: {str(e)[:60]}")

try:
    print("  Testing: app.db.database import...")
    from app.db.database import engine, Base
    import_results['app.db.database'] = True
    print("    ✓ Successfully imported app.db.database")
except Exception as e:
    import_results['app.db.database'] = False
    import_errors.append(f"app.db.database: {str(e)}")
    print(f"    ✗ Import failed: {str(e)[:60]}")

try:
    print("  Testing: app.models.models import...")
    from app.models.models import User, Product
    import_results['app.models'] = True
    print("    ✓ Successfully imported app.models")
except Exception as e:
    import_results['app.models'] = False
    import_errors.append(f"app.models: {str(e)}")
    print(f"    ✗ Import failed: {str(e)[:60]}")

try:
    print("  Testing: app.core.config import...")
    from app.core.config import settings
    import_results['app.core.config'] = True
    print("    ✓ Successfully imported app.core.config")
except Exception as e:
    import_results['app.core.config'] = False
    import_errors.append(f"app.core.config: {str(e)}")
    print(f"    ✗ Import failed: {str(e)[:60]}")

import_pass = all(import_results.values())
print(f"\n  Result: {'PASS' if import_pass else 'FAIL'}")

# 4. Dependency check
print("\n[4] DEPENDENCIES & PACKAGES")
try:
    import pkg_resources
    required_packages = [
        'fastapi', 'uvicorn', 'sqlalchemy', 'psycopg2-binary',
        'alembic', 'pydantic', 'pydantic-settings'
    ]
    missing = []
    for pkg in required_packages:
        try:
            pkg_resources.get_distribution(pkg)
            print(f"  ✓ {pkg}")
        except pkg_resources.DistributionNotFound:
            missing.append(pkg)
            print(f"  ✗ {pkg} NOT FOUND")
    
    # Check for slugify specifically
    try:
        pkg_resources.get_distribution('python-slugify')
        print(f"  ✓ python-slugify")
    except:
        missing.append('python-slugify')
        print(f"  ✗ python-slugify NOT FOUND (used in app/utils/helpers.py)")
    
    dep_pass = len(missing) == 0
    print(f"\n  Result: {'PASS' if dep_pass else 'FAIL'}")
    if missing:
        print(f"  Missing packages: {', '.join(missing)}")
except Exception as e:
    print(f"  Error checking dependencies: {e}")
    dep_pass = False

# Summary
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"  Environment Variables:   {'PASS' if env_pass else 'WARNING'}")
print(f"  Database Configuration:  {'PASS' if db_pass else 'FAIL'}")
print(f"  Imports & Circular Deps: {'PASS' if import_pass else 'FAIL'}")
print(f"  Dependencies:            {'PASS' if dep_pass else 'FAIL'}")

overall = env_pass and db_pass and import_pass and dep_pass
print(f"\n  OVERALL: {'✓ READY TO START' if overall else '✗ NOT READY'}")
print("=" * 70)

if import_errors:
    print("\nIMPORT ERRORS:")
    for err in import_errors:
        print(f"  - {err}")
