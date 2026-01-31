from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import re
import time
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mcp_server")

app = FastAPI(title="MCP Mongo Read-Only MCP")

# Allowed fields in projections (expanded for performance analysis)
ALLOWED_FIELDS = {
    # Grades
    "G1", "G2", "G3",
    # Demographics
    "name", "age", "sex",
    # Study metrics
    "studytime", "absences", "failures",
    # Behavioral indicators
    "goout", "Dalc", "Walc",
    # Other common fields
    "school", "address", "famsize", "Pstatus", "Medu", "Fedu",
    "Mjob", "Fjob", "reason", "guardian", "traveltime", "Pclass",
    "activities", "nursery", "higher", "internet", "romantic",
    "freetime", "health", "paid"
}

# In-memory mock DB keyed by 24-hex ObjectId strings (fallback)
MOCK_DB = {
    "5f43a1a8a1a1a1a1a1a1a1a1": {"name": "Alice", "age": 17, "sex": "F", "G3": 13},
    "5f43a1a8b2b2b2b2b2b2b2b2": {"name": "Bob", "age": 18, "sex": "M", "G3": 15},
}

OBJID_RE = re.compile(r"^[0-9a-fA-F]{24}$")

# Optional real Mongo configuration (read from environment)
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION")

USE_REAL_DB = False
mongo_collection = None

if MONGO_URI and MONGO_DB and MONGO_COLLECTION:
    try:
        from pymongo import MongoClient
        from bson import ObjectId
        import certifi

        client = MongoClient(
            MONGO_URI,
            tlsCAFile=certifi.where()
        )
        mongo_collection = client[MONGO_DB][MONGO_COLLECTION]
        USE_REAL_DB = True
        logger.info("mcp_server: configured to use real MongoDB collection")
    except Exception:
        logger.exception("mcp_server: failed to configure real MongoDB, falling back to mock DB")
        USE_REAL_DB = False
else:
    logger.info("mcp_server: MONGO_URI/MONGO_DB/MONGO_COLLECTION not fully set; using mock DB")


class QueryRequest(BaseModel):
    student_id: str = Field(..., description="24-hex Mongo ObjectId string")
    fields: List[str] = Field(..., description="Projection fields to return")

    @validator("student_id")
    def valid_objid(cls, v):
        if not OBJID_RE.match(v):
            raise ValueError("student_id must be a 24-hex string")
        return v

    @validator("fields")
    def fields_allowed(cls, v):
        if not v:
            raise ValueError("fields must be a non-empty list")
        invalid = [f for f in v if f not in ALLOWED_FIELDS]
        if invalid:
            raise ValueError(f"invalid projection fields: {invalid}")
        return v


class QueryResponse(BaseModel):
    student_id: str
    result: Optional[dict] = None
    error: Optional[str] = None


@app.post("/query", response_model=QueryResponse)
def query_student(q: QueryRequest):
    start = time.time()
    node = "Mongo MCP Tool Node"
    try:
        logger.info(f"{node} - start - student_id={q.student_id} fields={q.fields}")

        # If configured, use real MongoDB (read-only via projection)
        if USE_REAL_DB and mongo_collection is not None:
            try:
                proj = {f: 1 for f in q.fields}
                # Ensure _id is not returned unless requested (we don't expose it)
                proj["_id"] = 0
                doc = mongo_collection.find_one({"_id": ObjectId(q.student_id)}, proj)
                if doc is None:
                    duration = time.time() - start
                    logger.info(f"{node} - empty - duration={duration:.4f}s")
                    return QueryResponse(student_id=q.student_id, result=None)
                # Only return the projection keys
                duration = time.time() - start
                logger.info(f"{node} - success (real db) - duration={duration:.4f}s")
                return QueryResponse(student_id=q.student_id, result=doc)
            except Exception as e:
                duration = time.time() - start
                logger.exception(f"{node} - db_error - {e} - duration={duration:.4f}s")
                raise HTTPException(status_code=500, detail="internal MCP DB error")

        # Fallback to mock DB
        doc = MOCK_DB.get(q.student_id)
        if doc is None:
            duration = time.time() - start
            logger.info(f"{node} - empty (mock) - duration={duration:.4f}s")
            return QueryResponse(student_id=q.student_id, result=None)

        projected = {k: doc[k] for k in q.fields if k in doc}
        duration = time.time() - start
        logger.info(f"{node} - success (mock) - duration={duration:.4f}s")
        return QueryResponse(student_id=q.student_id, result=projected)

    except ValueError as e:
        duration = time.time() - start
        logger.info(f"{node} - validation_error - {e} - duration={duration:.4f}s")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        duration = time.time() - start
        logger.exception(f"{node} - error - {e} - duration={duration:.4f}s")
        raise HTTPException(status_code=500, detail="internal MCP error")


class ClassAnalysisRequest(BaseModel):
    limit: int = Field(default=100, description="Max students to fetch")


class ClassAnalysisResponse(BaseModel):
    students: list = Field(description="List of student documents with key fields")
    count: int = Field(description="Number of students returned")


@app.post("/class_analysis", response_model=ClassAnalysisResponse)
def class_analysis_endpoint(req: ClassAnalysisRequest):
    start = time.time()
    node = "Mongo MCP Class Analysis Node"
    try:
        logger.info(f"{node} - start - limit={req.limit}")

        if USE_REAL_DB and mongo_collection is not None:
            try:
                # Fetch limited students with key fields for analysis
                proj = {"_id": 1, "name": 1, "G1": 1, "G2": 1, "G3": 1, "studytime": 1, "absences": 1, "failures": 1}
                students = list(mongo_collection.find({}, proj).limit(req.limit))
                # Convert ObjectId to string
                for s in students:
                    s["_id"] = str(s["_id"])
                count = len(students)
                duration = time.time() - start
                logger.info(f"{node} - success - count={count} - duration={duration:.4f}s")
                return ClassAnalysisResponse(students=students, count=count)
            except Exception as e:
                duration = time.time() - start
                logger.exception(f"{node} - db_error - {e} - duration={duration:.4f}s")
                raise HTTPException(status_code=500, detail="internal MCP DB error")

        # Fallback: return mock DB
        students = [{"_id": k, **v} for k, v in MOCK_DB.items()]
        duration = time.time() - start
        logger.info(f"{node} - success (mock) - count={len(students)} - duration={duration:.4f}s")
        return ClassAnalysisResponse(students=students, count=len(students))

    except Exception as e:
        duration = time.time() - start
        logger.exception(f"{node} - error - {e} - duration={duration:.4f}s")
        raise HTTPException(status_code=500, detail="internal MCP error")

