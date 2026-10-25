import os
import sys

# Ensure paths are available for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(root_dir, "backend")

for p in (backend_dir, root_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.main import app

__all__ = ["app"]
