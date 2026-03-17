import { NextResponse, NextRequest } from 'next/server';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const connectionId = id;

        if (!connectionId) {
            return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
        }

        const startUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL;
        if (!startUrl) {
            console.error('BACKEND_API_URL or NEXT_PUBLIC_API_URL is not defined');
            return NextResponse.json({ error: 'Server Configuration Error: API URL missing' }, { status: 500 });
        }
        const baseUrl = startUrl.replace(/\/$/, '');
        // Backend router has prefix /api/connections
        const backendUrl = `${baseUrl}/api/connections/${connectionId}/schema`;

        const apiKey = process.env.API_SECRET_KEY;

        if (!apiKey) {
            console.error('API_SECRET_KEY is not defined');
            return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
        }

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend Schema Fetch Error:', response.status, errorText);
            return NextResponse.json(
                { error: `Backend failed: ${response.statusText}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Gateway Schema Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
