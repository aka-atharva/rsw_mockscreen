from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import random
import uuid
from datetime import datetime, timedelta

from .models import User, get_db
from .auth import get_current_active_user, has_role
from .data_models import DataSource, DataMetrics, Activity, DashboardData

# Router
router = APIRouter(prefix="/api/datapuur", tags=["datapuur"])

# Generate sample data
def generate_data_sources():
    return [
        DataSource(
            id=str(uuid.uuid4()),
            name=f"Source {i}",
            type=random.choice(["Database", "API", "File", "Stream"]),
            last_updated=(datetime.now() - timedelta(hours=random.randint(1, 48))).strftime("%Y-%m-%d %H:%M:%S"),
            status=random.choice(["Active", "Inactive", "Processing", "Error"])
        )
        for i in range(1, 6)
    ]

def generate_data_metrics():
    return DataMetrics(
        total_records=random.randint(10000, 50000),
        processed_records=random.randint(5000, 10000),
        failed_records=random.randint(10, 500),
        processing_time=round(random.uniform(0.5, 10.0), 2)
    )

def generate_activities():
    return [
        Activity(
            id=str(uuid.uuid4()),
            action=random.choice([
                "Data import completed", 
                "Transformation started", 
                "Export scheduled", 
                "Data validation failed",
                "Pipeline executed",
                "Source connected"
            ]),
            time=(datetime.now() - timedelta(minutes=random.randint(5, 1440))).strftime("%Y-%m-%d %H:%M:%S"),
            status=random.choice(["success", "processing", "pending", "error"])
        )
        for _ in range(10)
    ]

# API Routes
@router.get("/sources", response_model=List[DataSource])
async def get_data_sources(current_user: User = Depends(has_role("researcher"))):
    return generate_data_sources()

@router.get("/metrics", response_model=DataMetrics)
async def get_data_metrics(current_user: User = Depends(has_role("researcher"))):
    return generate_data_metrics()

@router.get("/activities", response_model=List[Activity])
async def get_activities(current_user: User = Depends(has_role("researcher"))):
    # Sort activities by time (most recent first)
    activities = generate_activities()
    sorted_activities = sorted(
        activities, 
        key=lambda x: datetime.strptime(x.time, "%Y-%m-%d %H:%M:%S"), 
        reverse=True
    )
    return sorted_activities

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard_data(current_user: User = Depends(has_role("researcher"))):
    # Generate random data for charts
    chart_data = {
        "bar_chart": [random.randint(30, 80) for _ in range(7)],
        "pie_chart": [
            {"label": "Type A", "value": 45, "color": "#8B5CF6"},
            {"label": "Type B", "value": 30, "color": "#EC4899"},
            {"label": "Type C", "value": 15, "color": "#3B82F6"},
            {"label": "Type D", "value": 10, "color": "#10B981"}
        ],
        "line_chart": {
            "current": [random.randint(30, 70) for _ in range(6)],
            "previous": [random.randint(30, 70) for _ in range(6)]
        }
    }
    
    metrics = generate_data_metrics()
    activities = generate_activities()
    
    return {
        "metrics": metrics.dict(),
        "recent_activities": [a.dict() for a in sorted(
            activities, 
            key=lambda x: datetime.strptime(x.time, "%Y-%m-%d %H:%M:%S"), 
            reverse=True
        )[:4]],
        "chart_data": chart_data
    }

