'use client';

import React, { memo } from 'react';
import { Bot, User } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DynamicChart } from "@/components/ui/dynamic-chart";
import { Message } from '@/types/chat';

interface ChatMessageProps {
    message: Message;
}

import { extractChartData } from '@/lib/chart-utils';

const ChatMessage = memo(({ message }: ChatMessageProps) => {
    return (
        <div
            className={`flex gap-3 md:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
        >
            <Avatar className={`h-8 w-8 md:h-10 md:w-10 border ${message.role === 'ai' ? 'bg-primary border-primary' : 'bg-secondary border-secondary'}`}>
                <AvatarFallback className="text-primary-foreground bg-transparent">
                    {message.role === 'ai' ? <Bot size={16} className="md:w-5 md:h-5 text-primary-foreground" /> : <User size={16} className="md:w-5 md:h-5 text-secondary-foreground" />}
                </AvatarFallback>
            </Avatar>

            <div className={`flex flex-col max-w-[85%] md:max-w-[80%] ${message.role === 'user' ? 'items-end' : (message.chart ? 'w-full' : 'items-start')}`}>
                {/* Text Bubble: Only render if NO chart is present, or if it's a user message */}
                {(!message.chart || message.role === 'user') && (
                    <div className={`px-4 py-2 md:px-5 md:py-3 rounded-2xl shadow-sm ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground border border-border rounded-tl-sm'
                        }`}>
                        <p className="leading-relaxed text-sm lg:text-base whitespace-pre-wrap">{message.content || "No response content"}</p>
                    </div>
                )}

                {message.type === 'chart' && message.chart && (
                    <div className="w-full mt-2" style={{ minHeight: '400px' }}>
                        <DynamicChart chart={extractChartData(message.chart) || { raw: [], chart_meta: { chart_type: 'bar', x: '', y: '' } }} />
                    </div>
                )}

                <span className="text-[10px] md:text-xs text-muted-foreground mt-1 px-1" suppressHydrationWarning>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
