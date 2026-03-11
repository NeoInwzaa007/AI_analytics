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

import { normalizeChartPayload, isValidChartConfig, ChartPayload } from '@/lib/chart-utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Table as TableIcon } from 'lucide-react';

interface DynamicChartProps {
    chart: any; // Accept raw config for defensive handling
}

const COLORS = ['#22d3ee', '#e879f9', '#4ade80', '#fbbf24'];

const CustomXAxisTick = ({ x, y, payload }: any) => {
    const label = String(payload?.value ?? "");
    // Truncate logic: show first 7 chars ... last 4 chars if longer than 12
    const short = label.length > 12
        ? `${label.slice(0, 7)}…${label.slice(-4)}`
        : label;
    return (
        <g transform={`translate(${x},${y})`}>
            <text
                dy={16}
                textAnchor="end"
                transform="rotate(-30)"
                style={{ fill: "#cbd5e1", fontSize: 11, fontWeight: 500 }}
            >
                {short}
            </text>
        </g>
    );
};

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

    // Resolved keys
    const xKey = resolveKey(config.xKey);
    const yKey = resolveKey(config.yKey);
    const pieNameKey = resolveKey(config.labelKey || config.xKey);
    const pieDataKey = resolveKey(config.valueKey || config.yKey);

    // --- Helpers for formatting ---

    // Check if string looks like a date (simple heuristic)
    const isDateString = (val: any) => {
        if (typeof val !== 'string') return false;
        // Matches YYYY-MM-DD or standard date formats roughly
        // If data is just years "2023", it might count as date if we want, but typically "Product A" isn't a date.
        // Let's assume standard ISO-like or slash dates.
        return !isNaN(Date.parse(val)) && val.length > 4 && (val.includes('-') || val.includes('/') || val.includes(':'));
    };

    const formatYAxis = (val: number) => {
        return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
    };

    const formatXAxis = (val: any) => {
        const str = String(val);
        return str.length > 12 ? str.slice(0, 10) + '...' : str;
    };

    // --- Aggregation Logic (Memoized) ---
    const processedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // 1. Check for Time Series exception
        // We check the first few items to see if xKey holds date-like strings
        const sampleSize = Math.min(data.length, 5);
        const isTimeSeries = data.slice(0, sampleSize).every(item => isDateString(item[xKey]));

        // If time series or not a bar/pie chart (though we only use this for bar mainly here, maybe pie), 
        // OR if activeType is 'line' (lines usually imply trend/time), we might skip aggregation.
        // The prompt specifically asks for "Exceptions: Time series...".
        // Use processedData for Bar, but maybe keep original for Table? 
        // Let's stick to the prompt: Logic applies to "Bar Chart" context mostly, but let's compute it generally.
        // NOTE: Pie chart already has its own logic in previous code. We might unify or keep separate.
        // The prompt instructions are under "Refactor Bar Chart", so applied to Bar.

        if (isTimeSeries || activeType === 'line' || activeType === 'table') {
            return data.map(item => ({
                ...item,
                [yKey]: Number(item[yKey]) || 0 // sanitize
            }));
        }

        // 2. Sorting & Grouping
        // Sort descending
        const sorted = [...data].sort((a, b) => (Number(b[yKey]) || 0) - (Number(a[yKey]) || 0));

        // Keep Top 15
        const top15 = sorted.slice(0, 15);
        const others = sorted.slice(15);

        if (others.length === 0) {
            return top15.map(item => ({ ...item, [yKey]: Number(item[yKey]) || 0 }));
        }

        // Sum remaining
        const otherValue = others.reduce((sum, item) => sum + (Number(item[yKey]) || 0), 0);
        const otherItem = {
            [xKey]: 'Other',
            [yKey]: otherValue,
            [pieNameKey]: 'Other', // For compatibility if used elsewhere
            fill: '#94a3b8' // convention
            // Copy other props? Unlikely needed for "Other" aggregate
        };

        return [...top15, otherItem];

    }, [data, xKey, yKey, activeType, pieNameKey]);


    // Pie data logic (preserving existing specific logic or adapting to use processedData?)
    // Existing logic was: Top 5 + Other.
    // New prompt says "Top 15" generally. 
    // Usually Pie charts shouldn't have 15 slices. I will leave the Pie logic as is (Top 5) since the prompt focuses on "Refactor Bar Chart".
    // I will *keep* the old pieData memo for the Pie Chart to ensure I don't break it, or I could adapt it.
    // Given "Refactor Bar Chart" title, I'll focus changes on Bar.

    const pieData = useMemo(() => {
        if (config.type !== 'pie' || !data || data.length <= 6) return data;
        const sorted = [...data].sort((a, b) => (b[pieDataKey] || 0) - (a[pieDataKey] || 0));
        const top5 = sorted.slice(0, 5);
        const others = sorted.slice(5);
        if (others.length === 0) return top5;
        const otherValue = others.reduce((sum, item) => sum + (Number(item[pieDataKey]) || 0), 0);
        return [...top5, { [pieNameKey]: 'Other', [pieDataKey]: otherValue, fill: '#94a3b8' }];
    }, [config.type, data, pieDataKey, pieNameKey]);


    const renderContent = () => {
        // Fallback or explicit Table
        if (activeType === 'table') {
            if (!data || data.length === 0) return <p className="text-muted-foreground p-4">No data available</p>;
            const headers = Object.keys(data[0]);
            return (
                <div className="h-[300px] w-full rounded-md border overflow-auto">
                    <table className="min-w-full caption-bottom text-sm text-left">
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
                            {data.map((row, i) => ( // Use raw data for table
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
            );
        }

        switch (activeType) {
            case 'bar':
                const barData = processedData; // Use aggregated data
                // Dynamic Width Calculation
                // Rule: Math.max(containerWidth, data.length * 80). 
                // Since we don't know exact containerWidth in JS easily without obs, we use CSS min-width: 100% logic.
                // We set internal width to len * 80. Container handles scroll if this exceeds 100%.
                const minBarWidth = barData.length * 80;

                // Anim checks
                const isLargeDatasetBar = barData.length > 20;

                return (
                    <div className="w-full overflow-x-auto pb-4"> {/* Scrollable Container */}
                        <div style={{ minWidth: '100%', width: minBarWidth, height: 400 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey={xKey}
                                        height={70}
                                        interval={0}
                                        minTickGap={8}
                                        tick={<CustomXAxisTick />}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        className="text-xs"
                                        tick={{ fill: '#e5e7eb' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={formatYAxis}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="rounded-lg border border-border bg-popover p-2 shadow-sm">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                    {label}
                                                                </span>
                                                                <span className="font-bold text-popover-foreground">
                                                                    {/* Full value formatted */}
                                                                    {new Intl.NumberFormat('en').format(Number(payload[0].value))}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                        isAnimationActive={!isLargeDatasetBar}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar
                                        dataKey={yKey}
                                        fill="#ffffffff" // Use a nice primary color or variable
                                        radius={[4, 4, 0, 0]}
                                        isAnimationActive={!isLargeDatasetBar}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );

            case 'line':
                const isLargeDatasetLine = data.length > 20;
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey={xKey}
                                className="text-xs"
                                tick={{ fill: '#e5e7eb' }}
                                tickCount={7}
                                minTickGap={30}
                            />
                            <YAxis
                                className="text-xs"
                                tick={{ fill: '#e5e7eb' }}
                                tickCount={5}
                                tickFormatter={formatYAxis}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    borderColor: '#374151',
                                    color: '#fff'
                                }}
                                itemStyle={{ color: '#fff' }}
                                isAnimationActive={!isLargeDatasetLine}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey={yKey}
                                stroke="#ffffffff"
                                strokeWidth={2}
                                dot={!isLargeDatasetLine ? { fill: 'hsl(var(--background))', stroke: '#ffffffff', strokeWidth: 2 } : false}
                                isAnimationActive={!isLargeDatasetLine}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                // Keeping existing Pie logic
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={false}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey={pieDataKey}
                                nameKey={pieNameKey}
                                isAnimationActive={false}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.fill || COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    borderColor: '#374151',
                                    color: '#fff',
                                    borderRadius: '8px'
                                }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value) => <span style={{ color: '#e5e7eb' }}>{value}</span>}
                            />
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
