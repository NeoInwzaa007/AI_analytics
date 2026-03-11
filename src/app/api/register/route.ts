import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        success: true,
        message: "Register API is working"
    });
}

export async function POST(req: Request) {
    try {
        const payload = await req.json();

        // Ensure we strictly avoid localhost fallbacks
        const baseUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL;
        if (!baseUrl) {
            console.error('BACKEND_API_URL or NEXT_PUBLIC_API_URL is not defined');
            return NextResponse.json({ success: false, message: 'Server Configuration Error: API URL missing' }, { status: 500 });
        }

        const backendUrl = `${baseUrl.replace(/\/$/, '')}/api/auth/register`;

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // Parse upstream response safely
        let data;
        const responseText = await response.text();
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Non-JSON Response from Backend Auth (/register): ", responseText);
            return NextResponse.json({ success: false, message: 'Backend returned an invalid, non-JSON response during registration.' }, { status: 502 });
        }

        if (!response.ok) {
            // Forward the exact error message that the FastAPI backend returned
            return NextResponse.json({ success: false, message: data.detail || data.message || 'Registration failed' }, { status: response.status });
        }

        return NextResponse.json({ success: true, ...data });
    } catch (error: any) {
        console.error("Register API proxy error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
