export type ChartType = "bar" | "line" | "pie" | "table";

export interface ChartPayload {
    type: ChartType;
    title?: string;
    xKey?: string;
    yKey?: string;
    labelKey?: string; // for pie
    valueKey?: string; // for pie
    data: Record<string, any>[];
}

export function normalizeChartPayload(raw: any): ChartPayload | null {
    if (!raw) return null;

    // Handle nested 'chart' property or direct object
    const candidate = raw.chart || raw;

    // Basic Validation: Must have a type and data array
    if (candidate && typeof candidate.type === 'string' && Array.isArray(candidate.data)) { // Fix: candidate.data check was implicitly handled but explicit is better
        const data = candidate.data;
        let xKey = candidate.xKey;
        let yKey = candidate.yKey;
        let labelKey = candidate.labelKey;
        let valueKey = candidate.valueKey;

        // Auto-inference if keys are missing and data exists
        if (data.length > 0) {
            const firstItem = data[0];
            const keys = Object.keys(firstItem);

            // Infer xKey (first string key) if missing
            if (!xKey) {
                xKey = keys.find(k => typeof firstItem[k] === 'string') || keys[0];
            }

            // Infer yKey (first number key) if missing
            if (!yKey) {
                yKey = keys.find(k => typeof firstItem[k] === 'number' && k !== xKey);
            }
        }

        return {
            type: candidate.type.toLowerCase() as ChartType,
            title: candidate.title,
            xKey: xKey,
            yKey: yKey,
            labelKey: labelKey || xKey, // Fallback for pie
            valueKey: valueKey || yKey, // Fallback for pie
            data: data
        };
    }

    return null;
}

export function isValidChartConfig(config: ChartPayload): boolean {
    if (!config.data || config.data.length === 0) return false;

    // Table is always valid if it has data
    if (config.type === 'table') return true;

    // Pie chart needs either (labelKey + valueKey) OR (xKey + yKey)
    if (config.type === 'pie') {
        const hasPieKeys = (!!config.labelKey && !!config.valueKey) || (!!config.xKey && !!config.yKey);
        return hasPieKeys;
    }

    // Bar and Line charts need xKey and yKey
    if (config.type === 'bar' || config.type === 'line') {
        return !!config.xKey && !!config.yKey;
    }

    return false;
}

export const extractChartData = (response: any) => {
    if (!response) return null;

    // Case 1: Nested in 'data' array
    if (Array.isArray(response.data) && response.data.length > 0) {
        const item = response.data[0];
        if (item.chart_meta && item.raw) {
            return { chart_meta: item.chart_meta, raw: item.raw };
        }
    }

    // Case 2: Direct root object
    if (response.chart_meta && response.raw) {
        return { chart_meta: response.chart_meta, raw: response.raw };
    }

    // Case 3: Nested in 'chart' object
    if (response.chart && response.chart.chart_meta) {
        return { chart_meta: response.chart.chart_meta, raw: response.chart.raw };
    }

    // Case 4: Fallback/Strict Default
    // If we have just 'data' but no meta, strict mode will fail anyway. 
    // Return what we have if it matches shape or let it fail gracefully.
    return response;
};
