import { MessageType } from "@/types/chat";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://aianalytics-production.up.railway.app";

export const apiFetch = async (path: string, options?: RequestInit) => {
    return fetch(`${API_URL}${path}`, options);
};

export const apiPost = async (path: string, body: any, customHeaders?: Record<string, string>) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (customHeaders) {
        Object.assign(headers, customHeaders);
    }
    return fetch(`${API_URL}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });
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
        const response = await apiPost(`/api/chat`, { message: messageContent });

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

console.log("API BASE:", process.env.NEXT_PUBLIC_API_URL);