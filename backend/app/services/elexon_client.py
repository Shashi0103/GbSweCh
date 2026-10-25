import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import httpx

try:
    from backend.app.core.config import settings
except ModuleNotFoundError:
    from app.core.config import settings

logger = logging.getLogger(__name__)

class ElexonClient:
    def __init__(self, base_url: Optional[str] = None, data_dir: Optional[Path] = None):
        self.base_url = (base_url or settings.ELEXON_BASE_URL).rstrip("/")
        self.data_dir = data_dir or settings.DATA_DIR
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.fuelhh_cache_file = self.data_dir / "cache_fuelhh_wind_jan2026.json"
        self.windfor_cache_file = self.data_dir / "cache_windfor_jan2026.json"
        self.last_fetch_status: str = "uninitialized"
        self.last_retrieval_timestamp: str = datetime.now(timezone.utc).isoformat()
        self._fuelhh_mem_cache: Optional[List[dict]] = None
        self._windfor_mem_cache: Optional[List[dict]] = None

    def load_cached_fuelhh(self) -> List[dict]:
        """Loads cached FUELHH wind records (in-memory memoized)."""
        if self._fuelhh_mem_cache is not None:
            return self._fuelhh_mem_cache
        if self.fuelhh_cache_file.exists():
            try:
                with open(self.fuelhh_cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._fuelhh_mem_cache = data
                    logger.info(f"Loaded {len(data)} cached FUELHH wind records into memory.")
                    return data
            except Exception as e:
                logger.error(f"Error reading FUELHH cache: {e}")
        return []

    def load_cached_windfor(self) -> List[dict]:
        """Loads cached WINDFOR records (in-memory memoized)."""
        if self._windfor_mem_cache is not None:
            return self._windfor_mem_cache
        if self.windfor_cache_file.exists():
            try:
                with open(self.windfor_cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._windfor_mem_cache = data
                    logger.info(f"Loaded {len(data)} cached WINDFOR records into memory.")
                    return data
            except Exception as e:
                logger.error(f"Error reading WINDFOR cache: {e}")
        return []

    async def fetch_fuelhh_wind(
        self,
        settlement_date_from: str = "2026-01-01",
        settlement_date_to: str = "2026-02-02",
        force_live: bool = False
    ) -> Tuple[List[dict], str]:
        """
        Retrieves FUELHH actual generation filtered to WIND.
        Returns (records, status) where status is 'live' or 'cached'.
        """
        if not force_live and self.fuelhh_cache_file.exists():
            records = self.load_cached_fuelhh()
            if records:
                self.last_fetch_status = "cached"
                return records, "cached"

        url = f"{self.base_url}/datasets/FUELHH/stream"
        params = {
            "settlementDateFrom": settlement_date_from,
            "settlementDateTo": settlement_date_to,
        }
        headers = {"User-Agent": "WindSight/1.0 (Gridbricks SWE Challenge)"}

        try:
            logger.info(f"Fetching live FUELHH from {url} with params {params}")
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                all_data = resp.json()
                
            wind_records = [
                r for r in all_data
                if r.get("fuelType") == "WIND" and r.get("generation") is not None
            ]
            self.last_fetch_status = "live"
            self.last_retrieval_timestamp = datetime.now(timezone.utc).isoformat()
            
            # Save to cache
            try:
                with open(self.fuelhh_cache_file, "w", encoding="utf-8") as f:
                    json.dump(wind_records, f)
            except Exception as e:
                logger.warning(f"Failed to update cache on disk: {e}")

            logger.info(f"Successfully retrieved {len(wind_records)} live WIND records from FUELHH.")
            return wind_records, "live"

        except Exception as e:
            logger.warning(f"Live FUELHH fetch failed ({e}). Falling back to local cache.")
            cached = self.load_cached_fuelhh()
            self.last_fetch_status = "cached (fallback)"
            return cached, "cached"

    async def fetch_windfor(
        self,
        publish_time_from: str = "2025-12-31T00:00:00Z",
        publish_time_to: str = "2026-02-02T00:00:00Z",
        force_live: bool = False
    ) -> Tuple[List[dict], str]:
        """
        Retrieves WINDFOR forecasts.
        Returns (records, status) where status is 'live' or 'cached'.
        """
        if not force_live and self.windfor_cache_file.exists():
            records = self.load_cached_windfor()
            if records:
                self.last_fetch_status = "cached"
                return records, "cached"

        url = f"{self.base_url}/datasets/WINDFOR/stream"
        params = {
            "publishDateTimeFrom": publish_time_from,
            "publishDateTimeTo": publish_time_to,
        }
        headers = {"User-Agent": "WindSight/1.0 (Gridbricks SWE Challenge)"}

        try:
            logger.info(f"Fetching live WINDFOR from {url} with params {params}")
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                all_data = resp.json()

            self.last_fetch_status = "live"
            self.last_retrieval_timestamp = datetime.now(timezone.utc).isoformat()

            # Save to cache
            try:
                with open(self.windfor_cache_file, "w", encoding="utf-8") as f:
                    json.dump(all_data, f)
            except Exception as e:
                logger.warning(f"Failed to update cache on disk: {e}")

            logger.info(f"Successfully retrieved {len(all_data)} live WINDFOR records.")
            return all_data, "live"

        except Exception as e:
            logger.warning(f"Live WINDFOR fetch failed ({e}). Falling back to local cache.")
            cached = self.load_cached_windfor()
            self.last_fetch_status = "cached (fallback)"
            return cached, "cached"

elexon_client = ElexonClient()
