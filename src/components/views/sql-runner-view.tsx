"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Play, Loader2, Database, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { useConnectionStore } from "@/store/useConnectionStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiPost } from "@/lib/api";

interface QueryResult {
    columns: string[];
    rows: Record<string, any>[];
    message?: string;
}

export default function SQLRunnerView() {
    const { activeConnectionId, connectionName, isConnected } = useConnectionStore();
    const [query, setQuery] = useState("SELECT * FROM users LIMIT 10;");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRunQuery = async () => {
        if (!isConnected || !activeConnectionId) {
            toast.error("Please connect to a database first.");
            return;
        }

        if (!query.trim()) {
            toast.error("Please enter a query.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
            const response = await apiPost(`/api/execute-sql`, {
                connectionId: activeConnectionId,
                sql: query
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Query failed');
            }

            setResult(data);
            toast.success("Query executed successfully");

        } catch (err: any) {
            console.error(err);
            setError(err.message);
            toast.error("Failed to execute query");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-[calc(100vh-100px)]">
                <div className="bg-muted p-6 rounded-full mb-4">
                    <Database className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">No Active Connection</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                    You need to connect to a database before you can run SQL queries.
                    Go to the Connections tab to set up a connection.
                </p>
                {/* Could add a button to navigate to connections here if we had access to onNavigate */}
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 h-[calc(100vh-60px)] flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">SQL Runner</h2>
                    <p className="text-muted-foreground">
                        Running on: <span className="font-semibold text-primary">{connectionName}</span>
                    </p>
                </div>
                <Button onClick={handleRunQuery} disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running...
                        </>
                    ) : (
                        <>
                            <Play className="mr-2 h-4 w-4" />
                            Run Query
                        </>
                    )}
                </Button>
            </div>

            <div className="grid gap-4 flex-1 min-h-0 grid-rows-[auto_1fr]">
                {/* Query Editor */}
                <Card className="flex flex-col">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">Query Editor</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 relative min-h-[150px]">
                        <Textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="absolute inset-0 w-full h-full resize-none border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-sm"
                            placeholder="SELECT * FROM table_name;"
                        />
                    </CardContent>
                </Card>

                {/* Results Area */}
                <Card className="flex flex-col min-h-0 overflow-hidden">
                    <CardHeader className="py-3 bg-muted/30">
                        <CardTitle className="text-sm font-medium">Results</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden relative">
                        {error && (
                            <div className="p-4">
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription className="font-mono text-xs mt-1 whitespace-pre-wrap">
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {result && (
                            <ScrollArea className="h-full w-full">
                                <div className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-3 font-medium text-center w-12 text-muted-foreground/50">#</th>
                                                {result.columns.map((col, i) => (
                                                    <th key={i} className="px-4 py-3 font-medium whitespace-nowrap">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.rows.map((row, rowIndex) => (
                                                <tr key={rowIndex} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-2 text-center text-xs text-muted-foreground/50 select-none">
                                                        {rowIndex + 1}
                                                    </td>
                                                    {result.columns.map((col, colIndex) => (
                                                        <td key={`${rowIndex}-${colIndex}`} className="px-4 py-2 whitespace-nowrap font-mono text-xs max-w-[300px] truncate">
                                                            {row[col] !== null ? String(row[col]) : <span className="text-muted-foreground italic">null</span>}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            {result.rows.length === 0 && (
                                                <tr>
                                                    <td colSpan={result.columns.length + 1} className="p-8 text-center text-muted-foreground">
                                                        No rows returned.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    <ScrollBar orientation="horizontal" />
                                </div>
                            </ScrollArea>
                        )}

                        {!result && !error && !isLoading && (
                            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                                Run a query to see results here.
                            </div>
                        )}

                        {isLoading && (
                            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
