import React from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { WhatsAppSupportButton } from './WhatsAppSupportButton';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-50/10 dark:to-emerald-950/10">
      <DashboardHeader />
      <DashboardSidebar />
      <main className="p-4 md:p-8 pt-20 md:pt-24">
        {children}
      </main>
      <WhatsAppSupportButton />
    </div>
  );
};