FROM python:3.9-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
RUN pip install fastapi uvicorn psycopg2-binary pydantic

COPY main.py .

CMD ["python", "main.py"]
