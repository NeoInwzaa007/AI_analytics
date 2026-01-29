
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { connectionId, sql } = body;

        if (!connectionId || !sql) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        let startUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';

        // Heuristic to fix accidentally pasting the full connect URL into the env var
        if (startUrl.includes('/connections/connect')) {
            startUrl = startUrl.replace(/\/connections\/connect\/?$/, '');
        }

        const baseUrl = startUrl.replace(/\/$/, '');
        const backendUrl = `${baseUrl}/execute-sql`;

        console.log("------------------------------------------");
        console.log("SQL Exec Request Debug:");
        console.log("Target Backend URL:", backendUrl);
        const apiKey = process.env.API_SECRET_KEY;

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
            body: JSON.stringify({
                connection_id: connectionId,
                sql_query: sql
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                return NextResponse.json({ error: errorJson.detail || response.statusText }, { status: response.status });
            } catch {
                return NextResponse.json({ error: errorText }, { status: response.status });
            }
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('SQL Execution Gateway Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
