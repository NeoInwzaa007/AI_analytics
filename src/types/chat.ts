import { ChartPayload } from '@/lib/chart-utils';

export type MessageType = 'text' | 'chart';

export interface ChatResponse {
    response: string;
    session_id: string; // UUID
    history: Message[];
    chart?: any; // Derived from response content if needed
}


export interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    type: MessageType;
    chart?: any; // Allow raw payload for defensive handling
    timestamp: Date;
}
