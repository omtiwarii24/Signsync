"use client";

import { useState } from "react";
import { Search, PlayCircle, Plus, Sparkles, BrainCircuit } from "lucide-react";

// The words your AI currently knows
const knownSigns = [
  { word: "HELLO", description: "Wave open hand side-to-side", difficulty: "Easy" },
  { word: "THANKS", description: "Flat hand moves away from chin", difficulty: "Easy" },
  { word: "IDLE", description: "Hands resting, no sign active", difficulty: "System" },
  { word: "PLEASE", description: "Flat hand rubbing chest in circular motion", difficulty: "Medium", comingSoon: true },
  { word: "YES", description: "Fist bobbing up and down", difficulty: "Medium", comingSoon: true },
  { word: "NO", description: "Index and middle finger tap thumb", difficulty: "Medium", comingSoon: true },
];

export default function DictionaryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSigns = knownSigns.filter(sign => 
    sign.word.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pb-12 animate-fade-in-up font-sans relative z-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mt-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 mb-1">
            <BrainCircuit className="w-6 h-6 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] rounded-full" />
            <span className="text-[10px] font-mono tracking-[0.2em] text-purple-400 uppercase">Knowledge Base</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500 drop-shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            Neural Dictionary
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            The neural network currently understands <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">3</span> active physical tokens.
          </p>
        </div>
        
        <button className="group relative px-6 py-3.5 rounded-[1rem] font-bold text-xs tracking-widest uppercase transition-all duration-500 overflow-hidden bg-white/[0.02] border border-white/10 text-white hover:border-purple-500/50 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)] flex items-center gap-3 backdrop-blur-md">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Plus className="w-4 h-4 text-cyan-400 relative z-10" />
          <span className="relative z-10">Train New Token</span>
        </button>
      </div>

      {/* SEARCH BAR (Glassmorphism) */}
      <div className="relative group w-full">
        <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
          <Search className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors drop-shadow-[0_0_8px_rgba(34,211,238,0)] group-focus-within:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
        </div>
        <input
          type="text"
          className="w-full bg-slate-950/50 backdrop-blur-xl border border-white/5 text-white text-sm rounded-[1.5rem] focus:outline-none focus:border-cyan-400/50 block pl-16 p-5 transition-all shadow-inner focus:shadow-[0_0_30px_-10px_rgba(34,211,238,0.2)] placeholder-slate-600 font-mono"
          placeholder="Search semantic tokens (e.g., 'Hello')..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* GRID OF SIGNS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSigns.map((sign) => (
          <div 
            key={sign.word} 
            className={`relative flex flex-col overflow-hidden rounded-[2rem] transition-all duration-500 group ${
              sign.comingSoon 
                ? "bg-white/[0.01] border border-white/5 opacity-50 grayscale hover:grayscale-[50%]" 
                : "bg-white/[0.02] backdrop-blur-xl border border-white/5 hover:border-white/15 hover:bg-white/[0.04] hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]"
            }`}
          >
            {/* Top Image/Video Placeholder */}
            <div className="h-40 bg-slate-950/80 flex items-center justify-center relative border-b border-white/5 overflow-hidden">
               {/* Subtle background grid for the image area */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
              
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950 z-0"></div>
              
              {sign.comingSoon ? (
                <div className="flex flex-col items-center text-slate-600 relative z-10">
                  <Sparkles className="w-6 h-6 mb-2 opacity-30" />
                  <span className="text-[10px] font-mono tracking-widest uppercase">Awaiting Data</span>
                </div>
              ) : (
                <button className="w-14 h-14 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-all duration-500 hover:bg-purple-500/20 hover:border-purple-500 hover:text-purple-300 relative z-10 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] backdrop-blur-md">
                  <PlayCircle className="w-6 h-6 text-slate-500 group-hover:text-purple-300 transition-colors" />
                </button>
              )}
            </div>

            {/* Bottom Content Info */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-black tracking-tighter text-slate-200 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 transition-all duration-300">
                    {sign.word}
                  </h3>
                  {!sign.comingSoon && (
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                      sign.difficulty === "System" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                      sign.difficulty === "Easy" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]" : 
                      "bg-white/[0.05] text-slate-400 border border-white/5"
                    }`}>
                      {sign.difficulty}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  {sign.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {filteredSigns.length === 0 && (
        <div className="w-full h-40 flex flex-col items-center justify-center border border-white/5 rounded-[2rem] bg-slate-950/30 backdrop-blur-md mt-4">
          <p className="text-slate-500 font-mono text-sm tracking-widest uppercase">No tokens found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}