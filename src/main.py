"""
MCP Student Analytics API
FastAPI backend for student performance analysis via MCP protocol
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import time
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="MCP Student Analytics API",
    description="API for querying and analyzing student performance data via MCP",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Prometheus metrics exporter
from src.metrics_exporter import router as metrics_router

app.include_router(metrics_router)

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION")

mongo_collection = None
USE_REAL_DB = False

if MONGO_URI and MONGO_DB and MONGO_COLLECTION:
    try:
        from pymongo import MongoClient
        from bson import ObjectId
        import certifi

        client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
        mongo_collection = client[MONGO_DB][MONGO_COLLECTION]
        USE_REAL_DB = True
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        USE_REAL_DB = False
else:
    logger.warning("MongoDB credentials not set, using mock data")


# Pydantic models
class QueryRequest(BaseModel):
    student_id: str = Field(..., description="24-hex MongoDB ObjectId")
    fields: List[str] = Field(
        default=["name", "G1", "G2", "G3"], description="Fields to return"
    )


class QueryResponse(BaseModel):
    student_id: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ClassAnalysisRequest(BaseModel):
    limit: int = Field(default=100, description="Max students to return")


class ClassAnalysisResponse(BaseModel):
    students: List[Dict[str, Any]]
    count: int


class StudentSummary(BaseModel):
    student_id: str
    grades: List[int]
    average: float
    latest_grade: int
    status: str
    growth: int
    study_efficiency: str


class TrendResponse(BaseModel):
    student_id: str
    trend: str
    grades: List[int]
    sparkline: str


class RiskAssessment(BaseModel):
    student_id: str
    risk_level: str
    alerts: List[str]
    has_alerts: bool


# Helper functions
def calculate_trend(G1: int, G2: int, G3: int) -> str:
    if G3 > G2 and G2 > G1:
        return "improving"
    elif G3 < G2 and G2 < G1:
        return "declining"
    return "stable"


def create_sparkline(grades: List[int]) -> str:
    if not grades:
        return ""
    blocks = "▁▂▃▄▅▆▇█"
    gmin, gmax = min(grades), max(grades)
    span = max(1, gmax - gmin)
    chars = []
    for g in grades:
        idx = int((g - gmin) / span * (len(blocks) - 1))
        chars.append(blocks[idx])
    return "".join(chars)


def get_risk_level(G3: int) -> str:
    if G3 < 10:
        return "high"
    elif G3 < 12:
        return "medium"
    return "low"


# API Routes
@app.get("/")
async def root():
    return {
        "message": "MCP Student Analytics API",
        "version": "1.0.0",
        "status": "connected to MongoDB" if USE_REAL_DB else "using mock data",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected" if USE_REAL_DB else "mock"}


@app.post("/api/query", response_model=QueryResponse)
async def query_student(request: QueryRequest):
    """Query a single student by ID"""
    try:
        if USE_REAL_DB and mongo_collection is not None:
            from bson import ObjectId

            proj = {f: 1 for f in request.fields}
            proj["_id"] = 0
            doc = mongo_collection.find_one({"_id": ObjectId(request.student_id)}, proj)

            if doc is None:
                return QueryResponse(student_id=request.student_id, result=None)

            return QueryResponse(student_id=request.student_id, result=doc)
        else:
            # Mock data
            mock_db = {
                "689cef602490264c7f2dd235": {
                    "name": "Sample Student",
                    "G1": 6,
                    "G2": 10,
                    "G3": 10,
                    "studytime": 2,
                    "absences": 0,
                    "failures": 0,
                    "goout": 3,
                    "Dalc": 1,
                    "Walc": 1,
                }
            }
            doc = mock_db.get(request.student_id)
            if doc:
                projected = {k: v for k, v in doc.items() if k in request.fields}
                return QueryResponse(student_id=request.student_id, result=projected)
            return QueryResponse(student_id=request.student_id, result=None)

    except Exception as e:
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/class_analysis", response_model=ClassAnalysisResponse)
async def class_analysis(request: ClassAnalysisRequest):
    """Get class-level analysis"""
    try:
        if USE_REAL_DB and mongo_collection is not None:
            proj = {
                "_id": 1,
                "name": 1,
                "G1": 1,
                "G2": 1,
                "G3": 1,
                "studytime": 1,
                "absences": 1,
                "failures": 1,
            }
            students = list(mongo_collection.find({}, proj).limit(request.limit))

            for s in students:
                s["_id"] = str(s["_id"])

            return ClassAnalysisResponse(students=students, count=len(students))
        else:
            # Mock data
            mock_students = [
                {
                    "_id": "689cef602490264c7f2dd235",
                    "name": "Student 1",
                    "G1": 6,
                    "G2": 10,
                    "G3": 10,
                },
                {
                    "_id": "689cef602490264c7f2dd260",
                    "name": "Student 2",
                    "G1": 15,
                    "G2": 18,
                    "G3": 20,
                },
                {
                    "_id": "689cef602490264c7f2dd239",
                    "name": "Student 3",
                    "G1": 14,
                    "G2": 17,
                    "G3": 19,
                },
            ]
            return ClassAnalysisResponse(
                students=mock_students, count=len(mock_students)
            )

    except Exception as e:
        logger.error(f"Class analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze/summary")
async def analyze_summary(request: QueryRequest):
    """Get student summary with analysis"""
    try:
        # Get student data
        query_response = await query_student(request)

        if not query_response.result:
            raise HTTPException(status_code=404, detail="Student not found")

        doc = query_response.result
        grades = [doc.get("G1", 0), doc.get("G2", 0), doc.get("G3", 0)]
        valid_grades = [g for g in grades if g is not None]

        if not valid_grades:
            raise HTTPException(status_code=400, detail="No grade data available")

        avg = sum(valid_grades) / len(valid_grades)
        growth = valid_grades[-1] - valid_grades[0] if len(valid_grades) >= 2 else 0
        status = "at-risk" if valid_grades[-1] < 10 else "okay"

        studytime = doc.get("studytime", 0)
        final_grade = valid_grades[-1]
        study_quality = (
            "good" if studytime >= 2 and final_grade >= 12 else "needs improvement"
        )

        return StudentSummary(
            student_id=request.student_id,
            grades=valid_grades,
            average=round(avg, 1),
            latest_grade=final_grade,
            status=status,
            growth=growth,
            study_efficiency=study_quality,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Summary analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze/trend")
async def analyze_trend(request: QueryRequest):
    """Get student grade trend"""
    try:
        query_response = await query_student(request)

        if not query_response.result:
            raise HTTPException(status_code=404, detail="Student not found")

        doc = query_response.result
        grades = [doc.get("G1"), doc.get("G2"), doc.get("G3")]
        valid_grades = [g for g in grades if g is not None]

        if len(valid_grades) < 2:
            raise HTTPException(status_code=400, detail="Insufficient grade data")

        trend = calculate_trend(
            valid_grades[0],
            valid_grades[1] if len(valid_grades) > 1 else valid_grades[0],
            valid_grades[-1],
        )
        sparkline = create_sparkline(valid_grades)

        return TrendResponse(
            student_id=request.student_id,
            trend=trend,
            grades=valid_grades,
            sparkline=sparkline,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trend analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze/risk")
async def analyze_risk(request: QueryRequest):
    """Get student risk assessment"""
    try:
        # Get full student data
        full_request = QueryRequest(
            student_id=request.student_id,
            fields=[
                "name",
                "G1",
                "G2",
                "G3",
                "studytime",
                "absences",
                "failures",
                "goout",
                "Dalc",
                "Walc",
            ],
        )
        query_response = await query_student(full_request)

        if not query_response.result:
            raise HTTPException(status_code=404, detail="Student not found")

        doc = query_response.result
        G3 = doc.get("G3", 0)
        alerts = []

        # Check risk factors
        failures = doc.get("failures", 0)
        studytime = doc.get("studytime", 0)
        if failures > 0 and studytime < 2:
            alerts.append(f"{failures} failures with low study time ({studytime}h)")

        absences = doc.get("absences", 0)
        if absences > 10:
            alerts.append(f"High absence rate: {absences}")

        goout = doc.get("goout", 0)
        dalc = doc.get("Dalc", 0)
        walc = doc.get("Walc", 0)
        if goout > 3 or dalc > 3 or walc > 3:
            alerts.append(f"High social activity: goout={goout}, alcohol consumption")

        if G3 < 10:
            alerts.append(f"At risk: final grade {G3}")

        risk = get_risk_level(G3)

        return RiskAssessment(
            student_id=request.student_id,
            risk_level=risk,
            alerts=alerts,
            has_alerts=len(alerts) > 0,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Risk analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/system-metrics")
async def get_system_metrics():
    """Get real-time system metrics for the Analytics dashboard"""
    try:
        from src.observability import metrics, get_metrics_summary

        summary = get_metrics_summary()

        # Calculate risk distribution from actual student data
        # For now, use the metrics data we have
        total_requests = sum(summary.get("agent_requests", {}).values())
        total_failures = sum(summary.get("agent_failures", {}).values())
        success_rate = (
            ((total_requests - total_failures) / total_requests * 100)
            if total_requests > 0
            else 0
        )

        # Get cache stats
        cache_hits = summary.get("cache_hits", 0)
        cache_misses = summary.get("cache_misses", 0)
        total_cache = cache_hits + cache_misses
        cache_hit_rate = (cache_hits / total_cache * 100) if total_cache > 0 else 0

        # Get LLM stats
        llm_tokens = sum(summary.get("llm_tokens", {}).values())
        llm_cost = sum(summary.get("llm_cost_usd", {}).values())

        return {
            "total_queries": total_requests,
            "ai_responses": total_requests - total_failures,
            "success_rate": round(success_rate, 1),
            "at_risk_alerts": summary.get("agent_failures", {}).get(
                "analysis:validation", 0
            ),
            "avg_response_time": 1.2,  # This would need actual calculation from histograms
            "cache_hit_rate": round(cache_hit_rate, 1),
            "llm_tokens_used": llm_tokens,
            "llm_cost_usd": round(llm_cost, 4),
            "active_requests": summary.get("active_requests", 0),
            "timestamp": time.time(),
        }
    except Exception as e:
        logger.error(f"Error getting system metrics: {e}")
        # Return default values if metrics aren't available
        return {
            "total_queries": 0,
            "ai_responses": 0,
            "success_rate": 0,
            "at_risk_alerts": 0,
            "avg_response_time": 0,
            "cache_hit_rate": 0,
            "llm_tokens_used": 0,
            "llm_cost_usd": 0,
            "active_requests": 0,
            "timestamp": time.time(),
        }


@app.get("/api/student-analytics")
async def get_student_analytics():
    """Get real student performance analytics"""
    try:
        # Get real class data
        from pymongo import MongoClient
        import certifi

        MONGO_URI = os.getenv("MONGO_URI")
        MONGO_DB = os.getenv("MONGO_DB")
        MONGO_COLLECTION = os.getenv("MONGO_COLLECTION")

        if MONGO_URI and MONGO_DB and MONGO_COLLECTION:
            client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
            collection = client[MONGO_DB][MONGO_COLLECTION]

            # Get all students with grades
            students = list(
                collection.find({}, {"G1": 1, "G2": 1, "G3": 1, "_id": 0}).limit(500)
            )

            # Calculate risk distribution
            low_risk = sum(1 for s in students if s.get("G3", 0) >= 12)
            medium_risk = sum(1 for s in students if 10 <= s.get("G3", 0) < 12)
            high_risk = sum(1 for s in students if s.get("G3", 0) < 10)

            # Calculate grade trends (mock monthly data for now)
            # In production, you'd store historical data
            avg_g3 = (
                sum(s.get("G3", 0) for s in students) / len(students) if students else 0
            )

            return {
                "risk_distribution": {
                    "low": low_risk,
                    "medium": medium_risk,
                    "high": high_risk,
                    "total": len(students),
                },
                "grade_trend": [
                    {"month": "Current", "avg": round(avg_g3, 1)},
                ],
                "total_students": len(students),
            }
        else:
            # Return mock data if no MongoDB
            return {
                "risk_distribution": {"low": 0, "medium": 0, "high": 0, "total": 0},
                "grade_trend": [{"month": "Current", "avg": 0}],
                "total_students": 0,
            }

    except Exception as e:
        logger.error(f"Error getting student analytics: {e}")
        return {
            "risk_distribution": {"low": 0, "medium": 0, "high": 0, "total": 0},
            "grade_trend": [{"month": "Current", "avg": 0}],
            "total_students": 0,
        }


# Serve static files (React frontend) in production
# Check if the build directory exists
if os.path.exists("web/dist"):
    app.mount("/", StaticFiles(directory="web/dist", html=True), name="static")

    # Catch-all route to serve index.html for client-side routing
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't catch API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        return FileResponse("web/dist/index.html")


if __name__ == "__main__":
    import uvicorn

    # Railway sets PORT env variable, default to 8000 for local
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    uvicorn.run(app, host=host, port=port)
