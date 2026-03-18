from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import timedelta
import logging
from pydantic import BaseModel

from src.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from src.database import engine  # Assuming engine is available globally, but we use get_db_connection

# Re-use the get_db_connection pattern from main.py
import os
DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("DB_NAME", "n8n_data")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "password")

def get_db_connection():
    try:
        database_url = os.getenv("DATABASE_URL")
        if database_url:
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

logger = logging.getLogger(__name__)

router = APIRouter()

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

@router.post("/api/auth/register")
def register_user(user: UserRegister):
    print("REGISTER HIT")
    print(f"INPUT: {user.model_dump() if hasattr(user, 'model_dump') else user.dict()}")
    
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Check if email exists
        cur.execute("SELECT id FROM users WHERE email = %s", (user.email,))
        if cur.fetchone():
            return JSONResponse(status_code=400, content={"status": "error", "message": "Email already registered"})

        # Hash password
        hashed_password = get_password_hash(user.password)

        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash'")
        if not cur.fetchone():
             logger.info("Adding password_hash column to users table")
             cur.execute("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)")
        
        insert_query = """
        INSERT INTO users (name, email, password_hash)
        VALUES (%s, %s, %s)
        RETURNING id;
        """
        cur.execute(insert_query, (user.name, user.email, hashed_password))
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()

        return JSONResponse(status_code=200, content={"status": "success", "data": {"id": new_id}, "message": "User registered successfully"})

    except psycopg2.Error as e:
        print("DB ERROR:", str(e))
        logger.error(f"Register DB Error: {e}")
        if conn: conn.rollback()
        return JSONResponse(status_code=500, content={"status": "error", "message": f"Database error: {str(e)}"})
    except Exception as e:
        print("GENERAL ERROR:", str(e))
        logger.error(f"Register Error: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        if conn: conn.close()

@router.post("/api/auth/login", response_model=Token)
def login_user(user: UserLogin):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("SELECT id, name, email, password_hash, avatar_url FROM users WHERE email = %s", (user.email,))
        db_user = cur.fetchone()
        cur.close()

        if not db_user:
            raise HTTPException(status_code=400, detail="Incorrect email or password")
            
        if not db_user['password_hash']:
             raise HTTPException(status_code=400, detail="User has no password set. Please contact admin.")

        if not verify_password(user.password, db_user['password_hash']):
            raise HTTPException(status_code=400, detail="Incorrect email or password")

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(db_user['id']), "email": db_user['email']},
            expires_delta=access_token_expires
        )

        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "user": {
                "id": db_user['id'],
                "name": db_user['name'],
                "email": db_user['email'],
                "avatar_url": db_user.get('avatar_url')
            }
        }

    except psycopg2.Error as e:
        logger.error(f"Login DB Error: {e}")
        raise HTTPException(status_code=500, detail="Database error during login")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn: conn.close()
