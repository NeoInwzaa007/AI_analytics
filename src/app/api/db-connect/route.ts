
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Prepare payload for backend
        // Note: Frontend uses 'dbType' but backend expects 'type'
        // 'dbName' -> 'database'
        // 'username' -> 'user'
        const backendPayload = {
            type: body.type || body.dbType,
            connectionName: body.connectionName,
            host: body.host,
            port: body.port,
            database: body.database || body.dbName,
            user: body.user || body.username,
            password: body.password
        };

        // URL Construction
        const startUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL;
        if (!startUrl) {
            console.error('BACKEND_API_URL or NEXT_PUBLIC_API_URL is not defined');
            return NextResponse.json({ error: 'Server Configuration Error: API URL missing' }, { status: 500 });
        }
        // Remove trailing slash if present to avoid double slashes
        const baseUrl = startUrl.replace(/\/$/, '');
        // Append path if not already part of the env var (heuristic check)
        // If the env var ends in 'connect', assume it is the full path.
        const backendUrl = baseUrl.endsWith('connect')
            ? baseUrl
            : `${baseUrl}/connections/connect`;

        const apiKey = process.env.API_SECRET_KEY;

        console.log("------------------------------------------");
        console.log("Gateway Request Debug:");
        console.log("Backend URL:", backendUrl);
        console.log("Payload:", JSON.stringify(backendPayload, null, 2));

        if (!apiKey) {
            console.error('API_SECRET_KEY is not defined');
            return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
        }

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify(backendPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend Error:', response.status, errorText);

            // Try to parse upstream as JSON to extract detail, else fallback to string
            let errorMsg = `Backend failed: ${response.statusText}`;
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.detail) errorMsg = errorJson.detail;
            } catch (e) {
                // Not JSON, continue with text
            }

            return NextResponse.json(
                { error: errorMsg, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Backend returns: { status: 'success', id: <number>, schema: { ... } }

        const rawSchema = data.schema;
        const adaptedSchema = Object.keys(rawSchema).map(tableName => ({
            table: tableName,
            columns: rawSchema[tableName].map((col: any) => `${col.column} (${col.type})`)
        }));

        return NextResponse.json({
            success: true,
            connectionId: data.id,
            schema: adaptedSchema
        });

    } catch (error) {
        console.error('Gateway Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        return NextResponse.json({
            status: "ok",
            message: "DB Connect API is accessible. Please use POST to interact with this endpoint."
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
