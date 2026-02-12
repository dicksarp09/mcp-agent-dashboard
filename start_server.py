#!/usr/bin/env python3
"""
MCP Student Analytics API Server
Run this to start the FastAPI backend server
"""

import uvicorn
import logging

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

if __name__ == "__main__":
    import os

    host = os.getenv("HOST", "0.0.0.0")
    port = os.getenv("PORT", 8000)

    print("🚀 Starting MCP Student Analytics API...")
    print(f"📡 Server will run on http://{host}:{port}")
    print(f"📚 API docs available at http://{host}:{port}/docs")
    print("\n⚠️  Make sure your .env file has MONGO_URI set for real database access")
    print("\nPress Ctrl+C to stop the server\n")

    # Use 0.0.0.0 to accept connections from outside the container (Railway, Docker)
    # Use 127.0.0.1 only for local development
    import os

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))

    uvicorn.run(
        "src.main:app",
        host=host,
        port=port,
        reload=(host == "127.0.0.1"),  # Only reload in development
        log_level="info",
    )
