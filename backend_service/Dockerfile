FROM python:3.9-bookworm

WORKDIR /app

# Install system dependencies for psycopg2
# Install system dependencies including MS ODBC Driver for SQL Server
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    curl \
    gnupg2 \
    apt-transport-https \
    unixodbc-dev \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=amd64,arm64,armhf signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
RUN pip install fastapi uvicorn psycopg2-binary pydantic sqlalchemy pymysql cryptography pyodbc

COPY main.py .

CMD ["python", "main.py"]
