from datetime import date
import pytest

try:
    from backend.app.services.accuracy_engine import AccuracyEngine
except ModuleNotFoundError:
    from app.services.accuracy_engine import AccuracyEngine

def test_accuracy_metrics_calculations():
    engine = AccuracyEngine(cutoff_time="12:00:00", mapping_policy="exact")

    raw_forecasts = [
        {"publishTime": "2026-01-01T10:00:00Z", "startTime": "2026-01-02T12:00:00Z", "generation": 1000.0},
        {"publishTime": "2026-01-01T10:00:00Z", "startTime": "2026-01-02T12:30:00Z", "generation": 2000.0},
    ]
    raw_fuels = [
        {"fuelType": "WIND", "startTime": "2026-01-02T12:00:00Z", "settlementDate": "2026-01-02", "settlementPeriod": 25, "generation": 1200.0},
        {"fuelType": "WIND", "startTime": "2026-01-02T12:30:00Z", "settlementDate": "2026-01-02", "settlementPeriod": 26, "generation": 1600.0},
    ]

    records, summary, dq, _ = engine.run_analysis(
        decision_date_start=date(2026, 1, 1),
        decision_date_end=date(2026, 1, 1),
        raw_fuels=raw_fuels,
        raw_forecasts=raw_forecasts
    )

    # Interval 1: Actual = 1200, Forecast = 1000
    # Error = Actual - Forecast = 1200 - 1000 = +200 (underforecasting)
    # Bias = Forecast - Actual = 1000 - 1200 = -200
    # Abs Error = 200
    # APE = 100 * 200 / 1200 = 16.667%

    # Interval 2: Actual = 1600, Forecast = 2000
    # Error = Actual - Forecast = 1600 - 2000 = -400 (overforecasting)
    # Bias = Forecast - Actual = 2000 - 1600 = +400
    # Abs Error = 400
    # APE = 100 * 400 / 1600 = 25.0%

    matched = [r for r in records if r.matchStatus == "matched"]
    assert len(matched) == 2

    r1 = next(r for r in matched if r.targetStartTime == "2026-01-02T12:00:00Z")
    assert r1.signedError == 200.0
    assert r1.absoluteError == 200.0
    assert r1.biasContribution == -200.0
    assert r1.absolutePercentageError is not None
    assert round(r1.absolutePercentageError, 1) == 16.7

    r2 = next(r for r in matched if r.targetStartTime == "2026-01-02T12:30:00Z")
    assert r2.signedError == -400.0
    assert r2.absoluteError == 400.0
    assert r2.biasContribution == 400.0
    assert r2.absolutePercentageError is not None
    assert r2.absolutePercentageError == 25.0

    # MAE = (200 + 400) / 2 = 300.0 MW
    assert summary.mae == 300.0

    # Bias = (-200 + 400) / 2 = +100.0 MW (overforecasting tendency)
    assert summary.bias == 100.0

    # MAPE = (16.667 + 25.0) / 2 = 20.83%
    assert summary.mape == 20.83

    # RMSE = sqrt((200^2 + (-400)^2) / 2) = sqrt((40000 + 160000) / 2) = sqrt(100000) = 316.23 MW
    assert summary.rmse == 316.23

def test_zero_actual_handling_in_mape():
    engine = AccuracyEngine(cutoff_time="12:00:00", mapping_policy="exact")

    raw_forecasts = [
        {"publishTime": "2026-01-01T10:00:00Z", "startTime": "2026-01-02T12:00:00Z", "generation": 500.0},
        {"publishTime": "2026-01-01T10:00:00Z", "startTime": "2026-01-02T12:30:00Z", "generation": 1000.0},
    ]
    # One actual is 0.0 MW
    raw_fuels = [
        {"fuelType": "WIND", "startTime": "2026-01-02T12:00:00Z", "settlementDate": "2026-01-02", "settlementPeriod": 25, "generation": 0.0},
        {"fuelType": "WIND", "startTime": "2026-01-02T12:30:00Z", "settlementDate": "2026-01-02", "settlementPeriod": 26, "generation": 1000.0},
    ]

    records, summary, _, _ = engine.run_analysis(
        decision_date_start=date(2026, 1, 1),
        decision_date_end=date(2026, 1, 1),
        raw_fuels=raw_fuels,
        raw_forecasts=raw_forecasts
    )

    r_zero = next(r for r in records if r.targetStartTime == "2026-01-02T12:00:00Z")
    assert r_zero.actualGeneration == 0.0
    assert r_zero.absolutePercentageError is None  # Must NOT be division by zero or inf
    assert summary.zeroActualExclusions == 1

    # MAPE should only average over the non-zero interval (100 * 0 / 1000 = 0.0)
    assert summary.mape == 0.0

def test_missing_actual_not_treated_as_zero():
    engine = AccuracyEngine(cutoff_time="12:00:00", mapping_policy="exact")

    raw_forecasts = [
        {"publishTime": "2026-01-01T10:00:00Z", "startTime": "2026-01-02T12:00:00Z", "generation": 1500.0},
    ]
    raw_fuels = []  # No actuals

    records, summary, _, _ = engine.run_analysis(
        decision_date_start=date(2026, 1, 1),
        decision_date_end=date(2026, 1, 1),
        raw_fuels=raw_fuels,
        raw_forecasts=raw_forecasts
    )

    rec = next(r for r in records if r.targetStartTime == "2026-01-02T12:00:00Z")
    assert rec.actualGeneration is None
    assert rec.matchStatus == "missing_actual"
    assert rec.signedError is None  # MUST NOT be 0 - 1500 = -1500!
    assert rec.absoluteError is None
    assert summary.matchedIntervals == 0
    assert summary.mae is None

def test_january_boundary_handling_jan31_to_feb1():
    engine = AccuracyEngine(cutoff_time="12:00:00", mapping_policy="hourly_block")

    raw_forecasts = [
        {"publishTime": "2026-01-31T11:00:00Z", "startTime": "2026-02-01T00:00:00Z", "generation": 8000.0},
    ]
    raw_fuels = [
        {"fuelType": "WIND", "startTime": "2026-02-01T00:00:00Z", "settlementDate": "2026-02-01", "settlementPeriod": 1, "generation": 7900.0},
    ]

    records, summary, _, _ = engine.run_analysis(
        decision_date_start=date(2026, 1, 31),
        decision_date_end=date(2026, 1, 31),
        raw_fuels=raw_fuels,
        raw_forecasts=raw_forecasts
    )

    rec = records[0]
    assert rec.decisionDate == "2026-01-31"
    assert rec.settlementDate == "2026-02-01"
    assert rec.targetStartTime == "2026-02-01T00:00:00Z"
    assert rec.actualGeneration == 7900.0
    assert rec.forecastGeneration == 8000.0
    assert rec.signedError == -100.0
    assert rec.matchStatus == "matched"
