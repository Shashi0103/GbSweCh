from datetime import date, datetime, time, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
import logging
from dateutil import parser as dt_parser

from app.models.schemas import VintageRecord, VintageInspectionResponse

logger = logging.getLogger(__name__)

def parse_utc_timestamp(ts_str: str) -> datetime:
    """Parses any ISO-like timestamp string to timezone-aware UTC datetime."""
    # Fast path for standard ISO format: 2026-01-01T00:00:00Z
    if len(ts_str) >= 20 and ts_str[10] == "T" and ts_str.endswith("Z"):
        try:
            return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        except Exception:
            pass
    dt = dt_parser.parse(ts_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt

def format_utc_timestamp(dt: datetime) -> str:
    """Formats datetime to standard ISO 8601 UTC string (YYYY-MM-DDTHH:MM:SSZ)."""
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

class ForecastSelector:
    def __init__(
        self,
        cutoff_time: str = "12:00:00",
        mapping_policy: str = "hourly_block"
    ):
        self.cutoff_time_str = cutoff_time
        parts = [int(p) for p in cutoff_time.split(":")]
        self.cutoff_hour = parts[0]
        self.cutoff_minute = parts[1] if len(parts) > 1 else 0
        self.cutoff_second = parts[2] if len(parts) > 2 else 0
        self.mapping_policy = mapping_policy
        self._parsed_forecasts_by_target: Optional[Dict[str, List[dict]]] = None
        self._duplicate_forecast_count: int = 0

    def get_decision_cutoff_datetime(self, decision_date: date) -> datetime:
        """Computes the exact UTC cutoff datetime for a purchasing decision date."""
        return datetime(
            decision_date.year,
            decision_date.month,
            decision_date.day,
            self.cutoff_hour,
            self.cutoff_minute,
            self.cutoff_second,
            tzinfo=timezone.utc
        )

    def index_raw_forecasts(self, raw_forecasts: List[dict]):
        """Pre-indexes raw forecast records by target startTime ISO string once."""
        by_target = defaultdict(list)
        seen_keys = set()
        dup_count = 0

        for f in raw_forecasts:
            try:
                target_start = parse_utc_timestamp(f["startTime"])
                pub_time = parse_utc_timestamp(f["publishTime"])
                gen = float(f["generation"])
            except Exception:
                continue

            target_iso = format_utc_timestamp(target_start)
            pub_iso = format_utc_timestamp(pub_time)

            dedup_key = (f.get("dataset", "WINDFOR"), pub_iso, target_iso)
            if dedup_key in seen_keys:
                dup_count += 1
                continue
            seen_keys.add(dedup_key)

            entry = {
                "publishTime": pub_iso,
                "publishDt": pub_time,
                "generation": gen,
                "rawStartTime": target_iso,
            }
            by_target[target_iso].append(entry)

            # If mapping policy is hourly_block and forecast is on the hour,
            # also map it to the :30 half-hour interval
            if self.mapping_policy == "hourly_block" and target_start.minute == 0:
                half_hour_iso = format_utc_timestamp(target_start + timedelta(minutes=30))
                by_target[half_hour_iso].append(entry)

        self._parsed_forecasts_by_target = dict(by_target)
        self._duplicate_forecast_count = dup_count

    def select_forecasts_for_target_intervals(
        self,
        decision_date: date,
        target_intervals: List[Tuple[datetime, datetime, int]],  # (start_utc, end_utc, settlement_period)
        raw_forecasts: Optional[List[dict]] = None
    ) -> Tuple[Dict[str, dict], Dict[str, List[dict]], int, int]:
        """
        Selects the latest eligible forecast published at or before cutoff for each target interval.
        """
        if self._parsed_forecasts_by_target is None and raw_forecasts is not None:
            self.index_raw_forecasts(raw_forecasts)

        cutoff_dt = self.get_decision_cutoff_datetime(decision_date)
        cutoff_iso = format_utc_timestamp(cutoff_dt)

        selected_map: Dict[str, dict] = {}
        vintages_by_target: Dict[str, List[dict]] = {}
        rejected_leakage_count = 0

        for start_dt, _, _ in target_intervals:
            t_iso = format_utc_timestamp(start_dt)
            candidates = (self._parsed_forecasts_by_target or {}).get(t_iso, [])

            all_vintages = []
            eligible = []

            for c in candidates:
                is_eligible = c["publishDt"] <= cutoff_dt
                rejection_reason = None
                if not is_eligible:
                    rejection_reason = (
                        f"Published at {c['publishTime']} after decision cutoff "
                        f"{cutoff_iso} (future-data leakage prevented)"
                    )
                    rejected_leakage_count += 1

                v_record = {
                    "publishTime": c["publishTime"],
                    "generation": c["generation"],
                    "isEligible": is_eligible,
                    "rejectionReason": rejection_reason,
                    "publishDt": c["publishDt"],
                    "isSelected": False
                }
                all_vintages.append(v_record)
                if is_eligible:
                    eligible.append(v_record)

            all_vintages.sort(key=lambda x: x["publishDt"])

            if eligible:
                eligible.sort(key=lambda x: x["publishDt"])
                best = eligible[-1]
                best["isSelected"] = True

                selected_map[t_iso] = {
                    "publishTime": best["publishTime"],
                    "generation": best["generation"],
                    "targetStartTime": t_iso,
                    "rationale": (
                        f"Latest forecast published before {self.cutoff_time_str} UTC cutoff on decision date "
                        f"{decision_date.isoformat()} (published {best['publishTime']})."
                    ),
                    "vintageCount": len(eligible)
                }
            else:
                reason = "No forecast published at or before cutoff"
                if not candidates:
                    reason = "No forecast published by Elexon WINDFOR for this interval"
                selected_map[t_iso] = {
                    "publishTime": None,
                    "generation": None,
                    "targetStartTime": t_iso,
                    "rationale": reason,
                    "vintageCount": 0
                }

            cleaned_vintages = [
                {
                    "publishTime": v["publishTime"],
                    "generation": v["generation"],
                    "isEligible": v["isEligible"],
                    "rejectionReason": v["rejectionReason"],
                    "isSelected": v["isSelected"]
                }
                for v in all_vintages
            ]
            vintages_by_target[t_iso] = cleaned_vintages

        return selected_map, vintages_by_target, self._duplicate_forecast_count, rejected_leakage_count
