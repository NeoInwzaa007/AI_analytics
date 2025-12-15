interface N8nResponse<T = unknown> {
    data: T | null;
    success: boolean;
    error?: string;
}

export async function fetchN8nData<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<N8nResponse<T>> {
    const baseUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    if (!baseUrl) {
        console.warn('NEXT_PUBLIC_N8N_WEBHOOK_URL is not defined');
        // For development, we might want to continue or fail. 
        // Throwing error might break UI, returning error is safer.
        return { data: null, success: false, error: 'Configuration Error: N8n URL missing' };
    }

    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            return { data: null, success: false, error: `HTTP Error: ${response.status}` };
        }

        const data = await response.json();
        return { data, success: true };
    } catch (error) {
        return { data: null, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
