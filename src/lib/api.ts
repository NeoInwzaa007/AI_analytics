import { MessageType } from "@/types/chat";

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
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

    if (!webhookUrl) {
        throw new Error('Configuration Error: NEXT_PUBLIC_N8N_WEBHOOK_URL is missing.');
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: messageContent }),
        });

        if (!response.ok) {
            throw new ApiError(response.status, `Server error: ${response.statusText}`);
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
