import os
import sys
from pathlib import Path

_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

import pytest
from datetime import date, datetime, timezone
from app.models.schemas import IntervalRecord

@pytest.fixture
def sample_raw_forecasts():
    """
    Synthetic test fixtures clearly identified for unit testing edge cases.
    """
    return [
        # Target interval 2026-01-02T12:00:00Z
        # Vintage 1: Published 2026-01-01T08:00:00Z (before 12:00 cutoff)
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T08:00:00Z",
            "startTime": "2026-01-02T12:00:00Z",
            "generation": 1000.0
        },
        # Vintage 2: Published 2026-01-01T11:30:00Z (latest before 12:00 cutoff)
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T11:30:00Z",
            "startTime": "2026-01-02T12:00:00Z",
            "generation": 1200.0
        },
        # Vintage 3: Published 2026-01-01T14:00:00Z (AFTER 12:00 cutoff -> MUST BE REJECTED)
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T14:00:00Z",
            "startTime": "2026-01-02T12:00:00Z",
            "generation": 1500.0
        },
        # Duplicate of Vintage 2
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T11:30:00Z",
            "startTime": "2026-01-02T12:00:00Z",
            "generation": 1200.0
        },
    ]

@pytest.fixture
def sample_raw_fuels():
    """
    Synthetic actual generation fixtures.
    """
    return [
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-02T12:30:00Z",
            "startTime": "2026-01-02T12:00:00Z",
            "settlementDate": "2026-01-02",
            "settlementPeriod": 25,
            "fuelType": "WIND",
            "generation": 1100.0
        },
        # Non-wind record to verify filtering
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-02T12:30:00Z",
            "startTime": "2026-01-02T12:00:00Z",
            "settlementDate": "2026-01-02",
            "settlementPeriod": 25,
            "fuelType": "CCGT",
            "generation": 4500.0
        }
    ]
