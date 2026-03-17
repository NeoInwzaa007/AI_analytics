import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { MessageSquare, Activity, Database, Clock } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DynamicChart } from "@/components/ui/dynamic-chart";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { extractChartData } from "@/lib/chart-utils";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";

interface DashboardStats {
    total_chats: number;
    chats_24h: number;
    total_messages: number;
    messages_24h: number;
    active_connections: number;
    recent_activity: {
        id: string;
        title: string;
        updated_at: string;
        user_email: string;
    }[];
}

interface ChartItem {
    id: string;
    session_title: string;
    created_at: string;
    chart_config: any;
}

export default function DashboardView() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [charts, setCharts] = useState<ChartItem[]>([]);
    const [selectedChartId, setSelectedChartId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const token = useAuthStore.getState().token;
            if (!token) return;

            try {
                // Fetch Stats
                console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
                const statsRes = await apiFetch(`/api/dashboard/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                } else {
                    console.error("Failed to fetch stats:", statsRes.status);
                    // Don't toast here to avoid potential double toast if both fail, or just silent optional fail
                }

                // Fetch Charts
                const chartsRes = await apiFetch(`/api/dashboard/charts`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (chartsRes.ok) {
                    const data = await chartsRes.json();
                    setCharts(data);
                    if (data.length > 0) {
                        setSelectedChartId(data[0].id);
                    }
                } else {
                    console.error("Failed to fetch charts:", chartsRes.status);
                }

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
                toast.error("Failed to load dashboard data. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const selectedChart = charts.find(c => c.id === selectedChartId);

    const StatCard = ({ title, icon: Icon, value, subtext, loading }: any) => (
        <Card className="bg-card border-border text-card-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                ) : (
                    <>
                        <div className="text-2xl font-bold">{value}</div>
                        <p className="text-xs text-muted-foreground">{subtext}</p>
                    </>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Chats"
                    icon={MessageSquare}
                    value={stats?.total_chats || 0}
                    subtext={`+${stats?.chats_24h || 0} in last 24h`}
                    loading={isLoading}
                />
                <StatCard
                    title="Total Messages"
                    icon={Activity}
                    value={stats?.total_messages || 0}
                    subtext={`+${stats?.messages_24h || 0} in last 24h`}
                    loading={isLoading}
                />
                <StatCard
                    title="Active DB Connections"
                    icon={Database}
                    value={stats?.active_connections || 0}
                    subtext="Connected sources"
                    loading={isLoading}
                />
                <StatCard
                    title="Usage Status"
                    icon={Clock}
                    value="Active"
                    subtext="System operational"
                    loading={isLoading}
                />
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-card border-border text-card-foreground">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Overview</CardTitle>
                        {isLoading ? (
                            <Skeleton className="h-10 w-[280px]" />
                        ) : (
                            charts.length > 0 && (
                                <Select value={selectedChartId} onValueChange={setSelectedChartId}>
                                    <SelectTrigger className="w-[280px]">
                                        <SelectValue placeholder="Select a chart" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {charts.map((chart) => (
                                            <SelectItem key={chart.id} value={chart.id}>
                                                {chart.session_title} - {new Date(chart.created_at).toLocaleString()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )
                        )}
                    </CardHeader>
                    <CardContent className="pl-2">
                        {isLoading ? (
                            <DynamicChart chart={{ raw: [], chart_meta: {} }} isLoading={true} />
                        ) : selectedChart ? (
                            <DynamicChart chart={extractChartData(selectedChart.chart_config)} isLoading={false} />
                        ) : (
                            <div className="h-[200px] w-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-md">
                                <p>No charts generated yet.</p>
                                <p className="text-sm">Ask the AI to analyze data and visualize it!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-3 bg-card border-border text-card-foreground">
                    <CardHeader>
                        <CardTitle>Recent Chat Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center">
                                        <Skeleton className="h-9 w-9 rounded-full" />
                                        <div className="ml-4 space-y-1">
                                            <Skeleton className="h-4 w-[150px]" />
                                            <Skeleton className="h-3 w-[100px]" />
                                        </div>
                                    </div>
                                ))
                            ) : stats?.recent_activity.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                            ) : (
                                stats?.recent_activity.map((session) => (
                                    <div key={session.id} className="flex items-center">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src="/avatars/01.png" alt="Avatar" />
                                            <AvatarFallback>{session.title.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none truncate max-w-[180px]">{session.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(session.updated_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
