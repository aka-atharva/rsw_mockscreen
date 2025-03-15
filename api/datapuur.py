from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import random
import uuid
from datetime import datetime, timedelta
import json
import csv
import os
import tempfile
import shutil
from pathlib import Path
import sqlalchemy
from sqlalchemy import create_engine, MetaData, Table, inspect

from .models import User, get_db
from .auth import get_current_active_user, has_role
from .data_models import DataSource, DataMetrics, Activity, DashboardData

# Router
router = APIRouter(prefix="/api/datapuur", tags=["datapuur"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory storage for uploaded files and their schemas
uploaded_files = {}

# Helper functions
def detect_csv_schema(file_path, chunk_size=1000):
    """Detect schema from a CSV file"""
    schema = {"name": Path(file_path).stem, "fields": []}
    field_types = {}
    sample_values = {}
    
    with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
        # Read header
        reader = csv.reader(csvfile)
        headers = next(reader)
        
        # Initialize field types dictionary
        for header in headers:
            field_types[header] = set()
            sample_values[header] = None
        
        # Process rows in chunks
        row_count = 0
        for row in reader:
            if row_count >= chunk_size:
                break
                
            for i, value in enumerate(row):
                if i < len(headers):
                    header = headers[i]
                    
                    # Store sample value if not already set
                    if sample_values[header] is None and value:
                        sample_values[header] = value
                    
                    # Detect type
                    if not value:
                        continue
                    
                    # Try to convert to different types
                    try:
                        int(value)
                        field_types[header].add("integer")
                        continue
                    except ValueError:
                        pass
                    
                    try:
                        float(value)
                        field_types[header].add("float")
                        continue
                    except ValueError:
                        pass
                    
                    if value.lower() in ('true', 'false'):
                        field_types[header].add("boolean")
                        continue
                    
                    # Try date formats
                    try:
                        datetime.strptime(value, '%Y-%m-%d')
                        field_types[header].add("date")
                        continue
                    except ValueError:
                        pass
                    
                    try:
                        datetime.strptime(value, '%Y-%m-%dT%H:%M:%S')
                        field_types[header].add("datetime")
                        continue
                    except ValueError:
                        pass
                    
                    # Default to string
                    field_types[header].add("string")
            
            row_count += 1
    
    # Determine final type for each field
    for header in headers:
        types = field_types[header]
        if "string" in types:
            field_type = "string"
        elif "datetime" in types:
            field_type = "datetime"
        elif "date" in types:
            field_type = "date"
        elif "boolean" in types:
            field_type = "boolean"
        elif "float" in types:
            field_type = "float"
        elif "integer" in types:
            field_type = "integer"
        else:
            field_type = "string"  # Default
        
        schema["fields"].append({
            "name": header,
            "type": field_type,
            "nullable": True,  # Assume nullable by default
            "sample": sample_values[header]
        })
    
    return schema

def detect_json_schema(file_path, chunk_size=1000):
    """Detect schema from a JSON file"""
    with open(file_path, 'r', encoding='utf-8') as jsonfile:
        try:
            data = json.load(jsonfile)
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON file")
    
    schema = {"name": Path(file_path).stem, "fields": []}
    
    # Handle array of objects
    if isinstance(data, list):
        if not data:
            return schema
        
        # Limit to chunk_size
        data = data[:chunk_size]
        
        # Use the first object to initialize field tracking
        first_obj = data[0]
        if not isinstance(first_obj, dict):
            schema["fields"].append({
                "name": "value",
                "type": get_json_type(first_obj),
                "nullable": False,
                "sample": first_obj
            })
            return schema
        
        field_types = {key: set() for key in first_obj.keys()}
        sample_values = {key: None for key in first_obj.keys()}
        
        # Process each object
        for obj in data:
            if not isinstance(obj, dict):
                continue
                
            for key, value in obj.items():
                if key in field_types:
                    field_types[key].add(get_json_type(value))
                    
                    # Store sample value if not already set
                    if sample_values[key] is None and value is not None:
                        sample_values[key] = value
        
        # Create schema fields
        for key in field_types:
            types = field_types[key]
            
            # Determine the most specific type
            if "object" in types:
                field_type = "object"
            elif "array" in types:
                field_type = "array"
            elif "string" in types:
                field_type = "string"
            elif "boolean" in types:
                field_type = "boolean"
            elif "float" in types:
                field_type = "float"
            elif "integer" in types:
                field_type = "integer"
            elif "null" in types:
                field_type = "null"
            else:
                field_type = "string"  # Default
            
            schema["fields"].append({
                "name": key,
                "type": field_type,
                "nullable": "null" in types,
                "sample": sample_values[key]
            })
    
    # Handle single object
    elif isinstance(data, dict):
        for key, value in data.items():
            schema["fields"].append({
                "name": key,
                "type": get_json_type(value),
                "nullable": value is None,
                "sample": value
            })
    
    return schema

def get_json_type(value):
    """Determine the JSON type of a value"""
    if value is None:
        return "null"
    elif isinstance(value, bool):
        return "boolean"
    elif isinstance(value, int):
        return "integer"
    elif isinstance(value, float):
        return "float"
    elif isinstance(value, str):
        # Check if it might be a date
        try:
            datetime.strptime(value, '%Y-%m-%d')
            return "date"
        except ValueError:
            pass
        
        try:
            datetime.strptime(value, '%Y-%m-%dT%H:%M:%S')
            return "datetime"
        except ValueError:
            pass
        
        return "string"
    elif isinstance(value, list):
        return "array"
    elif isinstance(value, dict):
        return "object"
    else:
        return "string"  # Default

def get_db_schema(db_type, config, chunk_size=1000):
    """Get schema from a database table"""
    connection_string = create_connection_string(db_type, config)
    
    try:
        engine = create_engine(connection_string)
        inspector = inspect(engine)
        
        # Check if table exists
        if config["table"] not in inspector.get_table_names():
            raise ValueError(f"Table '{config['table']}' not found in database")
        
        # Get table columns
        columns = inspector.get_columns(config["table"])
        
        # Get sample data
        with engine.connect() as connection:
            result = connection.execute(f"SELECT * FROM {config['table']} LIMIT 1").fetchone()
            sample_data = dict(result) if result else {}
        
        schema = {
            "name": config["table"],
            "fields": []
        }
        
        for column in columns:
            col_name = column["name"]
            col_type = str(column["type"]).lower()
            
            # Map SQL types to our schema types
            if "int" in col_type:
                field_type = "integer"
            elif "float" in col_type or "double" in col_type or "decimal" in col_type:
                field_type = "float"
            elif "bool" in col_type:
                field_type = "boolean"
            elif "date" in col_type and "time" in col_type:
                field_type = "datetime"
            elif "date" in col_type:
                field_type = "date"
            elif "json" in col_type:
                field_type = "object"
            else:
                field_type = "string"
            
            schema["fields"].append({
                "name": col_name,
                "type": field_type,
                "nullable": not column.get("nullable", True),
                "sample": sample_data.get(col_name) if col_name in sample_data else None
            })
        
        return schema
    
    except Exception as e:
        raise ValueError(f"Error connecting to database: {str(e)}")

def create_connection_string(db_type, config):
    """Create a database connection string"""
    if db_type == "mysql":
        return f"mysql+pymysql://{config['username']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}"
    elif db_type == "postgresql":
        return f"postgresql://{config['username']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}"
    elif db_type == "mssql":
        return f"mssql+pyodbc://{config['username']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}?driver=ODBC+Driver+17+for+SQL+Server"
    else:
        raise ValueError(f"Unsupported database type: {db_type}")

# API Routes
@router.post("/upload", status_code=status.HTTP_200_OK)
async def upload_file(
    file: UploadFile = File(...),
    chunkSize: int = Form(1000),
    current_user: User = Depends(has_role("researcher"))
):
    """Upload a file for data ingestion"""
    # Validate file type
    file_ext = file.filename.split('.')[-1].lower()
    if file_ext not in ['csv', 'json']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and JSON files are supported"
        )
    
    # Generate a unique file ID
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}.{file_ext}"
    
    # Save the file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )
    finally:
        file.file.close()
    
    # Store file info
    uploaded_files[file_id] = {
        "filename": file.filename,
        "path": str(file_path),
        "type": file_ext,
        "uploaded_by": current_user.username,
        "uploaded_at": datetime.now().isoformat(),
        "chunk_size": chunkSize
    }
    
    return {"file_id": file_id, "message": "File uploaded successfully"}

@router.get("/schema/{file_id}", status_code=status.HTTP_200_OK)
async def get_file_schema(
    file_id: str,
    current_user: User = Depends(has_role("researcher"))
):
    """Get schema for an uploaded file"""
    if file_id not in uploaded_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    file_info = uploaded_files[file_id]
    file_path = file_info["path"]
    chunk_size = file_info.get("chunk_size", 1000)
    
    try:
        if file_info["type"] == "csv":
            schema = detect_csv_schema(file_path, chunk_size)
        elif file_info["type"] == "json":
            schema = detect_json_schema(file_path, chunk_size)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type"
            )
        
        # Store schema in file info
        file_info["schema"] = schema
        uploaded_files[file_id] = file_info
        
        return {"schema": schema}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error detecting schema: {str(e)}"
        )

@router.post("/test-connection", status_code=status.HTTP_200_OK)
async def test_database_connection(
    connection_info: dict,
    current_user: User = Depends(has_role("researcher"))
):
    """Test a database connection"""
    try:
        db_type = connection_info.get("type")
        config = connection_info.get("config", {})
        
        # Validate required fields
        required_fields = ["host", "port", "database", "username"]
        for field in required_fields:
            if not config.get(field):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required field: {field}"
                )
        
        # Create connection string
        connection_string = create_connection_string(db_type, config)
        
        # Test connection
        engine = create_engine(connection_string)
        with engine.connect() as connection:
            # Just test the connection
            pass
        
        return {"message": "Connection successful"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Connection failed: {str(e)}"
        )

@router.post("/db-schema", status_code=status.HTTP_200_OK)
async def get_database_schema(
    connection_info: dict,
    current_user: User = Depends(has_role("researcher"))
):
    """Get schema from a database table"""
    try:
        db_type = connection_info.get("type")
        config = connection_info.get("config", {})
        chunk_size = connection_info.get("chunkSize", 1000)
        
        # Validate required fields
        required_fields = ["host", "port", "database", "username", "table"]
        for field in required_fields:
            if not config.get(field):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required field: {field}"
                )
        
        # Get schema
        schema = get_db_schema(db_type, config, chunk_size)
        
        return {"schema": schema}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error fetching schema: {str(e)}"
        )

# Add this new endpoint to the existing datapuur.py file

@router.get("/injection-history", response_model=List[dict])
async def get_injection_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(has_role("researcher"))
):
    """Get history of data injections for the current user"""
    # In a real implementation, this would query a database table
    # For now, we'll return mock data
    
    # Log the activity
    #log_activity(
    #    db=get_db(),
    #    username=current_user.username,
    #    action="View injection history",
    #    details=f"User viewed injection history"
    #)
    
    # Mock data
    history = [
        {
            "id": "1",
            "type": "file",
            "name": "customer_data.csv",
            "timestamp": (datetime.now() - timedelta(minutes=30)).isoformat(),
            "status": "success",
            "records": 1250,
            "user": current_user.username,
            "schema": {
                "name": "customer_data",
                "fields": [
                    {"name": "id", "type": "integer"},
                    {"name": "name", "type": "string"},
                    {"name": "email", "type": "string"},
                ]
            }
        },
        {
            "id": "2",
            "type": "database",
            "name": "products_table",
            "connection": "MySQL - products_db",
            "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
            "status": "success",
            "records": 532,
            "user": current_user.username,
            "schema": {
                "name": "products",
                "fields": [
                    {"name": "product_id", "type": "integer"},
                    {"name": "name", "type": "string"},
                    {"name": "price", "type": "float"},
                ]
            }
        },
        {
            "id": "3",
            "type": "file",
            "name": "transactions.json",
            "timestamp": (datetime.now() - timedelta(days=1)).isoformat(),
            "status": "error",
            "error": "Invalid JSON format",
            "user": current_user.username
        },
        {
            "id": "4",
            "type": "database",
            "name": "analytics_data",
            "connection": "PostgreSQL - analytics",
            "timestamp": (datetime.now() - timedelta(days=2)).isoformat(),
            "status": "success",
            "records": 10532,
            "user": current_user.username,
            "schema": {
                "name": "analytics",
                "fields": [
                    {"name": "date", "type": "date"},
                    {"name": "page_views", "type": "integer"},
                    {"name": "conversions", "type": "integer"},
                ]
            }
        }
    ]
    
    # Apply pagination
    paginated_history = history[offset:offset + limit]
    
    return paginated_history

# Original routes from the template
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

# Generate sample data (from original template)
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

