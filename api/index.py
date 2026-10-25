import importlib
import os
import sys

# Ensure backend directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(root_dir, "backend")

for path in (backend_dir, root_dir):
    if path not in sys.path:
        sys.path.insert(0, path)

# Dynamically import the FastAPI application for Vercel Serverless Function execution
try:
    main_module = importlib.import_module("app.main")
    app = getattr(main_module, "app")
except (ImportError, ModuleNotFoundError):
    from backend.app.main import app  # type: ignore

handler = app

__all__ = ["app", "handler"]
