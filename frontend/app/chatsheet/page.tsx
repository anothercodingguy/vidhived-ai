import React from 'react';
import Navbar from '@/components/chatsheet/Navbar';
import Hero from '@/components/chatsheet/Hero';

export const metadata = {
  title: 'Turn Manual Tasks into Automations - Chatsheet',
  description: 'Automate documents, emails, approvals, and more, with expert help and enterprise-grade AI integrations.',
};

export default function ChatsheetPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
      {/* Container to mock the "browser window" look from the design snippet if desired, 
          or just a large clean container that acts like the full viewport */}
      <div className="w-full max-w-[1440px] bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative">
        <Navbar />
        <Hero />
      </div>
    </main>
  );
}
