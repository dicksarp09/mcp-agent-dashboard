#!/usr/bin/env python3
"""
MCP Student Analytics API Server
Run this to start the FastAPI backend server
"""

import os
import sys
import logging

# Setup logging first
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn

    # Railway sets PORT env variable, default to 8000 for local
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))

    print("🚀 Starting MCP Student Analytics API...")
    print(f"📡 Server will run on http://{host}:{port}")
    print(f"📚 API docs available at http://{host}:{port}/docs")
    print(
        f"🌐 Environment: {'Railway' if os.getenv('RAILWAY_ENVIRONMENT') else 'Local'}"
    )
    print("\n⚠️  Make sure your .env file has MONGO_URI set for real database access")
    print("\nPress Ctrl+C to stop the server\n")

    try:
        uvicorn.run(
            "src.main:app",
            host=host,
            port=port,
            reload=(host == "127.0.0.1"),  # Only reload in development
            log_level="info",
            access_log=True,
        )
    except Exception as e:
        logger.error(f"Failed to start server: {e}", exc_info=True)
        sys.exit(1)
