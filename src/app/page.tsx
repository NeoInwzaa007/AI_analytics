'use client';

import React, { useState } from 'react';
import DashboardLayout, { ViewType } from "@/components/dashboard-layout";
import ChatView from "@/components/chat-view";
import DashboardView from "@/components/views/dashboard-view";
import SettingsView from "@/components/views/settings-view";
import ConnectionsView from "@/components/views/connections-view";
import LandingView from "@/components/views/landing-view";

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>('landing');

  // If in landing view, render full screen without dashboard layout
  if (currentView === 'landing') {
    return <LandingView onStart={() => setCurrentView('dashboard')} />;
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
