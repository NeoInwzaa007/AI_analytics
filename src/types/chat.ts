export type MessageType = 'text' | 'chart';

export interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    type: MessageType;
    chartData?: any[];
    chartConfig?: any; // For flexibility
    timestamp: Date;
}
