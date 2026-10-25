import os
from pathlib import Path
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "WindSight"
    PRODUCT_DESCRIPTOR: str = "Wind Forecast Intelligence Platform"
    TAGLINE: str = "See the forecast. Measure the uncertainty. Make smarter energy decisions."
    VERSION: str = "1.0.0"
    
    # Elexon BMRS API Base URL
    ELEXON_BASE_URL: str = os.getenv("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
    
    # Data directory
    DATA_DIR: Path = Path(__file__).resolve().parent.parent.parent / "data"
    
    # Analysis defaults for January 2026
    DEFAULT_DECISION_START: str = "2026-01-01"
    DEFAULT_DECISION_END: str = "2026-01-31"
    DEFAULT_CUTOFF_TIME: str = "12:00:00"  # 12:00 UTC day-ahead cutoff
    DEFAULT_MAPPING_POLICY: str = "hourly_block"  # 'hourly_block' or 'exact'
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*",
    ]

settings = Settings()
