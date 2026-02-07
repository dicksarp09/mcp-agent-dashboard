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
    print("🚀 Starting MCP Student Analytics API...")
    print("📡 Server will run on http://127.0.0.1:8000")
    print("📚 API docs available at http://127.0.0.1:8000/docs")
    print("\n⚠️  Make sure your .env file has MONGO_URI set for real database access")
    print("\nPress Ctrl+C to stop the server\n")

    uvicorn.run(
        "src.main:app", host="127.0.0.1", port=8000, reload=True, log_level="info"
    )
