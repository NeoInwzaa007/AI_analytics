import { MessageType } from "@/types/chat";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://aianalytics-production.up.railway.app";

export const apiFetch = async (path: string, options?: RequestInit) => {
    return fetch(`${API_BASE}${path}`, options);
};

export interface N8nResponse {
    answer: string;
    chartType?: MessageType; // 'text' | 'chart'
    chartData?: Record<string, unknown>[];
}

export class ApiError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

export async function sendMessageToN8n(messageContent: string): Promise<N8nResponse> {
    const webhookUrl = `/api/chat`; // Forwarding to the API proxy still, wait no, this needs to specify the final destination if skipping Next.js proxy, or keep proxy. 
    // Requirement is ZERO requests to vercel.app/api.
    // So all fetches should hit the railway backend directly.
    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: messageContent }),
        });

        if (!response.ok) {
            let errorMessage = `Server error: ${response.statusText}`;
            try {
                const errorData = await response.json();
                console.error("API Proxy Error Details:", JSON.stringify(errorData, null, 2));
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
                if (errorData.details) {
                    errorMessage += ` - ${errorData.details}`;
                }
            } catch {
                // Could not parse JSON, use default
            }
            throw new ApiError(response.status, errorMessage);
        }

        const data = await response.json();

        // Basic validation of response structure could go here
        return {
            answer: data.answer || "Received response but no answer field found.",
            chartType: data.chartType === 'chart' ? 'chart' : 'text',
            chartData: data.chartData
        };

    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        console.error("Network or parsing error:", error);
        throw new Error('Network error: Failed to connect to AI service.');
    }
}
