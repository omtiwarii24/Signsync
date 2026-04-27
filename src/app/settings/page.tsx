"use client";

import { useState, useEffect } from "react";
import { Sliders, Volume2, Monitor, Save, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  // State for our settings
  const [confidence, setConfidence] = useState(85);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // 1. Load available voices from the browser
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Try to set a default voice if none is selected
      if (availableVoices.length > 0 && !selectedVoiceURI) {
        // Prefer a Google/Microsoft English voice if available
        const defaultVoice = availableVoices.find(v => v.name.includes("Google") || v.name.includes("Microsoft")) || availableVoices[0];
        setSelectedVoiceURI(defaultVoice.voiceURI);
      }
    };

    loadVoices();
    // Chrome loads voices asynchronously, so we must listen for the change
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // 2. Load settings from LocalStorage on mount
  useEffect(() => {
    const savedConfidence = localStorage.getItem("signsync_confidence");
    const savedVoice = localStorage.getItem("signsync_voice");
    
    if (savedConfidence) setConfidence(parseInt(savedConfidence));
    if (savedVoice) setSelectedVoiceURI(savedVoice);
  }, []);

  // 3. Save to LocalStorage
  const handleSave = () => {
    localStorage.setItem("signsync_confidence", confidence.toString());
    localStorage.setItem("signsync_voice", selectedVoiceURI);
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const testVoice = () => {
    const utterance = new SpeechSynthesisUtterance("Testing voice settings. Hello world.");
    const activeVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (activeVoice) utterance.voice = activeVoice;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pb-12 animate-fade-in-up font-sans relative z-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mt-4">
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-1">
               <Sliders className="w-6 h-6 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] rounded-full" />
               <span className="text-[10px] font-mono tracking-[0.2em] text-cyan-400 uppercase">System Configurations</span>
            </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500 drop-shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            Preferences
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Customize your neural engine parameters.
          </p>
        </div>
        
        <button 
          onClick={handleSave}
          className={`group relative px-6 py-3.5 rounded-[1rem] font-bold text-xs tracking-widest uppercase transition-all duration-500 overflow-hidden flex items-center gap-3 backdrop-blur-md ${
            isSaved 
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.5)]" 
              : "bg-white/[0.02] border border-white/10 text-white hover:border-cyan-400/50 hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.4)]"
          }`}
        >
          {!isSaved && <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
          {isSaved ? <CheckCircle2 className="w-4 h-4 text-purple-400 relative z-10" /> : <Save className="w-4 h-4 text-cyan-400 relative z-10" />}
          <span className="relative z-10">{isSaved ? "Saved!" : "Save Changes"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* SETTING 1: AI CONFIDENCE */}
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500/30 group-hover:bg-cyan-400 transition-colors shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
          
          <div className="flex items-center gap-5 mb-8">
            <div className="p-3 bg-white/[0.02] rounded-[1rem] border border-white/5 group-hover:border-white/10 transition-colors shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]">
              <Sliders className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tighter">AI Strictness Threshold</h2>
              <p className="text-slate-400 text-xs mt-1 font-medium">How confident must the AI be before it translates a sign?</p>
            </div>
          </div>

          <div className="pl-16 pr-4">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-4 tracking-widest uppercase">
              <span>Relaxed (50%)</span>
              <span className="text-cyan-400 text-lg drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] font-black">{confidence}%</span>
              <span>Strict (100%)</span>
            </div>
            <div className="relative">
              <input 
                type="range" 
                min="50" 
                max="100" 
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-950/80 border border-white/5 rounded-full appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all focus:outline-none"
              />
            </div>
            <p className="text-slate-500 text-[10px] mt-4 font-mono tracking-wide uppercase">
              * Higher strictness prevents accidental mistranslations but requires precise gesture execution.
            </p>
          </div>
        </div>

        {/* SETTING 2: VOICE SETTINGS */}
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500/30 group-hover:bg-purple-400 transition-colors shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
          
          <div className="flex items-center gap-5 mb-8">
            <div className="p-3 bg-white/[0.02] rounded-[1rem] border border-white/5 group-hover:border-white/10 transition-colors shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]">
              <Volume2 className="w-6 h-6 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tighter">Spoken Voice Output</h2>
              <p className="text-slate-400 text-xs mt-1 font-medium">Select the text-to-speech engine for live translations.</p>
            </div>
          </div>

          <div className="pl-16 pr-4 flex flex-col sm:flex-row gap-5 items-center">
            <div className="flex-1 w-full relative">
              <select 
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                className="w-full bg-slate-950/50 border border-white/5 text-slate-300 text-sm rounded-[1.5rem] focus:outline-none focus:border-purple-500/50 block p-4 appearance-none cursor-pointer hover:border-white/10 transition-colors shadow-inner font-mono"
              >
                {voices.length === 0 && <option>Loading voice banks...</option>}
                {voices.map((voice, index) => (
                  <option key={index} value={voice.voiceURI} className="bg-slate-900 text-white font-sans">
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            
            <button 
              onClick={testVoice}
              disabled={voices.length === 0}
              className="w-full sm:w-auto px-6 py-4 bg-white/[0.02] border border-white/5 hover:border-purple-500/30 hover:bg-purple-600/10 text-white hover:text-purple-300 rounded-[1.5rem] font-bold text-xs tracking-widest uppercase transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] backdrop-blur-md"
            >
              Initialize Audio
            </button>
          </div>
        </div>

        {/* SETTING 3: APPEARANCE (Placeholder) */}
        <div className="bg-white/[0.01] backdrop-blur-sm border border-white/5 rounded-[2rem] p-8 shadow-lg relative overflow-hidden group opacity-60 grayscale hover:grayscale-[50%] transition-all duration-500">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-700 transition-colors"></div>
          
          <div className="flex items-center gap-5">
            <div className="p-3 bg-white/[0.02] rounded-[1rem] border border-white/5 shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]">
              <Monitor className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-white tracking-tighter">Appearance</h2>
                <span className="text-[9px] bg-white/[0.05] border border-white/10 px-3 py-1.5 rounded-full text-slate-400 uppercase tracking-widest font-bold">In Development</span>
              </div>
              <p className="text-slate-500 text-xs mt-1 font-medium">Cosmic dark mode is optimal for visual processing. Light mode pending.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}