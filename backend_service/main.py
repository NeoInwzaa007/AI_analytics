from fastapi import FastAPI, HTTPException, Header, Request, Depends
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Database Configuration
DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("DB_NAME", "n8n_data")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "password")
API_KEY = os.getenv("API_KEY", "my-secret-api-key")

class UserData(BaseModel):
    name: str
    email: str

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
