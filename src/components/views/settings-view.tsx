'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";

export default function SettingsView() {
    const { setTheme, theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [emailDigest, setEmailDigest] = useState(true);
    const [realTimeAlerts, setRealTimeAlerts] = useState(true);
    const [marketingEmails, setMarketingEmails] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        // eslint-disable-next-line
        setMounted(true);
    }, []);

    const handleSave = () => {
        toast.success("Settings saved successfully");
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">Settings</h2>
            </div>

            <Tabs defaultValue="account" className="space-y-4">
                <TabsList className="bg-muted border border-border">
                    <TabsTrigger value="account" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground">Account</TabsTrigger>
                    <TabsTrigger value="notifications" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground">Notifications</TabsTrigger>
                    <TabsTrigger value="appearance" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground">Appearance</TabsTrigger>
                </TabsList>

                {/* Account Tab */}
                <TabsContent value="account" className="space-y-4">
                    <Card className="bg-card border-border text-card-foreground">
                        <CardHeader>
                            <CardTitle>Profile</CardTitle>
                            <CardDescription className="text-muted-foreground">Manage your public profile information.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src="https://github.com/shadcn.png" />
                                    <AvatarFallback>JD</AvatarFallback>
                                </Avatar>
                                <Button variant="outline" className="bg-transparent border-input hover:bg-accent text-foreground">Change Avatar</Button>
                            </div>
                            <Separator className="bg-border" />
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-foreground">Display Name</Label>
                                    <Input id="name" defaultValue="John Doe" className="bg-background border-input text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-foreground">Email</Label>
                                    <Input id="email" defaultValue="john.doe@example.com" className="bg-background border-input text-foreground" />
                                </div>
                            </div>
                            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Changes</Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border text-card-foreground">
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                            <CardDescription className="text-muted-foreground">Manage your password and security settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current-password" className="text-foreground">Current Password</Label>
                                <Input id="current-password" type="password" className="bg-background border-input text-foreground" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-password" className="text-foreground">New Password</Label>
                                <Input id="new-password" type="password" className="bg-background border-input text-foreground" />
                            </div>
                            <Button onClick={handleSave} variant="secondary" className="bg-secondary hover:bg-secondary/80 text-secondary-foreground">Update Password</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications" className="space-y-4">
                    <Card className="bg-card border-border text-card-foreground">
                        <CardHeader>
                            <CardTitle>Notification Preferences</CardTitle>
                            <CardDescription className="text-muted-foreground">Choose what you want to be notified about.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor="email-digest" className="text-foreground font-medium">Email Digest</Label>
                                    <span className="text-sm text-muted-foreground">Receive a weekly summary of your analytics.</span>
                                </div>
                                <Switch id="email-digest" checked={emailDigest} onCheckedChange={(c) => { setEmailDigest(c); toast.success("Preference updated"); }} />
                            </div>
                            <Separator className="bg-border" />
                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor="real-time" className="text-foreground font-medium">Real-time Alerts</Label>
                                    <span className="text-sm text-muted-foreground">Get notified immediately when anomalies are detected.</span>
                                </div>
                                <Switch id="real-time" checked={realTimeAlerts} onCheckedChange={(c) => { setRealTimeAlerts(c); toast.success("Preference updated"); }} />
                            </div>
                            <Separator className="bg-border" />
                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor="marketing" className="text-foreground font-medium">Marketing Emails</Label>
                                    <span className="text-sm text-muted-foreground">Receive news about new features and updates.</span>
                                </div>
                                <Switch id="marketing" checked={marketingEmails} onCheckedChange={(c) => { setMarketingEmails(c); toast.success("Preference updated"); }} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Appearance Tab */}
                <TabsContent value="appearance" className="space-y-4">
                    <Card className="bg-card border-border text-card-foreground">
                        <CardHeader>
                            <CardTitle>Theme Settings</CardTitle>
                            <CardDescription className="text-muted-foreground">Customize the look and feel of your dashboard.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                <div
                                    className="space-y-2 cursor-pointer"
                                    onClick={() => setTheme("dark")}
                                >
                                    <div className={`h-24 rounded-lg bg-neutral-950 border-2 p-2 ${theme === 'dark' ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2 ring-offset-neutral-950' : 'border-border'}`}>
                                        <div className="space-y-2">
                                            <div className="h-2 w-[80%] rounded-lg bg-neutral-800" />
                                            <div className="h-2 w-[100%] rounded-lg bg-neutral-800" />
                                        </div>
                                    </div>
                                    <span className={`block w-full text-center text-sm font-medium ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`}>Dark</span>
                                </div>
                                <div
                                    className="space-y-2 cursor-pointer"
                                    onClick={() => setTheme("light")}
                                >
                                    <div className={`h-24 rounded-lg bg-white border-2 p-2 ${theme === 'light' ? 'border-blue-600 ring-2 ring-blue-600' : 'border-border'}`}>
                                        <div className="space-y-2">
                                            <div className="h-2 w-[80%] rounded-lg bg-neutral-200" />
                                            <div className="h-2 w-[100%] rounded-lg bg-neutral-200" />
                                        </div>
                                    </div>
                                    <span className={`block w-full text-center text-sm font-medium ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`}>Light</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
