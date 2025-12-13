import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LayoutDashboard, MessageSquare, Settings, Menu, Database } from "lucide-react";

export type ViewType = 'dashboard' | 'chat' | 'settings' | 'connections' | 'landing';

interface DashboardLayoutProps {
    children: React.ReactNode;
    currentView: ViewType;
    onNavigate: (view: ViewType) => void;
}

import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, LogOut } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SidebarContent = ({ currentView, onNavigate }: { currentView: ViewType, onNavigate: (view: ViewType) => void }) => {
    const [recentChats, setRecentChats] = useState([
        { id: '1', title: 'ผลกำไรไตรมาสที่ 3' },
        { id: '2', title: 'อัตราการเติบโตของลูกค้า' },
        { id: '3', title: 'แผนการตลาด' },
    ]);
    const [editingChat, setEditingChat] = useState<{ id: string, title: string } | null>(null);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");

    const handleDelete = (id: string) => {
        setRecentChats(prev => prev.filter(chat => chat.id !== id));
    };

    const startRename = (chat: { id: string, title: string }) => {
        setEditingChat(chat);
        setNewTitle(chat.title);
        setIsRenameDialogOpen(true);
    };

    const handleRename = () => {
        if (editingChat && newTitle.trim()) {
            setRecentChats(prev => prev.map(c => c.id === editingChat.id ? { ...c, title: newTitle.trim() } : c));
            setIsRenameDialogOpen(false);
            setEditingChat(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
            <div className="p-6 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate('landing')}>
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="font-bold text-primary-foreground">AI</span>
                </div>
                <span className="font-semibold text-lg tracking-tight">Analytics</span>
            </div>

            <ScrollArea className="flex-1 px-4">
                <div className="space-y-4">
                    <div className="py-2">
                        <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Menu
                        </h3>
                        <nav className="space-y-1">
                            <Button
                                variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
                                className={`w-full justify-start ${currentView === 'dashboard' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                                onClick={() => onNavigate('dashboard')}
                            >
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                Dashboard
                            </Button>
                            <Button
                                variant={currentView === 'chat' ? 'secondary' : 'ghost'}
                                className={`w-full justify-start ${currentView === 'chat' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                                onClick={() => onNavigate('chat')}
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Chat Query
                            </Button>
                            <Button
                                variant={currentView === 'connections' ? 'secondary' : 'ghost'}
                                className={`w-full justify-start ${currentView === 'connections' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                                onClick={() => onNavigate('connections')}
                            >
                                <Database className="mr-2 h-4 w-4" />
                                Connections
                            </Button>
                            <Button
                                variant={currentView === 'settings' ? 'secondary' : 'ghost'}
                                className={`w-full justify-start ${currentView === 'settings' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                                onClick={() => onNavigate('settings')}
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Button>
                        </nav>
                    </div>

                    <Separator className="bg-sidebar-border" />

                    <div className="py-2">
                        <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Recent
                        </h3>
                        <nav className="space-y-1">
                            {recentChats.map((chat) => (
                                <div key={chat.id} className="group flex items-center w-full relative">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start text-sm text-muted-foreground font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground truncate pr-8"
                                    >
                                        {chat.title}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                            >
                                                <MoreHorizontal className="h-3 w-3" />
                                                <span className="sr-only">More</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem onClick={() => startRename(chat)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDelete(chat.id)} className="text-destructive focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </nav>
                    </div>
                </div>
            </ScrollArea>

            <div className="p-4 border-t border-sidebar-border text-sidebar-foreground">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full flex items-center justify-start gap-3 p-2 h-auto hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src="https://github.com/shadcn.png" />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start text-left">
                                <span className="text-sm font-medium">John Doe</span>
                                <span className="text-xs text-muted-foreground">Admin</span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onNavigate('settings')}>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => console.log("Sign out")}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Rename Dialog */}
            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Chat</DialogTitle>
                        <DialogDescription>
                            Enter a new name for your chat session.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="col-span-3"
                                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" onClick={handleRename}>Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default function DashboardLayout({ children, currentView, onNavigate }: DashboardLayoutProps) {
    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar shrink-0">
                <SidebarContent currentView={currentView} onNavigate={onNavigate} />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Mobile Header with Hamburger */}
                <header className="flex md:hidden h-14 items-center border-b border-sidebar-border bg-sidebar px-4 shrink-0">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="mr-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 border-r border-sidebar-border bg-sidebar w-72">
                            <SidebarContent currentView={currentView} onNavigate={(view) => {
                                onNavigate(view);
                                // Note: In a real app we'd close the sheet here, 
                                // but Sheet primitive handles state internally or via controlled props.
                                // For now, simple navigation works.
                            }} />
                        </SheetContent>
                    </Sheet>
                    <div className="font-semibold text-lg flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                            <span className="font-bold text-xs text-primary-foreground">AI</span>
                        </div>
                        Analytics
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
