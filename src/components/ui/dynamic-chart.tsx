'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
    Cell,
    AreaChart,
    Area,
    Brush
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart as BarChartIcon, Table as TableIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, Activity, ChartNoAxesCombined } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------

type ChartDataPoint = Record<string, string | number | null>;

interface ChartConfig {
    chart_type: 'bar' | 'line' | 'pie' | 'area';
    x: string;
    y: string;
    title?: string;
    description?: string;
}

interface ChartMeta {
    primary?: ChartConfig;
    candidates?: ChartConfig[];
    // Legacy support
    chart_type?: 'bar' | 'line' | 'pie' | 'area';
    x?: string;
    y?: string;
    title?: string;
}

export interface DynamicChartProps {
    chart: {
        raw: ChartDataPoint[]; // Strict typing
        chart_meta: ChartMeta;
    };
    isLoading?: boolean; // New Loading State
}

// ----------------------------------------------------------------------
// Utility Functions (Pure)
// ----------------------------------------------------------------------

const COLORS = ['#22d3ee', '#e879f9', '#4ade80', '#fbbf24', '#f472b6', '#a78bfa'];

const aggregateData = (data: ChartDataPoint[], type: string, xKey: string, yKey: string): ChartDataPoint[] => {
    if (!data || data.length === 0) return [];

    // Aggregation for Bar and Pie (Categorical)
    if ((type === 'bar' || type === 'pie') && data.length > 20) {
        // Sort descending by value (yKey)
        const sorted = [...data].sort((a, b) => {
            const valA = typeof a[yKey] === 'number' ? (a[yKey] as number) : 0;
            const valB = typeof b[yKey] === 'number' ? (b[yKey] as number) : 0;
            return valB - valA;
        });

        const top15 = sorted.slice(0, 15);
        const others = sorted.slice(15);

        if (others.length > 0) {
            const otherSum = others.reduce((sum, item) => {
                const val = typeof item[yKey] === 'number' ? (item[yKey] as number) : 0;
                return sum + val;
            }, 0);

            // Create "Others" item
            const otherItem: ChartDataPoint = {
                [xKey]: "Others",
                [yKey]: otherSum,
                // Preserve other keys relative to x/y if needed, but for 'Others' it's usually just the sum
            };
            return [...top15, otherItem];
        }
        return sorted;
    }

    // No aggregation for Time Series (Line/Area)
    return data;
};

const formatDate = (value: string | number | null): string => {
    if (!value) return '';
    const valStr = String(value);

    // 1. Handle YYYYMMDD
    if (/^\d{8}$/.test(valStr)) {
        const year = valStr.substring(0, 4);
        const month = valStr.substring(4, 6);
        const day = valStr.substring(6, 8);
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
            return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(date);
        }
    }

    // 2. Handle ISO Date
    const date = new Date(valStr);
    if (!isNaN(date.getTime()) && valStr.length > 4 && isNaN(Number(valStr))) {
        return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(date);
    }

    return valStr;
};

const formatYAxis = (val: number) => {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
};

// ----------------------------------------------------------------------
// Sub-Components (Memoized)
// ----------------------------------------------------------------------

const CustomXAxisTick = React.memo(({ x, y, payload }: any) => {
    if (!payload || (payload.value === undefined || payload.value === null)) return null;

    const originalValue = String(payload.value);
    const formattedValue = formatDate(originalValue);

    const displayLabel = formattedValue.length > 12
        ? `${formattedValue.slice(0, 7)}...${formattedValue.slice(-3)}`
        : formattedValue;

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={12}
                textAnchor="end"
                fill="#888888"
                transform="rotate(-45)"
                style={{ fontSize: '11px', fontWeight: 500 }}
            >
                {displayLabel}
            </text>
        </g>
    );
});
CustomXAxisTick.displayName = 'CustomXAxisTick';

const CustomTooltip = React.memo(({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-border p-3 rounded-lg shadow-xl animate-in fade-in zoom-in-95 z-50">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.payload.fill || data.color }} />
                    <span className="text-sm font-medium text-foreground">{data.name}</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                    {typeof data.value === 'number'
                        ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(data.value)
                        : data.value}
                </div>
            </div>
        );
    }
    return null;
});
CustomTooltip.displayName = 'CustomTooltip';

const ChartSkeleton = () => (
    <div className="w-full h-[350px] flex items-center justify-center bg-muted/10 rounded-lg animate-pulse">
        <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
            <Activity className="h-10 w-10 opacity-50" />
            <span className="text-sm font-medium">Loading visualization...</span>
        </div>
    </div>
);

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------

export const DynamicChart = React.memo(function DynamicChart({ chart, isLoading = false }: DynamicChartProps) {
    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
    const [selectedType, setSelectedType] = useState<string>('bar');

    // Reset selectedType when chart meta changes
    useEffect(() => {
        const newDefault = chart.chart_meta?.primary?.chart_type || chart.chart_meta?.chart_type || 'bar';
        setSelectedType(newDefault);
    }, [chart.chart_meta]);

    // 1. Strict Data Source
    const rawData = useMemo(() => Array.isArray(chart.raw) ? chart.raw : [], [chart.raw]);

    // Helper to get effective config
    const getEffectiveConfig = (): ChartConfig | null => {
        const meta = chart.chart_meta;
        // 1. Check Primary
        if (meta?.primary && meta.primary.chart_type === selectedType) return meta.primary;
        // 2. Check Candidates
        if (meta?.candidates) {
            const candidate = meta.candidates.find(c => c.chart_type === selectedType);
            if (candidate) return candidate;
        }
        // 3. Fallback to Primary
        if (meta?.primary) return meta.primary;
        // 4. Legacy Support
        if (meta?.chart_type) {
            return {
                chart_type: meta.chart_type,
                x: meta.x!,
                y: meta.y!,
                title: meta.title
            };
        }
        return null;
    };

    const config = getEffectiveConfig();
    const chart_type = config?.chart_type || 'bar';
    const xKey = config?.x || '';
    const yKey = config?.y || '';
    const title = config?.title;

    // Process data with memoization
    const processedData = useMemo(() => {
        if (!config) return [];
        return aggregateData(rawData, chart_type, xKey, yKey);
    }, [rawData, config, chart_type, xKey, yKey]);

    // Determine available types for switcher
    const availableTypes = useMemo(() => {
        const meta = chart.chart_meta;
        const types = new Set<string>();
        if (meta?.primary) types.add(meta.primary.chart_type);
        if (meta?.candidates) meta.candidates.forEach(c => types.add(c.chart_type));
        if (!meta?.primary && meta?.chart_type) types.add(meta.chart_type);
        return Array.from(types);
    }, [chart.chart_meta]);

    // 2. Loading State
    if (isLoading) {
        return (
            <Card className="w-full mt-4 bg-card border-border shadow-sm">
                <CardHeader>
                    <div className="h-6 w-1/3 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                    <ChartSkeleton />
                </CardContent>
            </Card>
        );
    }

    // 3. Error/Empty Config State
    if (!config || !config.chart_type) {
        return (
            <Card className="w-full mt-4 border-dashed">
                <CardContent className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                    <ChartNoAxesCombined className="h-10 w-10 mb-2 opacity-50" />
                    <span>No chart configuration available</span>
                </CardContent>
            </Card>
        );
    }

    const getIconForType = (type: string) => {
        switch (type) {
            case 'bar': return <BarChartIcon className="h-4 w-4" />;
            case 'line': return <LineChartIcon className="h-4 w-4" />;
            case 'pie': return <PieChartIcon className="h-4 w-4" />;
            case 'area': return <Activity className="h-4 w-4" />;
            default: return <BarChartIcon className="h-4 w-4" />;
        }
    };

    // ----------------------------------------------------------------------
    // Render Functions
    // ----------------------------------------------------------------------

    const renderChart = () => {
        if (!processedData || processedData.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Activity className="h-8 w-8 mb-2 opacity-50" />
                    No data to display
                </div>
            );
        }

        const CommonAxisProps = {
            className: "text-xs",
            axisLine: false,
            tickLine: false,
        };

        const renderContent = () => {
            switch (chart_type) {
                case 'bar':
                    return (
                        <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey={xKey} {...CommonAxisProps} tick={<CustomXAxisTick />} height={70} interval="preserveStartEnd" minTickGap={15} />
                            <YAxis {...CommonAxisProps} tickFormatter={formatYAxis} tick={{ fill: '#888888' }} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Bar dataKey={yKey} fill="#22d3ee" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    );
                case 'line':
                    return (
                        <LineChart data={processedData} margin={{ top: 20, right: 40, left: 20, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey={xKey} {...CommonAxisProps} tick={<CustomXAxisTick />} height={70} interval="preserveStartEnd" minTickGap={15} />
                            <YAxis {...CommonAxisProps} tickFormatter={formatYAxis} tick={{ fill: '#888888' }} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Line type="monotone" dataKey={yKey} stroke="#22d3ee" strokeWidth={2} dot={processedData.length > 30 ? false : { fill: '#22d3ee', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                            {processedData.length > 20 && (
                                <Brush dataKey={xKey} height={30} stroke="#888888" tickFormatter={(val) => formatDate(val.toString())} className="text-xs" />
                            )}
                        </LineChart>
                    );
                case 'area':
                    return (
                        <AreaChart data={processedData} margin={{ top: 20, right: 40, left: 20, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey={xKey} {...CommonAxisProps} tick={<CustomXAxisTick />} height={70} interval="preserveStartEnd" minTickGap={15} />
                            <YAxis {...CommonAxisProps} tickFormatter={formatYAxis} tick={{ fill: '#888888' }} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Area type="monotone" dataKey={yKey} stroke="#22d3ee" fillOpacity={1} fill="url(#colorArea)">
                                <defs>
                                    <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                            </Area>
                            {processedData.length > 20 && (
                                <Brush dataKey={xKey} height={30} stroke="#888888" tickFormatter={(val) => formatDate(val.toString())} className="text-xs" />
                            )}
                        </AreaChart>
                    );
                case 'pie':
                    return (
                        <PieChart>
                            <Pie data={processedData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey={yKey} nameKey={xKey}>
                                {processedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    );
                default:
                    return (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Unsupported chart type: {chart_type}
                        </div>
                    );
            }
        };

        return (
            <div className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    {renderContent()}
                </ResponsiveContainer>
            </div>
        );
    };

    const renderTable = () => {
        if (!rawData || rawData.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                    <TableIcon className="h-8 w-8 mb-2 opacity-50" />
                    No data available
                </div>
            );
        }

        const safeHeaders = [xKey, yKey].filter(Boolean);
        const displayData = rawData.slice(0, 100);

        return (
            <div className="flex flex-col h-full">
                <ScrollArea className="flex-1 w-full border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {safeHeaders.map((header) => (
                                    <TableHead key={header} className="whitespace-nowrap">{header}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayData.map((row, i) => (
                                <TableRow key={i}>
                                    {safeHeaders.map((header) => (
                                        <TableCell key={`${i}-${header}`} className="whitespace-nowrap font-mono text-xs">
                                            {row[header]?.toString() || '-'}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                {rawData.length > 100 && (
                    <div className="text-xs text-muted-foreground mt-2 text-center">
                        Showing first 100 rows of {rawData.length}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card className="w-full mt-4 bg-card border-border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col space-y-1">
                    <CardTitle className="text-lg font-medium">{title || "Visualization"}</CardTitle>
                </div>

                <div className="flex items-center gap-2">
                    {/* Chart Type Switcher */}
                    {availableTypes.length > 1 && viewMode === 'chart' && (
                        <div className="flex items-center space-x-1 bg-muted/50 p-1 rounded-lg mr-2">
                            {availableTypes.map((type) => (
                                <Button
                                    key={type}
                                    variant={selectedType === type ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setSelectedType(type)}
                                    title={`Switch to ${type} chart`}
                                >
                                    {getIconForType(type)}
                                </Button>
                            ))}
                        </div>
                    )}

                    {/* View Mode Switcher */}
                    <div className="flex items-center space-x-1 bg-muted/50 p-1 rounded-lg">
                        <Button
                            variant={viewMode === 'chart' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode('chart')}
                            title="Chart View"
                        >
                            <ChartNoAxesCombined className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode('table')}
                            title="Table View"
                        >
                            <TableIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="w-full" style={{ height: '350px' }}>
                    {viewMode === 'chart' ? renderChart() : renderTable()}
                </div>
            </CardContent>
        </Card>
    );
});
