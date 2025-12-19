# Backend Service Documentation

This directory contains the Docker setup for the PostgreSQL database and FastAPI middleware.

## Setup Instructions

1.  **Navigate to the directory:**
    ```bash
    cd backend_service
    ```

2.  **Start the services:**
    ```bash
    docker-compose up -d --build
    ```

3.  **Verify running services:**
    ```bash
    docker-compose ps
    ```

## Connectivity Guide

### Internal Communication (Docker Network)
The FastAPI service (`api`) connects to the PostgreSQL database (`db`) using the hostname `db` and port `5432`. This is configured via environment variables in `docker-compose.yml`.

### External Access (N8n to Localhost)
For an external n8n server (running on a different company server/cloud) to reach your local API, you need to expose your local port `8000` to the internet.

**Recommended Tools:**

1.  **Cloudflare Tunnel (Best for production/security)**
    *   Install `cloudflared`.
    *   Run: `cloudflared tunnel --url http://localhost:8000`
    *   This will give you a public URL (e.g., `https://random-name.trycloudflare.com`) that tunnels to your local service.
    *   Use this URL in your n8n HTTP Request node: `https://random-name.trycloudflare.com/webhook`

2.  **Ngrok (Quickest for testing)**
    *   Install `ngrok`.
    *   Run: `ngrok http 8000`
    *   Copy the generated HTTPS URL (e.g., `https://1234abcd.ngrok-free.app`).
    *   Use this URL in n8n.

### API Details for N8n

*   **URL:** `YOUR_PUBLIC_TUNNEL_URL/webhook` (e.g., `https://.../webhook`)
*   **Method:** `POST`
*   **Headers:**
    *   `Content-Type`: `application/json`
    *   `X-API-Key`: `my-secret-api-key` (Change this in `docker-compose.yml` and n8n for security)
*   **Body (JSON):**
    ```json
    {
      "name": "John Doe",
      "email": "john@example.com"
    }
    ```

### Database Access (DBeaver)
*   **Host:** `localhost`
*   **Port:** `5432`
*   **Database:** `n8n_data`
*   **User:** `postgres`
*   **Password:** `password`

> **Note:** If you have another PostgreSQL instance running on port 5432 (like the one in the project root), you must stop it first (`docker-compose down` in the root folder) or change the port mapping in `backend_service/docker-compose.yml` (e.g., `"5433:5432"`).
