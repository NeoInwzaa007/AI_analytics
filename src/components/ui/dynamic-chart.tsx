'use client';

import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeChartPayload, isValidChartConfig, ChartPayload } from '@/lib/chart-utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Table as TableIcon } from 'lucide-react';

interface DynamicChartProps {
    chart: any; // Accept raw config for defensive handling
}

const COLORS = ['#22d3ee', '#e879f9', '#4ade80', '#fbbf24'];

export function DynamicChart({ chart: rawConfig }: DynamicChartProps) {
    // 1. Normalize
    const config = useMemo(() => normalizeChartPayload(rawConfig), [rawConfig]);

    // Internal state for switching types
    const [activeType, setActiveType] = React.useState<string>('bar');

    // Sync state with config prop when it changes
    React.useEffect(() => {
        if (config?.type) {
            setActiveType(config.type);
        }
    }, [config]);

    // 2. Defensive Checks
    if (!config) {
        return null;
    }

    const { title, data } = config;

    // Helper to resolve keys safely
    const resolveKey = (key?: string) => key || '';

    const renderContent = () => {
        // Fallback or explicit Table
        if (activeType === 'table') {
            if (!data || data.length === 0) return <p className="text-muted-foreground p-4">No data available</p>;
            const headers = Object.keys(data[0]);
            return (
                <ScrollArea className="h-[300px] w-full rounded-md border">
                    <div className="w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    {headers.map((header) => (
                                        <th key={header} className="h-12 px-4 align-middle font-medium text-muted-foreground whitespace-nowrap">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {data.map((row, i) => (
                                    <tr key={i} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        {headers.map((header) => (
                                            <td key={`${i}-${header}`} className="p-4 align-middle whitespace-nowrap">
                                                {row[header]?.toString() || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ScrollArea>
            );
        }

        switch (activeType) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey={resolveKey(config.xKey)}
                                className="text-xs"
                                tick={{ fill: '#e5e7eb' }}
                            />
                            <YAxis
                                className="text-xs"
                                tick={{ fill: '#e5e7eb' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    borderColor: '#374151',
                                    color: '#fff'
                                }}
                            />
                            <Legend />
                            <Bar dataKey={resolveKey(config.yKey)} fill="#ffffffff" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey={resolveKey(config.xKey)}
                                className="text-xs"
                                tick={{ fill: '#e5e7eb' }}
                            />
                            <YAxis
                                className="text-xs"
                                tick={{ fill: '#e5e7eb' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    borderColor: '#374151',
                                    color: '#fff'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey={resolveKey(config.yKey)}
                                stroke="#ffffffff"
                                strokeWidth={2}
                                dot={{ fill: 'hsl(var(--background))', stroke: '#ffffffff', strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                // Pie supports separate label/value keys OR re-using x/y keys
                const nameKey = resolveKey(config.labelKey || config.xKey);
                const dataKey = resolveKey(config.valueKey || config.yKey);

                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent || 0) * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey={dataKey}
                                nameKey={nameKey}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    borderColor: '#374151',
                                    color: '#fff'
                                }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );

            default:
                return <div className="p-4 text-center text-muted-foreground">Unsupported visualization</div>;
        }
    };

    return (
        <Card className="w-full mt-4 bg-muted/40 border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-medium">{title || "Data Visualization"}</CardTitle>
                <Tabs value={activeType} onValueChange={setActiveType} className="w-auto">
                    <TabsList>
                        <TabsTrigger value="bar" title="Bar Chart"><BarChart3 className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="line" title="Line Chart"><LineChartIcon className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="pie" title="Pie Chart"><PieChartIcon className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="table" title="Table View"><TableIcon className="h-4 w-4" /></TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                {renderContent()}
            </CardContent>
        </Card>
    );
}
