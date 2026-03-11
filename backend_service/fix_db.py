import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Get config using same defaults as main.py
DB_HOST = os.getenv("DB_HOST", "localhost") # Default to localhost for running from host machine (user context)
# Check if we are inside docker (usually 'db' host) or outside. 
# User is running on Windows host, so 'db' hostname won't resolve unless in docker. 
# If running this script via 'python' in terminal, it might need 'localhost' and mapped port.
# But user said "checking response", implying the service is running. This script is best run ON THE CONTAINER.
# But 'run_command' runs on the user's host (Windows). 
# So DB_HOST should be localhost, assuming port 5432 is exposed.

DB_NAME = os.getenv("DB_NAME", "n8n_data")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "password")

print(f"Connecting to {DB_HOST}...")

try:
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    # Check if column exists
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url'")
    if cur.fetchone():
        print("Column 'avatar_url' ALREADY EXISTS.")
    else:
        print("Column 'avatar_url' MISSING. Adding it now...")
        cur.execute("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255)")
        print("Column 'avatar_url' ADDED SUCCESSFULLY.")
        
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
