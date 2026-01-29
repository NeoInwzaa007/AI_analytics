'use client';

import React, { useState } from 'react';
import DashboardLayout, { ViewType } from "@/components/dashboard-layout";
import ChatView from "@/components/views/chat-view";
import DashboardView from "@/components/views/dashboard-view";
import SettingsView from "@/components/views/settings-view";
import ConnectionsView from "@/components/views/connections-view";
import LandingView from "@/components/views/landing-view";
import SQLRunnerView from "@/components/views/sql-runner-view";
import AuthView from "@/components/views/auth-view";
import { useAuthStore } from "@/store/use-auth-store";

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // If in landing view, render full screen without dashboard layout
  if (currentView === 'landing') {
    return <LandingView onStart={() => setCurrentView('dashboard')} />;
  }

  // Require Authentication for other views
  if (!isAuthenticated) {
    return <AuthView onLoginSuccess={() => setCurrentView('dashboard')} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'chat':
        return <ChatView />;
      case 'settings':
        return <SettingsView />;
      case 'connections':
        return <ConnectionsView />;
      case 'sql':
        return <SQLRunnerView />;
      default:
        return <ChatView />;
    }
  };

  return (
    <DashboardLayout currentView={currentView} onNavigate={setCurrentView}>
      {renderView()}
    </DashboardLayout>
  );
}
