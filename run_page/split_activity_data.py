#!/usr/bin/env python3
"""Create a lightweight activity index and a separate on-demand route payload."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "static" / "activities.json"
SUMMARY = ROOT / "src" / "static" / "activities-summary.json"
ROUTES = ROOT / "src" / "static" / "activity-routes.json"


def main() -> None:
    activities = json.loads(SOURCE.read_text(encoding="utf-8"))
    if not isinstance(activities, list):
        raise ValueError(f"Expected a JSON array in {SOURCE}")

    summaries = []
    routes = []
    for activity in activities:
        if not isinstance(activity, dict):
            continue
        summaries.append({key: value for key, value in activity.items() if key != "summary_polyline"})
        polyline = activity.get("summary_polyline")
        if polyline:
            routes.append([activity["run_id"], polyline])

    SUMMARY.write_text(
        json.dumps(summaries, ensure_ascii=False, separators=(',', ':')),
        encoding="utf-8",
    )
    ROUTES.write_text(
        json.dumps(routes, ensure_ascii=False, separators=(',', ':')),
        encoding="utf-8",
    )

    source_size = SOURCE.stat().st_size
    summary_size = SUMMARY.stat().st_size
    route_size = ROUTES.stat().st_size
    if source_size:
        reduction = (1 - summary_size / source_size) * 100
        print(f"Activity data split: {source_size:,} B -> {summary_size:,} B summary + {route_size:,} B routes ({reduction:.1f}% less initial data)")
    else:
        print("Activity data split: no source activities found.")


if __name__ == "__main__":
    main()
