"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Database, Shield, Server } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Mock schema response type
interface SchemaTable {
    table: string;
    columns: string[];
}

export default function ConnectionsView() {
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [fetchedSchema, setFetchedSchema] = useState<SchemaTable[] | null>(null);

    const [formData, setFormData] = useState({
        connectionName: '',
        dbType: '',
        host: '',
        port: '',
        dbName: '',
        username: '',
        password: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (value: string) => {
        setFormData(prev => ({ ...prev, dbType: value }));
        // Auto-set default ports
        switch (value) {
            case 'postgresql':
                setFormData(prev => ({ ...prev, port: '5432' }));
                break;
            case 'mysql':
                setFormData(prev => ({ ...prev, port: '3306' }));
                break;
            case 'mssql':
                setFormData(prev => ({ ...prev, port: '1433' }));
                break;
            case 'mongodb':
                setFormData(prev => ({ ...prev, port: '27017' }));
                break;
            case 'oracle':
                setFormData(prev => ({ ...prev, port: '1521' }));
                break;
            case 'sqlite':
                setFormData(prev => ({ ...prev, port: '', host: '', username: '', password: '' }));
                break;
            default:
                break;
        }
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation based on type
        if (!formData.connectionName || !formData.dbType) {
            toast.error("Please select a connection name and type.");
            return;
        }

        if (formData.dbType === 'sqlite') {
            if (!formData.dbName) {
                toast.error("Please enter the database file path.");
                return;
            }
        } else {
            if (!formData.host || !formData.username) {
                toast.error("Please fill in all required fields (Host, Username).");
                return;
            }
        }

        setIsLoading(true);
        setFetchedSchema(null);

        try {
            const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.your-domain.com/webhook/database-connect-placeholder';

            // Construct payload dynamically
            interface ConnectionPayload {
                type: string;
                connectionName: string;
                database: string;
                host?: string;
                port?: number;
                user?: string;
                password?: string;
            }

            const payload: ConnectionPayload = {
                type: formData.dbType,
                connectionName: formData.connectionName,
                database: formData.dbName,
            };

            // Add fields only if relevant
            if (formData.dbType !== 'sqlite') {
                payload.host = formData.host;
                payload.port = formData.port ? parseInt(formData.port) : undefined;
                payload.user = formData.username;
                payload.password = formData.password;
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Connection failed: ${response.statusText}`);
            }

            const data = await response.json();
            setFetchedSchema(data);
            setIsConnected(true);
            toast.success("Successfully connected to database!");

        } catch (error) {
            console.error("Connection error:", error);
            toast.error("Failed to connect to database. Please check your credentials and webhook URL.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Database Connections</h2>
                    <p className="text-muted-foreground">Manage your database sources and schema.</p>
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7 h-[calc(100vh-140px)]">
                {/* Left Column: Form */}
                <Card className="col-span-3 bg-card border-border text-card-foreground">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5" />
                            Add New Connection
                        </CardTitle>
                        <CardDescription>Enter your database credentials to connect.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleConnect} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="connectionName">Connection Name</Label>
                                    <Input
                                        id="connectionName"
                                        name="connectionName"
                                        placeholder="My first connection"
                                        value={formData.connectionName}
                                        onChange={handleInputChange}
                                        className="bg-background border-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Database Type</Label>
                                    <Select onValueChange={handleSelectChange} value={formData.dbType}>
                                        <SelectTrigger className="bg-background border-input">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="postgresql">PostgreSQL</SelectItem>
                                            <SelectItem value="mysql">MySQL</SelectItem>
                                            <SelectItem value="mssql">MSSQL</SelectItem>
                                            <SelectItem value="mongodb">MongoDB</SelectItem>
                                            <SelectItem value="sqlite">SQLite</SelectItem>
                                            <SelectItem value="oracle">Oracle</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Dynamic Fields based on Type */}
                            {formData.dbType === 'sqlite' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="dbName">Database File Path</Label>
                                    <Input
                                        id="dbName"
                                        name="dbName"
                                        placeholder="/path/to/database.sqlite"
                                        value={formData.dbName}
                                        onChange={handleInputChange}
                                        className="bg-background border-input"
                                    />
                                    <p className="text-xs text-muted-foreground">Enter the absolute path to the SQLite file on the n8n server.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label htmlFor="host">Host</Label>
                                            <Input
                                                id="host"
                                                name="host"
                                                placeholder={formData.dbType === 'mongodb' ? 'cluster0.mongodb.net' : 'localhost'}
                                                value={formData.host}
                                                onChange={handleInputChange}
                                                className="bg-background border-input"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="port">Port</Label>
                                            <Input
                                                id="port"
                                                name="port"
                                                placeholder="5432"
                                                value={formData.port}
                                                onChange={handleInputChange}
                                                className="bg-background border-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="dbName">Database Name</Label>
                                        <Input
                                            id="dbName"
                                            name="dbName"
                                            placeholder="my_database"
                                            value={formData.dbName}
                                            onChange={handleInputChange}
                                            className="bg-background border-input"
                                        />
                                    </div>

                                    <Separator className="bg-border" />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="username">Username</Label>
                                            <Input
                                                id="username"
                                                name="username"
                                                placeholder="sa"
                                                value={formData.username}
                                                onChange={handleInputChange}
                                                className="bg-background border-input"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <div className="relative">
                                                <Input
                                                    id="password"
                                                    name="password"
                                                    placeholder="********"
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    className="bg-background border-input pr-10"
                                                />
                                                <Shield className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}


                            <div className="pt-2">
                                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <Database className="mr-2 h-4 w-4" />
                                            Test & Connect
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Right Column: Schema Preview */}
                <Card className="col-span-4 bg-card border-border text-card-foreground flex flex-col h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Schema Preview
                        </CardTitle>
                        <CardDescription>
                            {isConnected ? "Connection established. Schema retrieved successfully." : "Select a connection to view schema."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 relative p-0 overflow-hidden">
                        {fetchedSchema ? (
                            <ScrollArea className="absolute inset-0 h-full w-full bg-muted/50">
                                <div className="p-6">
                                    <pre className="text-sm font-mono text-foreground language-json whitespace-pre-wrap break-all">
                                        {JSON.stringify(fetchedSchema, null, 2)}
                                    </pre>
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6">
                                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                    <Database className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                                <p className="text-center font-medium">No connection selected</p>
                                <p className="text-center text-sm mt-1 max-w-xs">
                                    Enter your database credentials and click &quot;Test & Connect&quot; to preview the schema.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
