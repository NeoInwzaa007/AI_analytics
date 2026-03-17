'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, AlertCircle } from 'lucide-react';
import { apiFetch, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Message, ChatResponse } from '@/types/chat';
import { useConnectionStore } from "@/store/useConnectionStore";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/use-auth-store";
import { toast } from "sonner";
import ChatMessage from '@/components/chat-message';



export default function ChatView() {
    const { activeConnectionId, isConnected } = useConnectionStore();
    const { activeSessionId, setActiveSession } = useChatStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch History when activeSessionId changes
    useEffect(() => {
        const fetchHistory = async () => {
            if (!activeSessionId) {
                setMessages([]); // New chat
                return;
            }

            try {
                const token = useAuthStore.getState().token;
                console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
                const res = await apiFetch(`/api/chat/${activeSessionId}/history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const history = await res.json();
                    // Map backend history to frontend Message type
                    const formattedMessages: Message[] = history.map((msg: any) => {
                        let content = msg.content;
                        let chart = null;

                        if (msg.content_type === 'chart') {
                            try {
                                const parsed = JSON.parse(content);
                                content = parsed.message || parsed.text || content;
                                chart = parsed.chart;
                            } catch (e) {
                                console.error("Failed to parse history chart JSON", e);
                            }
                        }

                        return {
                            id: msg.id.toString(),
                            role: msg.role,
                            content: content,
                            type: msg.content_type || 'text',
                            chart: chart,
                            timestamp: new Date(msg.created_at)
                        };
                    });
                    setMessages(formattedMessages);
                }
            } catch (err) {
                console.error("Failed to load chat history", err);
                toast.error("Failed to load conversation history");
            }
        };

        fetchHistory();
    }, [activeSessionId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (isLoading) return;

        // Validation: Check for active connection
        if (!activeConnectionId) {
            toast.error("Please select a database connection first.");
            return;
        }

        if (!inputValue.trim()) return;

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
            const token = useAuthStore.getState().token;
            console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
            const response = await apiPost(`/api/chat`, {
                message: userMessageContent,
                connection_id: activeConnectionId,
                session_id: activeSessionId // Send active session ID if exists
            }, {
                'Authorization': `Bearer ${token}`
            });

            if (!response.ok) {
                if (response.status === 401) {
                    useAuthStore.getState().logout();
                    window.location.href = '/auth/login';
                    throw new Error("Session expired. Please log in again.");
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Server error: ${response.statusText}`);
            }

            const data: any = await response.json(); // Use any to access new content_type field if type def not updated yet

            // If new session started, update store
            if (data.session_id && data.session_id !== activeSessionId) {
                setActiveSession(data.session_id);
            }

            let aiContent = data.response;
            let aiChart = null;
            let aiType: 'text' | 'chart' = 'text';

            if (data.content_type === 'chart') {
                try {
                    const parsed = JSON.parse(aiContent);
                    // Handle wrapped structure: { message: "...", data: [...] }
                    aiContent = parsed.message || parsed.text || aiContent;

                    // Extract Chart Data from nested structure
                    // Target: data[0].chart_meta (Primary source)
                    // Fallback: chart_meta (Legacy)
                    if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
                        const chartData = parsed.data[0];
                        aiChart = {
                            chart_meta: chartData.chart_meta,
                            raw: chartData.raw
                        };
                    } else if (parsed.chart) {
                        // Legacy support
                        aiChart = parsed.chart;
                    }

                    aiType = 'chart';
                } catch (e) {
                    console.error("Failed to parse chart JSON", e);
                }
            }

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: aiContent || "No response content",
                type: aiType,
                chart: aiChart,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to connect to AI Service");
            // Remove optimistic message on error? Optional.
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Header */}
            <div className="flex flex-col space-y-2 p-4 md:p-6 md:pb-2 shrink-0">
                <h2 className="text-xl md:text-3xl font-bold tracking-tight text-foreground">Chat Query</h2>
                <p className="text-sm md:text-base text-muted-foreground">Ask questions and analyze your data with AI.</p>
            </div>

            {/* Chat Area */}
            <div className="flex-1 min-h-0 overflow-hidden relative font-sans">
                <ScrollArea className="h-full w-full p-4 md:p-6 pt-0 md:pt-4">
                    <div className="max-w-4xl mx-auto space-y-6 pb-20">
                        {messages.length === 0 && !isLoading && (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground opacity-50">
                                <Bot size={48} className="mb-4" />
                                <p>Start a new conversation...</p>
                            </div>
                        )}

                        {messages.map((message) => (
                            <ChatMessage key={message.id} message={message} />
                        ))}

                        {/* Loading State */}
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
            </div>

            <div className="px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border w-full z-10">
                <div className="max-w-4xl mx-auto flex gap-2 md:gap-3 items-end">
                    <Textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask..."
                        disabled={isLoading}
                        className="flex-1 min-h-[40px] max-h-[200px] resize-none bg-muted border-border focus-visible:ring-primary text-foreground text-sm md:text-base disabled:opacity-50"
                    />
                    <Button onClick={handleSend} disabled={isLoading} size="icon" className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 h-10 w-10 disabled:opacity-50 mb-0.5">
                        {isLoading ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Send className="h-4 w-4 md:h-5 md:w-5" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
