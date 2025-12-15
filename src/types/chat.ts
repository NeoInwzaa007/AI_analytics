export type MessageType = 'text' | 'chart';

export interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    type: MessageType;
    chartData?: Record<string, unknown>[];
    chartConfig?: Record<string, unknown>; // For flexibility
    timestamp: Date;
}
