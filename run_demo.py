import logging
import os
import time
import threading
from dotenv import load_dotenv

# Load environment variables BEFORE importing mcp_server
load_dotenv()

from fastapi.testclient import TestClient
from src import mcp_server
from src.agent import handle_request
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("demo")


def start_uvicorn_in_thread():
    def target():
        uvicorn.run(mcp_server.app, host="127.0.0.1", port=8000, log_level="info")
    t = threading.Thread(target=target, daemon=True)
    t.start()
    return t


def run_demo():
    # Demo cases - now with LLM-powered Intent Node
    cases = [
        # Single student summary (natural language)
        "Can you summarize the performance for student 689cef602490264c7f2dd235?",
        # Trend analysis
        "Is student 689cef602490264c7f2dd235 improving or declining in grades?",
        # Derived metrics / alerts
        "What are the risk factors for student 689cef602490264c7f2dd235?",
        # Class summary
        "Show me the class rankings and identify struggling students",
        # Statistics
        "I need an overview of class performance and at-risk rates",
        # Alternative phrasing for trend
        "What's the grade trend for student 689cef602490264c7f2dd235?",
    ]

    MONGO_URI = os.getenv("MONGO_URI")

    if MONGO_URI:
        # Start the MCP server locally and use real HTTP requests
        logger.info("Detected MONGO_URI; starting local MCP server on http://127.0.0.1:8000")
        start_uvicorn_in_thread()
        # Give the server a moment to start
        time.sleep(1.5)
        mcp_url = "http://127.0.0.1:8000"

        for raw in cases:
            state = handle_request(raw, mcp_url)
            print("---")
            print("Input:", raw)
            print("Final response:", state.get("final_response"))
            if state.get("error"):
                print("Error:", state.get("error"))

    else:
        # Fallback: use in-process TestClient and monkeypatch requests.post
        client = TestClient(mcp_server.app)
        mcp_url = "http://testserver"

        from unittest.mock import patch

        def tc_post(url, json, headers=None, timeout=5.0):
            resp = client.post("/query", json=json)
            class R:
                status_code = resp.status_code
                text = resp.text
                def json(self_inner):
                    return resp.json()
            return R()

        for raw in cases:
            with patch("requests.post", tc_post):
                state = handle_request(raw, mcp_url)
                print("---")
                print("Input:", raw)
                print("Final response:", state.get("final_response"))
                if state.get("error"):
                    print("Error:", state.get("error"))


if __name__ == "__main__":
    run_demo()
