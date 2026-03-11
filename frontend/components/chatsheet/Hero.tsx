import React from 'react';

export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden pt-16 pb-32 flex flex-col items-center max-w-7xl mx-auto">
      
      {/* Text Content */}
      <div className="text-center max-w-3xl px-4 z-10 relative">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif text-slate-900 tracking-tight leading-[1.1] mb-6">
          Intelligence for<br />Legal Documents
        </h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Transform legal documents into actionable insights with<br className="hidden md:block" />
          AI-powered risk scoring, entity extraction, and smart Q&A.
        </p>
      </div>

      {/* Abstract Graphic Area */}
      <div className="relative w-full h-[600px] mt-12 perspective-1000 flex justify-center">
        {/* We will build the graphic here using absolutely positioned elements and isometric transforms */}
        
        {/* Glow effect behind hub */}
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

        {/* The Graphic Container (rotated isometrically) */}
        <div className="relative w-full max-w-4xl h-full" style={{ transform: 'rotateX(55deg) rotateZ(-40deg)', transformStyle: 'preserve-3d' }}>
          
          {/* Base Grid / Connecting Lines */}
          <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ transform: 'translateZ(-1px)' }}>
            <path d="M 400 300 Q 200 300 100 500" fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 6" className="animate-pulse" />
            <path d="M 400 300 Q 400 100 600 50" fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 6" />
            <path d="M 100 500 Q 50 600 -50 650" fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 6" />
            <path d="M 400 300 Q 500 500 700 600" fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 6" />
            <path d="M 700 600 Q 800 650 900 600" fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 6" />
          </svg>

          {/* Central Hub */}
          <div className="absolute top-[200px] left-[300px] w-64 h-64 rounded-full bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-[#3b82f6] flex items-center justify-center transform-gpu" style={{ transform: 'translateZ(20px)' }}>
             <div className="w-56 h-56 rounded-full border-4 border-blue-400 flex items-center justify-center">
                <div className="w-40 h-40 rounded-full bg-blue-500 flex items-center justify-center shadow-inner">
                   <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white" />
                   </div>
                </div>
             </div>
             
             {/* Cutout/notch detail on the hub */}
             <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-[#f8fafc] rounded-full" />
          </div>

          {/* App Nodes */}
          {/* Slack Node -> Scale / Law */}
          <div className="absolute top-[450px] left-[50px] w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center transform-gpu hover:-translate-y-2 transition-transform" style={{ transform: 'translateZ(30px)' }}>
            <svg xmlns="http://www.w3.org/O/svg/2000" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-indigo-500">
               <path d="M7 20h10" />
               <path d="M12 2v18" />
               <path d="M3 11l9-9 9 9" />
               <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
               <path d="M3 11v8a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-8" />
            </svg>
          </div>

          {/* PDF Node */}
          <div className="absolute top-[350px] left-[150px] w-14 h-14 bg-white rounded-xl shadow-lg flex items-center justify-center" style={{ transform: 'translateZ(40px)' }}>
             <div className="text-red-500 font-bold text-xl border-2 border-red-500 rounded px-1">PDF</div>
          </div>

          {/* YouTube Node -> Entity Extraction */}
          <div className="absolute top-[280px] left-[250px] w-12 h-12 bg-white rounded-lg shadow-md flex items-center justify-center" style={{ transform: 'translateZ(20px)' }}>
             <svg xmlns="http://www.w3.org/O/svg/2000" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-emerald-500">
               <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
               <line x1="12" y1="22" x2="12" y2="15.5" />
               <polyline points="22 8.5 12 15.5 2 8.5" />
               <polyline points="2 15.5 12 8.5 22 15.5" />
               <line x1="12" y1="2" x2="12" y2="8.5" />
             </svg>
          </div>

          {/* Gmail Node -> Chat Interaction */}
          <div className="absolute top-[480px] left-[280px] w-14 h-14 bg-white rounded-xl shadow-lg flex items-center justify-center" style={{ transform: 'translateZ(35px)' }}>
            <svg xmlns="http://www.w3.org/O/svg/2000" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-blue-500">
               <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>

          {/* Excel Node -> Risk Score/Analysis */}
          <div className="absolute top-[600px] left-[200px] w-14 h-14 bg-white rounded-xl shadow-lg flex items-center justify-center" style={{ transform: 'translateZ(25px)' }}>
             <svg xmlns="http://www.w3.org/O/svg/2000" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-amber-500">
                <path d="M12 2v20" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
             </svg>
          </div>

          {/* Drive Node -> File Directory */}
          <div className="absolute top-[450px] left-[450px] w-12 h-12 bg-white rounded-lg shadow-md flex items-center justify-center" style={{ transform: 'translateZ(10px)' }}>
             <svg xmlns="http://www.w3.org/O/svg/2000" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-slate-500">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
             </svg>
          </div>
          
          {/* Automation Action Floating UI */}
          <div className="absolute top-[200px] left-[550px] w-80 h-48 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/50" style={{ transform: 'translateZ(60px)' }}>
             {/* Fake Grid */}
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:1rem_1rem]" />
             
             {/* Action Button */}
             <div className="absolute bottom-6 left-6 right-6">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors">
                   Analyze Document
                </button>
             </div>
             
             {/* Small node icons inside the card */}
             <div className="absolute top-6 left-6 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f8fafc] flex items-center justify-center outline outline-2 outline-white shadow-sm text-[10px] text-red-500 font-bold border border-red-200">PDF</div>
                <div className="w-8 h-8 rounded-full bg-[#f8fafc] flex items-center justify-center outline outline-2 outline-white shadow-sm text-amber-500 border border-amber-200">
                  <svg xmlns="http://www.w3.org/O/svg/2000" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
             </div>
             
             {/* Arrow path */}
             <svg className="absolute top-10 left-20 w-32 h-20 overflow-visible text-blue-400">
                <path d="M 0 0 C 20 -10, 80 10, 100 30" fill="none" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" />
                <defs>
                   <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                   </marker>
                </defs>
             </svg>
          </div>

        </div>

        {/* CSS to add perspective to the parent */}
        <style dangerouslySetInnerHTML={{__html: `
          .perspective-1000 {
            perspective: 1000px;
          }
        `}} />
      </div>

    </section>
  );
}
