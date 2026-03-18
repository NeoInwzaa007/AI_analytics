from dotenv import load_dotenv
import pathlib
import os

# Load .env.local from project root (parent of backend_service)
# We do this BEFORE other imports so they see the env vars
env_path = pathlib.Path(__file__).parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, HTTPException, Header, Request, Depends
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import uvicorn
import logging
import re
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session
from typing import Optional, List
import src.dependencies
from datetime import datetime, timedelta
from src.routers import connections
from src.security import (
    encrypt_password, 
    decrypt_password, 
    verify_password, 
    get_password_hash, 
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from src.dependencies import verify_api_key


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all for now
    allow_credentials=True,
    allow_methods=["*"],  # CRITICAL for OPTIONS
    allow_headers=["*"],
)
from src.routers import chat
from src.database import engine
from src import models

# Create tables for chat system (Safe initialization)
try:
    models.Base.metadata.create_all(bind=engine)
    logger.info("Chat system tables initialized successfully.")
except Exception as e:
    logger.warning(f"Failed to initialize chat system tables, continuing startup. Error: {e}")

app.include_router(chat.router)
from src.routers import users
app.include_router(users.router)
from src.routers import dashboard
app.include_router(dashboard.router)
app.include_router(connections.router)

from src.routers import auth
app.include_router(auth.router)

@app.on_event("startup")
async def startup_event():
    try:
        logger.info("Checking database connection...")
        with engine.connect() as conn:
            # Check/Add avatar_url column
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url'"))
            if not result.fetchone():
                 logger.info("Adding avatar_url column to users table")
                 conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255)"))
                 conn.commit()
            pass
        logger.info("Database connection successful.")
    except Exception as e:
        logger.warning(f"Database connection failed, continuing startup. Error: {e}")

# Database Configuration
try:
    DB_HOST = os.getenv("DB_HOST", "db")
    DB_NAME = os.getenv("DB_NAME", "n8n_data")
    DB_USER = os.getenv("DB_USER", "postgres")
    # Critical secrets - should fail if missing in production, but we can leave defaults for dev if safe. 
    # User requested to put secrets in env, so we prioritize env.
    DB_PASS = os.getenv("DB_PASS") 
    API_KEY = os.getenv("API_KEY")

    if not DB_PASS or not API_KEY:
        logger.warning("DB_PASS or API_KEY not set in environment. Using unsafe defaults for dev only.")
        if not DB_PASS: DB_PASS = "password"
        if not API_KEY: API_KEY = "my-secret-api-key"

    # Auth Configuration - Managed in src/security.py
    # SECRET_KEY and pwd_context removed from here

except Exception as e:
    logger.error(f"Configuration Error: {e}")
    raise

class UserData(BaseModel):
    name: str 
    email: str

class QueryRequest(BaseModel):
    query: str

class ConnectionRequest(BaseModel):
    type: str  # postgresql, mysql, etc.
    connectionName: str
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    user: Optional[str] = None
    password: Optional[str] = None

class ConnectionResponse(BaseModel):
    id: int
    name: str
    type: str
    host: Optional[str]
    database: Optional[str]
    username: Optional[str]
    created_at: str

# Setup Encryption - Managed in src/security.py
# Auth Utils - Managed in src/security.py

def get_db_connection():
    try:
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            # Render postgres puts postgresql:// in the URL, psycopg2 supports this natively
            conn = psycopg2.connect(database_url)
        else:
            conn = psycopg2.connect(
                host=DB_HOST,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASS
            )
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection string failed")

# verify_api_key moved to src.dependencies

@app.get("/")
def read_root():
    return {"status": "ok", "service": "N8n Webhook Receiver"}

@app.post("/webhook", dependencies=[Depends(verify_api_key)])
async def receive_webhook(data: UserData):
    logger.info(f"Received data: {data}")
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        insert_query = """
        INSERT INTO users (name, email)
        VALUES (%s, %s)
        RETURNING id;
        """
        cur.execute(insert_query, (data.name, data.email))
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        
        logger.info(f"Inserted user with ID: {new_id}")
        return {"status": "success", "id": new_id, "received": data}
        
    except psycopg2.Error as e:
        logger.error(f"PostgreSQL Error: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.get("/schema", dependencies=[Depends(verify_api_key)])
def get_schema():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Query information_schema for public tables
        cur.execute("""
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            ORDER BY table_name, ordinal_position;
        """)
        rows = cur.fetchall()
        
        schema = {}
        for row in rows:
            table = row['table_name']
            if table not in schema:
                schema[table] = []
            schema[table].append({
                "column": row['column_name'],
                "type": row['data_type']
            })
            
        cur.close()
        return schema
        
    except Exception as e:
        logger.error(f"Schema Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.post("/query", dependencies=[Depends(verify_api_key)])
def run_query(request: QueryRequest):
    query = request.query.strip()
    
    # 1. READ-ONLY Check
    if not query.upper().startswith("SELECT"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed.")
    
    # 2. Block Mutating Keywords
    forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "GRANT", "REVOKE"]
    for word in forbidden:
        if re.search(r'\b' + word + r'\b', query, re.IGNORECASE):
             raise HTTPException(status_code=400, detail=f"Forbidden keyword detected: {word}")

    # 3. Enforce LIMIT
    if "LIMIT" not in query.upper():
        query += " LIMIT 100"

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(query)
        result = cur.fetchall()
        cur.close()
        return result
    except psycopg2.Error as e:
         raise HTTPException(status_code=400, detail=f"Database Error: {e}")
    except Exception as e:
        logger.error(f"Query Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@app.post("/connections/connect", dependencies=[Depends(verify_api_key)])
def test_and_save_connection(conn_data: ConnectionRequest, db: Session = Depends(src.dependencies.get_db)):
    """
    Test connection, save it if successful, and return schema + new ID.
    This validates the credentials AND persists them.
    """
    logger.info(f"Received connection test request: {conn_data.connectionName} ({conn_data.type})")
    
    target_engine = None
    try:
        # --- Step 1: Test Connection & Get Schema ---
        logger.info("Building connection string...")
        # Construct SQLAlchemy Connection String
        db_type = conn_data.type
        if db_type == 'postgresql':
            drivername = 'postgresql'
        elif db_type == 'mysql':
            drivername = 'mysql+pymysql'
        elif db_type == 'mssql':
            drivername = 'mssql+pyodbc'
        elif db_type == 'sqlite':
            drivername = 'sqlite'
        else:
             raise HTTPException(status_code=400, detail=f"Unsupported database type: {db_type}")

        if db_type == 'sqlite':
             url_obj =  f"sqlite:///{conn_data.database}" 
        else:
            from sqlalchemy.engine.url import URL
            query_args = {}
            if db_type == 'mssql':
                query_args = {
                    "driver": "ODBC Driver 18 for SQL Server",
                    "TrustServerCertificate": "yes"
                }

            url_obj = URL.create(
                drivername=drivername,
                username=conn_data.user,
                password=conn_data.password,
                host=conn_data.host,
                port=conn_data.port,
                database=conn_data.database,
                query=query_args
            )
        
        logger.info(f"Testing connection to {conn_data.host}:{conn_data.port}...")
        
        # Add timeout to prevent infinite hanging
        connect_args = {}
        if db_type == 'postgresql':
            connect_args = {'connect_timeout': 10}
        
        target_engine = create_engine(url_obj, connect_args=connect_args)
        
        # Force connection to verify credentials immediately
        with target_engine.connect() as conn:
            pass
            
        logger.info("Connection successful. Inspecting schema...")
        inspector = inspect(target_engine)
        
        schema = {}
        target_schema = 'public' if db_type == 'postgresql' else None
        
        table_names = inspector.get_table_names(schema=target_schema)
        for table_name in table_names:
            columns = []
            for column in inspector.get_columns(table_name, schema=target_schema):
                columns.append({
                    "column": column['name'],
                    "type": str(column['type'])
                })
            schema[table_name] = columns

        logger.info(f"Schema retrieved: {len(schema)} tables found.")

        # --- Step 2: Save Connection to DB ---
        logger.info("Saving connection to database...")
        encrypted_pass = encrypt_password(conn_data.password)
        
        new_connection = models.Connection(
            name=conn_data.connectionName,
            type=conn_data.type,
            host=conn_data.host,
            port=conn_data.port,
            database=conn_data.database,
            username=conn_data.user,
            password=encrypted_pass,
            status='active'
        )
        db.add(new_connection)
        db.commit()
        db.refresh(new_connection)
        
        logger.info(f"Connection saved with ID: {new_connection.id}")

        return {"status": "success", "id": new_connection.id, "schema": schema}
        
    except Exception as e:
        logger.error(f"Connection Test/Save Failed: {str(e)}")
        # Return clearer error message
        error_msg = str(e)
        if "timeout" in error_msg.lower():
            error_msg = "Connection timed out. Check host/port."
        elif "password" in error_msg.lower():
            error_msg = "Authentication failed. Check username/password."
        elif "database" in error_msg.lower():
            error_msg = "Database not found or access denied."
            
        raise HTTPException(status_code=400, detail=f"Connection failed: {error_msg}")
    finally:
        if target_engine:
            target_engine.dispose()

class ExecuteSQLRequest(BaseModel):
    connection_id: int
    sql_query: str

@app.post("/execute-sql", dependencies=[Depends(verify_api_key)])
def execute_sql(request: ExecuteSQLRequest):
    conn = None
    target_conn = None
    engine = None
    
    try:
        # 1. Fetch Connection Details
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM connections WHERE id = %s", (request.connection_id,))
        connection_info = cur.fetchone()
        cur.close()
        
        if not connection_info:
            raise HTTPException(status_code=404, detail="Connection not found")
            
        # 2. Decrypt Password
        db_pass = decrypt_password(connection_info['password'])
        
        # 3. Connect to Target DB
        db_type = connection_info['type']
        
        # Security: Basic check to prevent dangerous keywords if needed, 
        # but "Arbitrary SQL" usually implies full power. 
        # For this task, we allow it but relying on the user's DB permissions.
        
        if db_type == 'postgresql':
            drivername = 'postgresql'
        elif db_type == 'mysql':
            drivername = 'mysql+pymysql'
        elif db_type == 'mssql':
            drivername = 'mssql+pyodbc'
        elif db_type == 'sqlite':
            drivername = 'sqlite'
        else:
             raise HTTPException(status_code=400, detail=f"Unsupported database type: {db_type}")

        if db_type == 'sqlite':
             url_obj =  f"sqlite:///{connection_info['database']}" 
        else:
            from sqlalchemy.engine.url import URL
            query_args = {}
            if db_type == 'mssql':
                query_args = {
                    "driver": "ODBC Driver 18 for SQL Server",
                    "TrustServerCertificate": "yes"
                }

            url_obj = URL.create(
                drivername=drivername,
                username=connection_info['username'],
                password=db_pass,
                host=connection_info['host'],
                port=connection_info['port'],
                database=connection_info['database'],
                query=query_args
            )
            
        engine = create_engine(url_obj)
        
        # 4. Execute Query
        with engine.connect() as target_conn:
            result = target_conn.execute(text(request.sql_query))
            
            # handle non-select queries (no rows)
            if not result.returns_rows:
                return {"status": "success", "message": "Query executed successfully", "rows": [], "columns": []}
                
            columns = list(result.keys())
            rows = [dict(row._mapping) for row in result.fetchall()]
            
            # Handle non-serializable types (datetime, decimal, etc)
            # Fast way: use pydantic json encoder or manual cast.
            # For simplicity, convert all to string if needed or rely on FastAPI jsonable_encoder
            
            return {
                "status": "success", 
                "columns": columns, 
                "rows": rows
            }

    except Exception as e:
        logger.error(f"Execute SQL Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if conn: conn.close()
        if engine: engine.dispose()

@app.post("/connections", dependencies=[Depends(verify_api_key)])
def save_connection(conn_data: ConnectionRequest):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        encrypted_pass = encrypt_password(conn_data.password)
        
        query = """
            INSERT INTO connections (name, type, host, port, database, username, password)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """
        cur.execute(query, (
            conn_data.connectionName,
            conn_data.type,
            conn_data.host,
            conn_data.port,
            conn_data.database,
            conn_data.user,
            encrypted_pass
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        return {"status": "success", "id": new_id}
    except Exception as e:
        logger.error(f"Save Connection Error: {e}")
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn: conn.close()

@app.get("/connections", dependencies=[Depends(verify_api_key)])
def list_connections():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT id, name, type, host, port, database, username, created_at FROM connections ORDER BY created_at DESC")
        rows = cur.fetchall()
        cur.close()
        return rows
    except Exception as e:
        logger.error(f"List Connections Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn: conn.close()

@app.get("/connections/{connection_id}", dependencies=[Depends(verify_api_key)])
def get_connection(connection_id: int):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT * FROM connections WHERE id = %s", (connection_id,))
        connection = cur.fetchone()
        cur.close()
        
        if not connection:
            raise HTTPException(status_code=404, detail="Connection not found")
            
        # Decrypt password so n8n can use it
        try:
            connection['password'] = decrypt_password(connection['password'])
        except Exception:
            # If decryption fails (e.g. key changed), return specific error to prompt re-connection
            raise HTTPException(
                status_code=400, 
                detail="Connection credentials validity expired (Encryption Key Rotated). Please edit and save connection again."
            )
        
        return connection
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get Connection Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
