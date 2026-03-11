from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from ..database import SessionLocal
from ..models import Connection
from ..schemas import SchemaResponse, TableSchema, ColumnSchema
from ..dependencies import get_db, verify_api_key
from ..security import decrypt_password
from typing import List, Dict

router = APIRouter(
    prefix="/api/connections",
    tags=["connections"],
    dependencies=[Depends(verify_api_key)]
)

@router.get("/{connection_id}/schema", response_model=SchemaResponse)
def get_connection_schema(connection_id: int, db: Session = Depends(get_db)):
    # 1. Fetch connection details
    connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # 2. Connect to target database
    target_engine = None
    try:
        db_pass = decrypt_password(connection.password)
        
        # Construct connection string
        db_type = connection.type
        url_obj = None

        if db_type == 'sqlite':
             url_obj =  f"sqlite:///{connection.database}" 
        else:
            from sqlalchemy.engine.url import URL
            query_args = {}
            drivername = 'postgresql' # default
            
            if db_type == 'postgresql':
                drivername = 'postgresql'
            elif db_type == 'mysql':
                drivername = 'mysql+pymysql'
            elif db_type == 'mssql':
                drivername = 'mssql+pyodbc'
                query_args = {
                    "driver": "ODBC Driver 18 for SQL Server",
                    "TrustServerCertificate": "yes"
                }
            elif db_type == 'sqlite': # handled above
                drivername = 'sqlite'
            else:
                 raise HTTPException(status_code=400, detail=f"Unsupported database type: {db_type}")

            url_obj = URL.create(
                drivername=drivername,
                username=connection.username,
                password=db_pass,
                host=connection.host,
                port=connection.port,
                database=connection.database,
                query=query_args
            )

        # Connect
        target_engine = create_engine(url_obj)
        
         # 3. Query Metadata
        with target_engine.connect() as target_conn:
            query = text("""
                SELECT
                    c.TABLE_SCHEMA,
                    c.TABLE_NAME,
                    c.COLUMN_NAME,
                    c.DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS c
                JOIN INFORMATION_SCHEMA.TABLES t
                  ON c.TABLE_SCHEMA = t.TABLE_SCHEMA
                 AND c.TABLE_NAME   = t.TABLE_NAME
                WHERE t.TABLE_TYPE = 'BASE TABLE'
                  AND c.TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
                ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION;
            """)

            result = target_conn.execute(query)
            rows = result.fetchall()

            tables_map: Dict[str, List[ColumnSchema]] = {}

            for row in rows:
                t_schema = row.TABLE_SCHEMA
                t_name = row.TABLE_NAME
                c_name = row.COLUMN_NAME
                d_type = row.DATA_TYPE

                full_table_name = f"{t_schema}.{t_name}"

                if full_table_name not in tables_map:
                    tables_map[full_table_name] = []

                tables_map[full_table_name].append(
                    ColumnSchema(name=c_name, type=str(d_type))
                )

            response_tables = [
                TableSchema(name=table, columns=cols)
                for table, cols in tables_map.items()
            ]

            return SchemaResponse(tables=response_tables)

    except HTTPException:
        raise
    except Exception as e:
        # Check for specific connection errors if possible
        error_str = str(e).lower()
        if "timeout" in error_str or "connection" in error_str or "could not connect" in error_str:
             raise HTTPException(status_code=400, detail="Could not connect to target database")
        
        print(f"Schema Fetch Error: {e}")
        raise HTTPException(status_code=400, detail="Could not connect to target database")
    finally:
        if target_engine:
            target_engine.dispose()
