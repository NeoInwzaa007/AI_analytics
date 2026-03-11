'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Message } from '@/types/chat';
import { DynamicChart } from '@/components/ui/dynamic-chart';

const extractChartData = (response: any) => {
    if (!response) return null;

    // Case 1: Nested in 'data' array (The current structure)
    if (Array.isArray(response.data) && response.data.length > 0) {
        const item = response.data[0];
        if (item.chart_meta && item.raw) {
            return { chart_meta: item.chart_meta, raw: item.raw };
        }
    }

    // Case 2: Direct root object (Alternative structure)
    if (response.chart_meta && response.raw) {
        return { chart_meta: response.chart_meta, raw: response.raw };
    }

    // Case 3: Nested in 'chart' object
    if (response.chart && response.chart.chart_meta) {
        return { chart_meta: response.chart.chart_meta, raw: response.chart.raw };
    }

    // Case 4: Legacy/Mock structure (fallback for compatibility with existing mocks if they don't match strict)
    // The current INITIAL_MESSAGES mock has { type, title, xKey, yKey, data }.
    // We should adapt this to the strict structure if possible, or assume the mock will be updated.
    // But dynamic-chart is STRICT now. So we must adapt.
    if (response.xKey && response.yKey && response.data) {
        return {
            raw: response.data,
            chart_meta: {
                chart_type: response.type || 'bar',
                x: response.xKey,
                y: response.yKey,
                title: response.title
            }
        };
    }

    return null;
};

const INITIAL_MESSAGES: Message[] = [
    {
        id: '1',
        role: 'ai',
        content: 'Hello! I am your AI Business Analyst. Ask me anything about your sales data.',
        type: 'text',
        timestamp: new Date('2024-01-01T09:00:00')
    },
    {
        id: '2',
        role: 'user',
        content: 'Show me the sales performance for the last quarter.',
        type: 'text',
        timestamp: new Date('2024-01-01T09:01:00')
    },
    {
        id: '3',
        role: 'ai',
        content: 'Here is the sales performance breakdown by product category for Q4. We saw a 20% uptake in Subscription Pro.',
        type: 'chart',
        chart: {
            data: [
                { name: 'Basic', sales: 4000 },
                { name: 'Pro', sales: 3000 },
                { name: 'Enterprise', sales: 2000 },
                { name: 'Add-ons', sales: 2780 },
            ],
            // Adapting mock to new strict structure (simulated via helper or direct)
            // But let's use the helper's Case 4 for this.
            type: 'bar',
            title: 'Q4 Sales Performance',
            xKey: 'name',
            yKey: 'sales',
        },
        timestamp: new Date('2024-01-01T09:01:05')
    }
];

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = () => {
        if (!inputValue.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            type: 'text',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setInputValue('');

        // Simulate AI response
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "I'm processing your request... (This is a mock response)",
                type: 'text',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
        }, 1000);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4 md:p-6">
                <div className="max-w-4xl mx-auto space-y-6 pb-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex gap-3 md:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {/* Avatar - Smaller on mobile */}
                            <Avatar className={`h-8 w-8 md:h-10 md:w-10 border ${message.role === 'ai' ? 'bg-blue-600 border-blue-600' : 'bg-neutral-700 border-neutral-600'}`}>
                                <AvatarFallback className="text-white bg-transparent">
                                    {message.role === 'ai' ? <Bot size={16} className="md:w-5 md:h-5" /> : <User size={16} className="md:w-5 md:h-5" />}
                                </AvatarFallback>
                            </Avatar>

                            {/* Content */}
                            <div className={`flex flex-col max-w-[85%] md:max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>

                                {/* Text Bubble: Only render if NO chart is present, or if it's a user message */}
                                {(!message.chart || message.role === 'user') && (
                                    <div className={`px-4 py-2 md:px-5 md:py-3 rounded-2xl shadow-sm ${message.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-neutral-800 text-neutral-100 border border-neutral-700 rounded-tl-sm'
                                        }`}>
                                        <p className="leading-relaxed text-sm lg:text-base whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                )}

                                {/* Chart Render */}
                                {message.type === 'chart' && message.chart && (
                                    <DynamicChart chart={extractChartData(message.chart) || { raw: [], chart_meta: { chart_type: 'bar', x: '', y: '' } }} />
                                )}

                                <span
                                    className="text-[10px] md:text-xs text-neutral-500 mt-1 px-1"
                                    suppressHydrationWarning
                                >
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-3 md:p-4 bg-neutral-950 border-t border-neutral-800 w-full z-10">
                <div className="max-w-4xl mx-auto flex gap-2 md:gap-3 items-center">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask insights..."
                        className="flex-1 bg-neutral-900 border-neutral-800 focus-visible:ring-blue-600 text-neutral-100 text-sm md:text-base"
                    />
                    <Button onClick={handleSend} size="icon" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 h-10 w-10">
                        <Send className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
