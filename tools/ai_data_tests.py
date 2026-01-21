"""
AI Data Accuracy Test Harness
- Loads all daily_entries from Firestore
- Builds PSS index and stats
- Runs 50 deterministic test queries (ground-truth answers)
"""

import os
import sys
from datetime import datetime
from collections import defaultdict

import firebase_admin
from firebase_admin import credentials, firestore


ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVICE_ACCOUNT = os.path.join(ROOT_DIR, "serviceAccountKey.json")


def init_firestore():
    if not os.path.exists(SERVICE_ACCOUNT):
        print("❌ serviceAccountKey.json not found at:", SERVICE_ACCOUNT)
        sys.exit(1)
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        return firestore.client()
    except Exception as exc:
        print("❌ Failed to initialize Firestore:", exc)
        sys.exit(1)


def load_all_entries(db):
    print("📥 Loading all daily_entries (paged)...")
    all_docs = []
    last_doc = None
    page = 1
    while True:
        query = db.collection("daily_entries").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(500)
        if last_doc is not None:
            query = query.start_after(last_doc)
        snapshot = query.get()
        if not snapshot:
            break
        all_docs.extend(snapshot)
        last_doc = snapshot[-1]
        print(f"  Page {page}: +{len(snapshot)}")
        page += 1
    print(f"✅ Total records loaded: {len(all_docs)}")
    return [dict(id=doc.id, **doc.to_dict()) for doc in all_docs]


def to_date_str(value):
    if not value:
        return None
    if isinstance(value, str):
        return value
    try:
        # Firestore Timestamp
        return value.to_datetime().date().isoformat()
    except Exception:
        try:
            return value.date().isoformat()
        except Exception:
            return None


def build_index(entries):
    pss_index = defaultdict(lambda: {"count": 0, "dates": set(), "latest": None})
    all_dates = set()
    for r in entries:
        name = r.get("pssStation") or "Unknown"
        date = r.get("date") or to_date_str(r.get("timestamp"))
        pss_index[name]["count"] += 1
        if date:
            pss_index[name]["dates"].add(date)
            all_dates.add(date)
            if not pss_index[name]["latest"] or date > pss_index[name]["latest"]:
                pss_index[name]["latest"] = date
    return pss_index, sorted(all_dates)


def max_total_load(entries, date_filter=None):
    best = None
    for r in entries:
        if date_filter and r.get("date") != date_filter:
            continue
        total = r.get("totalMaxLoad")
        try:
            total = float(total)
        except Exception:
            total = None
        if total is None:
            continue
        if not best or total > best["total"]:
            best = {"pss": r.get("pssStation"), "date": r.get("date"), "total": total}
    return best


def min_voltage_violation(entries, threshold=11.0):
    # Example: find any feeder voltage below threshold
    violations = []
    for r in entries:
        feeders = r.get("feeders") or {}
        for feeder_name, feeder in feeders.items():
            try:
                min_v = float(feeder.get("minVoltage"))
            except Exception:
                min_v = None
            if min_v is not None and min_v < threshold:
                violations.append({
                    "pss": r.get("pssStation"),
                    "date": r.get("date"),
                    "feeder": feeder.get("feederName") or feeder_name,
                    "minVoltage": min_v,
                })
    return violations


def run_tests(entries, pss_index, all_dates):
    print("\n🧪 Running 50 deterministic data tests (ground truth)\n")

    latest_date = max(all_dates) if all_dates else None
    pss_names = sorted(pss_index.keys())

    tests = []
    tests.append(("Total record count", len(entries)))
    tests.append(("Unique PSS count", len(pss_names)))
    tests.append(("All PSS names", ", ".join(pss_names)))
    tests.append(("Latest submission date", latest_date))

    # PSS-specific tests (top 10 by count)
    top_pss = sorted(pss_index.items(), key=lambda x: x[1]["count"], reverse=True)[:10]
    for name, stats in top_pss:
        tests.append((f"PSS {name} total records", stats["count"]))
        tests.append((f"PSS {name} latest date", stats["latest"]))
        dates_sorted = sorted(stats["dates"])
        tests.append((f"PSS {name} first date", dates_sorted[0] if dates_sorted else None))

    # Today/latest-date tests
    if latest_date:
        today_pss = sorted({r.get("pssStation") for r in entries if r.get("date") == latest_date})
        tests.append((f"PSS submitted on latest date {latest_date}", ", ".join(today_pss)))

    # Max total load
    best = max_total_load(entries, date_filter=latest_date)
    if best:
        tests.append((f"Highest totalMaxLoad on {latest_date}", f"{best['pss']} ({best['total']})"))

    # Voltage violations
    violations = min_voltage_violation(entries, threshold=11.0)
    tests.append(("Voltage violations below 11kV (count)", len(violations)))
    if violations:
        sample = violations[:5]
        sample_str = "; ".join([f"{v['pss']} {v['feeder']} {v['minVoltage']}kV on {v['date']}" for v in sample])
        tests.append(("Voltage violations sample", sample_str))

    # Fill up to 50 tests with per-pss date lists (limited)
    for name in pss_names:
        if len(tests) >= 50:
            break
        dates_sorted = sorted(pss_index[name]["dates"], reverse=True)
        tests.append((f"PSS {name} dates (up to 5)", ", ".join(dates_sorted[:5])) )

    # Print results
    for i, (label, value) in enumerate(tests[:50], start=1):
        print(f"{i:02d}. {label}: {value}")


if __name__ == "__main__":
    db = init_firestore()
    entries = load_all_entries(db)
    pss_index, all_dates = build_index(entries)
    run_tests(entries, pss_index, all_dates)
