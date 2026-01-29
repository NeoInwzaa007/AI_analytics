export interface ChartDataPoint {
    [key: string]: string | number;
}

export interface ChartPayload {
    type: 'bar' | 'line' | 'pie' | 'table';
    title: string;
    xKey: string;
    yKey?: string | null;
    data: ChartDataPoint[];
}
