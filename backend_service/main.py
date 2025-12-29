from fastapi import FastAPI, HTTPException, Header, Request, Depends
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import uvicorn
import logging
import re
from sqlalchemy import create_engine, inspect, text
from cryptography.fernet import Fernet
from typing import Optional, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

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

# Setup Encryption
try:
    # Load key from environment (persistent) or generate new one (ephemeral)
    env_key = os.getenv("ENCRYPTION_KEY")
    if env_key:
        ENCRYPTION_KEY = env_key.encode() if isinstance(env_key, str) else env_key
    else:
        logger.warning("ENCRYPTION_KEY not found in env. Generating ephemeral key (passwords will be lost on restart).")
        ENCRYPTION_KEY = Fernet.generate_key()
    
    cipher_suite = Fernet(ENCRYPTION_KEY)
except Exception as e:
    logger.error(f"Encryption Key Error: {e}")
    # Fallback to prevent crash, but strictly this should be fatal in prod
    ENCRYPTION_KEY = Fernet.generate_key()
    cipher_suite = Fernet(ENCRYPTION_KEY)

def encrypt_password(password: str) -> str:
    if not password: return None
    return cipher_suite.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    if not encrypted_password: return None
    return cipher_suite.decrypt(encrypted_password.encode()).decode()

def get_db_connection():
    try:
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

async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return x_api_key

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
def test_and_get_schema(conn_data: ConnectionRequest):
    """
    Test connection and return schema.
    This validates the credentials.
    """
    engine = None
    try:
        # Construct SQLAlchemy Connection String
        # Connect and Inspect
        # Use URL.create to safely construct connection strings (handles escaping/special chars)
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
             url_obj =  f"sqlite:///{conn_data.database}" # SQLite is special case
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
        
        engine = create_engine(url_obj)
        inspector = inspect(engine)
        
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

        return {"status": "success", "schema": schema}
        
    except Exception as e:
        logger.error(f"Connection Test Failed: {e}")
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")
    finally:
        if engine:
            engine.dispose()

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
