'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Message } from '@/types/chat';
import { sendMessageToN8n } from '@/lib/api';
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ChatView() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'ai',
            content: 'สวัสดีฉันชื่อดวงพรมีอะไรให้ผมช่วยไหมคะ',
            type: 'text',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessageContent = inputValue.trim();
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userMessageContent,
            type: 'text',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await sendMessageToN8n(userMessageContent);

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response.answer,
                type: response.chartType || 'text',
                chartData: response.chartData,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to connect to AI Service");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Header */}
            <div className="flex flex-col space-y-2 p-4 md:p-6 md:pb-2">
                <h2 className="text-xl md:text-3xl font-bold tracking-tight text-foreground">Chat Query</h2>
                <p className="text-sm md:text-base text-muted-foreground">Ask questions and analyze your data with AI.</p>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4 md:p-6 pt-0 md:pt-4">
                <div className="max-w-4xl mx-auto space-y-6 pb-20">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex gap-3 md:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <Avatar className={`h-8 w-8 md:h-10 md:w-10 border ${message.role === 'ai' ? 'bg-primary border-primary' : 'bg-secondary border-secondary'}`}>
                                <AvatarFallback className="text-primary-foreground bg-transparent">
                                    {message.role === 'ai' ? <Bot size={16} className="md:w-5 md:h-5 text-primary-foreground" /> : <User size={16} className="md:w-5 md:h-5 text-secondary-foreground" />}
                                </AvatarFallback>
                            </Avatar>

                            <div className={`flex flex-col max-w-[85%] md:max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2 md:px-5 md:py-3 rounded-2xl shadow-sm ${message.role === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                    : 'bg-muted text-foreground border border-border rounded-tl-sm'
                                    }`}>
                                    <p className="leading-relaxed text-sm lg:text-base whitespace-pre-wrap">{message.content}</p>
                                </div>

                                {message.type === 'chart' && message.chartData && (
                                    <Card className="mt-4 w-full h-[250px] md:h-[350px] bg-card border-border text-card-foreground overflow-hidden">
                                        <CardContent className="h-full w-full p-2 md:p-4 md:pt-6">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={message.chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#888888" vertical={false} opacity={0.3} />
                                                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                                        itemStyle={{ color: 'var(--foreground)' }}
                                                        cursor={{ fill: 'var(--muted)' }}
                                                    />
                                                    <Bar dataKey="value" fill="currentColor" className="fill-primary" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                )}

                                <span className="text-[10px] md:text-xs text-muted-foreground mt-1 px-1" suppressHydrationWarning>
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-3 md:gap-4 flex-row">
                            <Avatar className="h-8 w-8 md:h-10 md:w-10 border bg-primary border-primary">
                                <AvatarFallback className="text-primary-foreground bg-transparent"><Bot size={16} className="md:w-5 md:h-5" /></AvatarFallback>
                            </Avatar>
                            <div className="flex items-center space-x-2 bg-muted px-4 py-3 rounded-2xl rounded-tl-sm border border-border text-muted-foreground">
                                <div className="h-2 w-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="h-2 w-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="h-2 w-2 bg-foreground/40 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <div className="p-3 md:p-4 bg-background/80 backdrop-blur-md border-t border-border absolute bottom-0 w-full z-10">
                <div className="max-w-4xl mx-auto flex gap-2 md:gap-3 items-center">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask..."
                        disabled={isLoading}
                        className="flex-1 bg-muted border-border focus-visible:ring-primary text-foreground text-sm md:text-base disabled:opacity-50"
                    />
                    <Button onClick={handleSend} disabled={isLoading} size="icon" className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 h-10 w-10 disabled:opacity-50">
                        <Send className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
