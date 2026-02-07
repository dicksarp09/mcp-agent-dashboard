# MCP Student Analytics API

Clean FastAPI backend for student performance analysis via MCP protocol.

## Quick Start

```bash
# Activate virtual environment
.venv\Scripts\Activate.ps1

# Start the server
python start_server.py
```

The server will run on `http://127.0.0.1:8000`

## API Endpoints

### Health & Info
- `GET /` - API info
- `GET /health` - Health check
- `GET /docs` - Swagger UI documentation

### Student Queries
- `POST /query` - Query single student by ID
  ```json
  {
    "student_id": "689cef602490264c7f2dd235",
    "fields": ["name", "G1", "G2", "G3"]
  }
  ```

### Analysis
- `POST /analyze/summary` - Get student performance summary
- `POST /analyze/trend` - Get grade trend analysis
- `POST /analyze/risk` - Get risk assessment

### Class-Level
- `POST /class_analysis` - Get all students for class analysis
  ```json
  {
    "limit": 500
  }
  ```

## Environment Variables

Create a `.env` file in the root:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB=your_database_name
MONGO_COLLECTION=your_collection_name
```

Without these, the server runs with mock data.

## Project Structure

```
mcp-agent-dashboard/
├── src/
│   ├── main.py          # FastAPI application
│   ├── agent.py         # LangGraph agent (optional)
│   ├── mcp_server.py    # Old MCP server (legacy)
│   └── performance_analyzer.py  # Analysis functions
├── start_server.py      # Simple startup script
├── requirements.txt     # Python dependencies
└── .env                # Environment variables
```

## Development

The server runs with auto-reload enabled for development.

## Frontend Integration

The frontend expects the backend on `http://127.0.0.1:8000` with these endpoints:
- `/query` - Single student queries
- `/class_analysis` - Bulk student data

CORS is enabled for all origins during development.
