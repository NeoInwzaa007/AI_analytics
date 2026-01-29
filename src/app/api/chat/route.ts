import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    let targetUrl = '';

    try {
        const body = await request.json();
        const { message, connection_id } = body;

        // Validation
        if (!message || !connection_id) {
            return NextResponse.json(
                { error: 'Missing required fields: message and connection_id' },
                { status: 400 }
            );
        }

        const webhookUrl = process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK;

        if (!webhookUrl) {
            console.error("DEBUG: Webhook URL is missing");
            return NextResponse.json(
                { error: 'Server Configuration Error: Chat Webhook URL missing', details: 'Check .env.local' },
                { status: 500 }
            );
        }

        // Fix Node.js 17+ localhost resolving to ::1 issues by forcing 127.0.0.1
        targetUrl = webhookUrl.replace('localhost', '127.0.0.1');
        console.log(`DEBUG: Proxying to ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message, connection_id }),
        });

        if (!response.ok) {
            // Try to read error text from upstream
            const errorText = await response.text();
            console.error(`DEBUG: Upstream error ${response.status}: ${errorText}`);
            return NextResponse.json(
                { error: `Upstream Error: ${response.status} ${response.statusText}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Proxy Error Full:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                details: error instanceof Error ? error.message : String(error),
                url: typeof targetUrl !== 'undefined' ? targetUrl : 'undefined'
            },
            { status: 500 }
        );
    }
}
