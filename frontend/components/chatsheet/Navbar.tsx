import React from 'react';

export default function Navbar() {
  return (
    <nav className="w-full flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full border-[3px] border-blue-500 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500" />
        </div>
        <span className="text-[22px] font-serif text-slate-800 font-medium tracking-tight">Vidhived.ai</span>
      </div>

      {/* Links */}
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
        <a href="#" className="hover:text-slate-900 transition-colors">Features</a>
        <a href="#" className="hover:text-slate-900 transition-colors">Security</a>
        <a href="#" className="hover:text-slate-900 transition-colors">Documentation</a>
        <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
      </div>
    </nav>
  );
}
