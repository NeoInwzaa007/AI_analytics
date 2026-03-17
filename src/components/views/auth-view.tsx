'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/use-auth-store";
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import { apiPost } from "@/lib/api";


export default function AuthView({ onLoginSuccess }: { onLoginSuccess: () => void }) {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const endpoint = isLogin ? `/api/auth/login` : `/api/auth/register`;
        const payload = isLogin
            ? { email: formData.email, password: formData.password }
            : { name: formData.name, email: formData.email, password: formData.password };

        try {
            // Using direct fetch to backend assuming proxy is set up or relative path works if nextjs api route exists.
            // Based on previous chats, Next.js API routes proxy to FastAPI. 
            // If strictly using FastAPI directly, this might need full URL, but let's assume /api/auth/* is routed correctly 
            // (either via Next.js rewrite or direct proxy).
            // NOTE: The previous conversation mentions "Next.js API proxy". So likely /api/auth/... -> Backend.
            // However, main.py defines /api/auth/login directly. 
            // If Next.js doesn't have a rewrite rule for /api/auth -> Backend, this fetch will fail (404 on frontend).
            // Ensuring we use the presumed proxy path. If it fails, user might need to adjust next.config.js

            // To be safe, I'll assume standard /api proxying.
            // If the user hasn't set up the proxy for /api/auth specifically, we might need to add it. 
            // But main.py has /api/auth/..., so if /api/... is rewritten to backend, it should work.

            const response = await apiPost(endpoint, payload);

            if (!response.ok) {
                const text = await response.text();
                let errorMessage = "Authentication failed";
                try {
                    const parsed = JSON.parse(text);
                    errorMessage = parsed.message || parsed.detail || errorMessage;
                } catch (e) {
                    throw new Error(text);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            if (isLogin) {
                // data is Token { access_token, token_type, user }
                login(data.access_token, data.user);
                toast.success("Welcome back!");
                onLoginSuccess();
            } else {
                // Register success
                toast.success("Registration successful! Please login.");
                setIsLogin(true);
            }

        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen w-full p-4">
            <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">{isLogin ? "Welcome back" : "Create an account"}</CardTitle>
                    <CardDescription>
                        {isLogin ? "Enter your credentials to access your dashboard." : "Sign up to start analyzing your data."}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required={!isLogin}
                                    className="bg-background/50 border-input/50 focus-visible:ring-primary"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                className="bg-background/50 border-input/50 focus-visible:ring-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                className="bg-background/50 border-input/50 focus-visible:ring-primary"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-6 pt-6">
                        <Button type="submit" className="w-full font-semibold shadow-lg hover:shadow-primary/25 transition-all" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLogin ? "Sign In" : "Register"}
                        </Button>
                        <div className="text-sm text-center text-muted-foreground">
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <Button
                                variant="link"
                                className="p-0 h-auto font-normal text-primary hover:text-primary/80 transition-colors"
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                            >
                                {isLogin ? "Sign up" : "Login"}
                            </Button>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
