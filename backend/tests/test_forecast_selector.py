from datetime import date, datetime, timezone
import pytest

try:
    from backend.app.services.forecast_selector import ForecastSelector
except ModuleNotFoundError:
    from app.services.forecast_selector import ForecastSelector

def test_forecast_published_before_cutoff_is_eligible():
    selector = ForecastSelector(cutoff_time="12:00:00", mapping_policy="exact")
    raw = [{
        "publishTime": "2026-01-01T10:00:00Z",
        "startTime": "2026-01-02T14:00:00Z",
        "generation": 2500.0
    }]
    target_intervals = [
        (datetime(2026, 1, 2, 14, 0, 0, tzinfo=timezone.utc),
         datetime(2026, 1, 2, 14, 30, 0, tzinfo=timezone.utc), 29)
    ]
    selected_map, vintages, dups, rej = selector.select_forecasts_for_target_intervals(
        decision_date=date(2026, 1, 1),
        target_intervals=target_intervals,
        raw_forecasts=raw
    )
    res = selected_map["2026-01-02T14:00:00Z"]
    assert res["generation"] == 2500.0
    assert res["publishTime"] == "2026-01-01T10:00:00Z"
    assert rej == 0

def test_forecast_published_after_cutoff_is_rejected():
    selector = ForecastSelector(cutoff_time="12:00:00", mapping_policy="exact")
    # Published at 12:01:00Z -> after 12:00 cutoff -> MUST be rejected
    raw = [{
        "publishTime": "2026-01-01T12:01:00Z",
        "startTime": "2026-01-02T14:00:00Z",
        "generation": 3000.0
    }]
    target_intervals = [
        (datetime(2026, 1, 2, 14, 0, 0, tzinfo=timezone.utc),
         datetime(2026, 1, 2, 14, 30, 0, tzinfo=timezone.utc), 29)
    ]
    selected_map, vintages, dups, rej = selector.select_forecasts_for_target_intervals(
        decision_date=date(2026, 1, 1),
        target_intervals=target_intervals,
        raw_forecasts=raw
    )
    res = selected_map["2026-01-02T14:00:00Z"]
    assert res["generation"] is None
    assert res["publishTime"] is None
    assert "No forecast published at or before cutoff" in res["rationale"]
    assert rej == 1
    # Check that candidate vintage is marked ineligible with reason
    v_list = vintages["2026-01-02T14:00:00Z"]
    assert len(v_list) == 1
    assert v_list[0]["isEligible"] is False
    assert "future-data leakage prevented" in v_list[0]["rejectionReason"]

def test_multiple_eligible_forecasts_selects_latest(sample_raw_forecasts):
    selector = ForecastSelector(cutoff_time="12:00:00", mapping_policy="exact")
    target_intervals = [
        (datetime(2026, 1, 2, 12, 0, 0, tzinfo=timezone.utc),
         datetime(2026, 1, 2, 12, 30, 0, tzinfo=timezone.utc), 25)
    ]
    selected_map, vintages, dups, rej = selector.select_forecasts_for_target_intervals(
        decision_date=date(2026, 1, 1),
        target_intervals=target_intervals,
        raw_forecasts=sample_raw_forecasts
    )
    res = selected_map["2026-01-02T12:00:00Z"]
    # Should pick 1200.0 MW (published 11:30), NOT 1000.0 (published 08:00) and NOT 1500.0 (published 14:00)
    assert res["generation"] == 1200.0
    assert res["publishTime"] == "2026-01-01T11:30:00Z"
    assert dups >= 1
    assert rej >= 1

def test_hourly_block_mapping_applies_to_half_hour():
    selector = ForecastSelector(cutoff_time="12:00:00", mapping_policy="hourly_block")
    raw = [{
        "publishTime": "2026-01-01T10:00:00Z",
        "startTime": "2026-01-02T12:00:00Z",
        "generation": 2200.0
    }]
    target_intervals = [
        (datetime(2026, 1, 2, 12, 0, 0, tzinfo=timezone.utc),
         datetime(2026, 1, 2, 12, 30, 0, tzinfo=timezone.utc), 25),
        (datetime(2026, 1, 2, 12, 30, 0, tzinfo=timezone.utc),
         datetime(2026, 1, 2, 13, 0, 0, tzinfo=timezone.utc), 26),
    ]
    selected_map, _, _, _ = selector.select_forecasts_for_target_intervals(
        decision_date=date(2026, 1, 1),
        target_intervals=target_intervals,
        raw_forecasts=raw
    )
    # Both 12:00 and 12:30 should inherit the hourly block forecast
    assert selected_map["2026-01-02T12:00:00Z"]["generation"] == 2200.0
    assert selected_map["2026-01-02T12:30:00Z"]["generation"] == 2200.0

def test_invalid_timestamps_gracefully_ignored():
    selector = ForecastSelector()
    raw = [
        {"publishTime": "corrupt-date", "startTime": "2026-01-02T12:00:00Z", "generation": 100},
        {"publishTime": "2026-01-01T10:00:00Z", "startTime": "corrupt-start", "generation": 100},
    ]
    target_intervals = [
        (datetime(2026, 1, 2, 12, 0, 0, tzinfo=timezone.utc),
         datetime(2026, 1, 2, 12, 30, 0, tzinfo=timezone.utc), 25)
    ]
    selected_map, _, _, _ = selector.select_forecasts_for_target_intervals(
        decision_date=date(2026, 1, 1),
        target_intervals=target_intervals,
        raw_forecasts=raw
    )
    assert selected_map["2026-01-02T12:00:00Z"]["generation"] is None
